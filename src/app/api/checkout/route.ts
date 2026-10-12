import { NextResponse } from 'next/server';
import { tx } from '@/lib/db';
import { apiUser, jsonError, serverError } from '@/lib/api';
import { cartLines, resolveCartId } from '@/lib/cart';
import { env } from '@/lib/env';
import { isProperty } from '@/lib/format';
import { stripe, toCents } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * Creates a pending order from the cart and a Stripe Checkout Session (test mode).
 * The order only becomes "paid" when the verified webhook arrives.
 */
export async function POST() {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  if (!stripe) return jsonError('Payments are not configured (STRIPE_SECRET_KEY, test mode).', 503);
  const user = auth.user;

  try {
    const cartId = await resolveCartId(user, false);
    const lines = cartId ? await cartLines(cartId) : [];
    if (!lines.length) return jsonError('Your cart is empty.');
    for (const l of lines) {
      if (l.status !== 'active') return jsonError(`“${l.title}” is no longer available. Remove it to continue.`, 409);
      if (isProperty(l.listingType)) return jsonError(`“${l.title}” is a property listing and cannot be checked out.`, 409);
      if (l.stockQty < l.quantity) return jsonError(`Only ${l.stockQty} of “${l.title}” left. Update the quantity to continue.`, 409);
      if (l.sellerId === user.id) return jsonError('You cannot buy your own listing.', 409);
    }

    const subtotal = Math.round(lines.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100;
    const orderId = crypto.randomUUID();
    await tx(async (client) => {
      await client.query(
        `INSERT INTO orders (id, buyer_id, status, subtotal_sgd, shipping_sgd, total_sgd, payment_provider) VALUES ($1,$2,'pending',$3,0,$3,'stripe')`,
        [orderId, user.id, subtotal],
      );
      for (const l of lines) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, seller_id, title_snapshot, unit_price_sgd, quantity) VALUES ($1,$2,$3,$4,$5,$6)`,
          [orderId, l.productId, l.sellerId, l.title, l.price, l.quantity],
        );
      }
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: orderId,
      metadata: { order_id: orderId, buyer_id: user.id },
      payment_intent_data: { metadata: { order_id: orderId }, transfer_group: orderId },
      line_items: lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: 'sgd',
          unit_amount: toCents(l.price),
          product_data: { name: l.title.slice(0, 250), ...(l.image?.startsWith('https://') ? { images: [l.image] } : {}) },
        },
      })),
      success_url: `${env.APP_URL}/payment/completed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.APP_URL}/cart?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
    }, { idempotencyKey: `checkout-${orderId}` });

    await tx((client) => client.query('UPDATE orders SET stripe_session_id = $2 WHERE id = $1', [orderId, session.id]));
    return NextResponse.json({ url: session.url, orderId });
  } catch (error) {
    return serverError('Checkout failed', error);
  }
}
