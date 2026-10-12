import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import type { PoolClient } from 'pg';
import { tx } from '@/lib/db';
import { env } from '@/lib/env';
import { stripe, fromCents, toCents } from '@/lib/stripe';
import { postLedger, SALE_HOLD_DAYS } from '@/lib/ledger';
import { notify, type NotifyInput } from '@/lib/notify';
import { invalidate } from '@/lib/redis';
import { money2 } from '@/lib/format';

export const runtime = 'nodejs';

/**
 * Verified Stripe webhook. Each event id is recorded inside the same transaction as its
 * effects, so a replayed or concurrent duplicate event is a no-op.
 */
export async function POST(request: NextRequest) {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  const after: Array<() => Promise<unknown>> = [];
  try {
    await tx(async (client) => {
      const fresh = await client.query('INSERT INTO webhook_events (id, type) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING id', [event.id, event.type]);
      if (!fresh.rowCount) return;
      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
          await fulfil(client, event.data.object, after);
          break;
        case 'checkout.session.expired':
          await client.query(`UPDATE orders SET status = 'cancelled' WHERE stripe_session_id = $1 AND status = 'pending'`, [event.data.object.id]);
          break;
        case 'charge.refunded':
          await refund(client, event.data.object, after);
          break;
        case 'account.updated': {
          const a = event.data.object;
          await client.query('UPDATE seller_accounts SET charges_enabled = $2, payouts_enabled = $3, updated_at = now() WHERE stripe_account_id = $1',
            [a.id, a.charges_enabled, a.payouts_enabled]);
          break;
        }
      }
    });
  } catch (error) {
    console.error(`Webhook ${event.type} failed:`, error);
    // Non-2xx makes Stripe retry; the event id was rolled back with the transaction.
    return NextResponse.json({ error: 'Processing failed.' }, { status: 500 });
  }
  for (const job of after) await job().catch((e) => console.error('Post-webhook task failed', e));
  return NextResponse.json({ received: true });
}

type OrderRow = { id: string; buyer_id: string; status: string; total_sgd: string };
type ItemRow = { product_id: string; seller_id: string | null; title_snapshot: string; unit_price_sgd: string; quantity: number; stock_qty: number; category: string };

async function fulfil(client: PoolClient, session: Stripe.Checkout.Session, after: Array<() => Promise<unknown>>) {
  if (session.payment_status !== 'paid') return; // async methods complete later
  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  if (!orderId) return;
  const { rows } = await client.query<OrderRow>('SELECT id, buyer_id, status, total_sgd FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
  const order = rows[0];
  if (!order || order.status !== 'pending') return;

  const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;
  const total = Number(order.total_sgd);
  if (session.currency !== 'sgd' || session.amount_total !== toCents(total)) {
    console.error(`Order ${orderId}: Stripe amount ${session.amount_total} ${session.currency} does not match ${total} SGD`);
    await client.query(`UPDATE orders SET status = 'cancelled', payment_reference = $2 WHERE id = $1`, [orderId, paymentIntent]);
    if (paymentIntent) after.push(() => stripe!.refunds.create({ payment_intent: paymentIntent }, { idempotencyKey: `mismatch-${orderId}` }));
    return;
  }

  const { rows: items } = await client.query<ItemRow>(
    `SELECT oi.product_id, oi.seller_id, oi.title_snapshot, oi.unit_price_sgd, oi.quantity, p.stock_qty, p.category
     FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1 ORDER BY p.id FOR UPDATE OF p`,
    [orderId],
  );
  // Someone else bought the last unit between checkout and payment: cancel and refund in full.
  if (items.some((i) => i.stock_qty < i.quantity)) {
    await client.query(`UPDATE orders SET status = 'cancelled', payment_reference = $2 WHERE id = $1`, [orderId, paymentIntent]);
    if (paymentIntent) after.push(() => stripe!.refunds.create({ payment_intent: paymentIntent }, { idempotencyKey: `oversold-${orderId}` }));
    after.push(() => notify({ userId: order.buyer_id, type: 'refund', title: 'An item sold out — you have been refunded', body: `Order ${orderId.slice(0, 8)} could not be fulfilled. A full refund of ${money2(total)} has been issued.`, link: '/orders' }));
    return;
  }

  for (const i of items) {
    await client.query(
      `UPDATE products SET stock_qty = stock_qty - $2, status = CASE WHEN stock_qty - $2 <= 0 THEN 'sold' ELSE status END WHERE id = $1`,
      [i.product_id, i.quantity],
    );
  }
  await client.query(`UPDATE orders SET status = 'paid', paid_at = now(), payment_reference = $2 WHERE id = $1`, [orderId, paymentIntent]);
  await client.query(
    `INSERT INTO payments (order_id, stripe_session_id, payment_intent, amount_sgd, status) VALUES ($1,$2,$3,$4,'succeeded') ON CONFLICT (stripe_session_id) DO NOTHING`,
    [orderId, session.id, paymentIntent, total],
  );

  const short = orderId.slice(0, 8);
  await postLedger(client, {
    userId: order.buyer_id, kind: 'purchase', amount: -total, description: `Order ${short}: ${items.map((i) => i.title_snapshot).join(', ').slice(0, 200)}`,
    category: items[0]?.category ?? 'Marketplace', refType: 'order', refId: orderId,
  });

  const bySeller = new Map<string, number>();
  for (const i of items) if (i.seller_id) bySeller.set(i.seller_id, (bySeller.get(i.seller_id) ?? 0) + Number(i.unit_price_sgd) * i.quantity);
  const availableAt = new Date(Date.now() + SALE_HOLD_DAYS * 86_400_000);
  const notes: NotifyInput[] = [{ userId: order.buyer_id, type: 'payment', title: `Payment received: ${money2(total)}`, body: `Your order ${short} is confirmed.`, link: `/orders` }];
  for (const [sellerId, amount] of bySeller) {
    const exists = await client.query('SELECT 1 FROM users WHERE id = $1', [sellerId]);
    if (!exists.rowCount) continue; // sample listings have no real seller account
    await postLedger(client, { userId: sellerId, kind: 'sale', amount: Math.round(amount * 100) / 100, description: `Sale in order ${short}`, refType: 'order', refId: orderId, availableAt });
    notes.push({ userId: sellerId, type: 'sale', title: `You made a sale: ${money2(amount)}`, body: `Order ${short} has been paid. Arrange delivery with the buyer in Chats.`, link: '/orders?view=sales' });
  }

  await client.query(
    `DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1) AND product_id = ANY($2)`,
    [order.buyer_id, items.map((i) => i.product_id)],
  );
  after.push(() => invalidate('search:'));
  for (const n of notes) after.push(() => notify(n));
}

async function refund(client: PoolClient, charge: Stripe.Charge, after: Array<() => Promise<unknown>>) {
  const paymentIntent = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntent) return;
  const { rows } = await client.query<OrderRow & { refunded_sgd: string }>(
    'SELECT id, buyer_id, status, total_sgd, refunded_sgd FROM orders WHERE payment_reference = $1 FOR UPDATE', [paymentIntent]);
  const order = rows[0];
  if (!order) return;
  const total = Number(order.total_sgd);
  const refundedTotal = Math.min(fromCents(charge.amount_refunded), total);
  const delta = Math.round((refundedTotal - Number(order.refunded_sgd)) * 100) / 100;
  if (delta <= 0) return;

  const fullyRefunded = refundedTotal >= total;
  // Cancelled orders (oversold / amount mismatch) never posted ledger entries, so only record the status.
  const wasPaid = order.status !== 'cancelled' && order.status !== 'pending';
  await client.query(`UPDATE orders SET refunded_sgd = $2, status = CASE WHEN $3 AND status <> 'cancelled' THEN 'refunded' ELSE status END WHERE id = $1`,
    [order.id, refundedTotal, fullyRefunded]);
  await client.query(`UPDATE payments SET status = $2 WHERE payment_intent = $1`, [paymentIntent, fullyRefunded ? 'refunded' : 'partially_refunded']);
  if (!wasPaid) return;

  const ref = `${order.id}:${charge.amount_refunded}`;
  await postLedger(client, { userId: order.buyer_id, kind: 'refund', amount: delta, description: `Refund for order ${order.id.slice(0, 8)}`, refType: 'refund', refId: ref });

  // Reverse seller earnings in proportion to each seller's share of the order.
  const { rows: shares } = await client.query<{ seller_id: string; amount: string }>(
    `SELECT oi.seller_id, SUM(oi.unit_price_sgd * oi.quantity) AS amount FROM order_items oi JOIN users u ON u.id = oi.seller_id
     WHERE oi.order_id = $1 GROUP BY oi.seller_id`, [order.id]);
  for (const s of shares) {
    const reversal = Math.round(delta * (Number(s.amount) / total) * 100) / 100;
    if (reversal <= 0) continue;
    await postLedger(client, { userId: s.seller_id, kind: 'sale_reversal', amount: -reversal, description: `Refund issued on order ${order.id.slice(0, 8)}`, refType: 'refund', refId: ref });
    after.push(() => notify({ userId: s.seller_id, type: 'refund', title: `Refund issued: ${money2(reversal)}`, body: `A refund was issued on order ${order.id.slice(0, 8)}.`, link: '/finance' }));
  }
  after.push(() => notify({ userId: order.buyer_id, type: 'refund', title: `Refund of ${money2(delta)} processed`, body: `Order ${order.id.slice(0, 8)}`, link: '/orders' }));
}

