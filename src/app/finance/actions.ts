'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { pool, tx } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { postLedger } from '@/lib/ledger';
import { sellerBalance } from '@/lib/finance';
import { stripe, toCents } from '@/lib/stripe';
import { env } from '@/lib/env';
import { notify } from '@/lib/notify';
import { money2 } from '@/lib/format';

export type ActionState = { error?: string; ok?: string } | undefined;

const cashSchema = z.object({
  direction: z.enum(['deposit', 'withdrawal']),
  amount: z.coerce.number().positive().max(100_000_000),
  note: z.string().trim().max(120).optional(),
});

/** Manual cash adjustments, e.g. setting an opening balance or recording cash taken out. */
export async function adjustCash(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser('/finance');
  const parsed = cashSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Enter a positive amount.' };
  const { direction, amount, note } = parsed.data;
  await tx((client) => postLedger(client, {
    userId: user.id, kind: direction, amount: direction === 'deposit' ? amount : -amount,
    description: note || (direction === 'deposit' ? 'Cash added' : 'Cash withdrawn'),
  }));
  revalidatePath('/finance');
  return { ok: `${direction === 'deposit' ? 'Added' : 'Withdrew'} ${money2(amount)}.` };
}

const holdingSchema = z.object({
  symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9.\-]{1,15}$/, 'Invalid ticker'),
  quantity: z.coerce.number().positive().max(1e9),
  avgCost: z.coerce.number().min(0).max(1e7),
  currency: z.enum(['USD', 'SGD']).default('USD'),
});

export async function addHolding(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser('/finance');
  const parsed = holdingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid holding.' };
  const h = parsed.data;
  const currency = h.symbol.endsWith('.SI') ? 'SGD' : h.currency;
  // Adding to an existing position recalculates the weighted average cost.
  await pool.query(
    `INSERT INTO holdings (user_id, symbol, quantity, avg_cost, currency) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id, symbol) DO UPDATE SET
       avg_cost = (holdings.avg_cost * holdings.quantity + EXCLUDED.avg_cost * EXCLUDED.quantity) / (holdings.quantity + EXCLUDED.quantity),
       quantity = holdings.quantity + EXCLUDED.quantity`,
    [user.id, h.symbol, h.quantity, h.avgCost, currency]);
  revalidatePath('/finance');
  return { ok: `Saved ${h.symbol}.` };
}

export async function removeHolding(form: FormData) {
  const user = await requireUser('/finance');
  await pool.query('DELETE FROM holdings WHERE id = $1 AND user_id = $2', [Number(form.get('id')), user.id]);
  revalidatePath('/finance');
}

const propertySchema = z.object({
  name: z.string().trim().min(2).max(120),
  purchasePrice: z.coerce.number().min(0).max(1e10),
  estValue: z.coerce.number().min(0).max(1e10),
  loan: z.coerce.number().min(0).max(1e10).default(0),
  valuationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
});

export async function addProperty(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser('/finance');
  const parsed = propertySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Check the property details.' };
  const p = parsed.data;
  await pool.query(
    `INSERT INTO property_assets (user_id, name, purchase_price_sgd, est_value_sgd, outstanding_loan_sgd, valuation_date)
     VALUES ($1,$2,$3,$4,$5,COALESCE(NULLIF($6,'')::date, current_date))`,
    [user.id, p.name, p.purchasePrice, p.estValue, p.loan, p.valuationDate ?? '']);
  revalidatePath('/finance');
  return { ok: `Saved ${p.name}.` };
}

export async function removeProperty(form: FormData) {
  const user = await requireUser('/finance');
  await pool.query('DELETE FROM property_assets WHERE id = $1 AND user_id = $2', [Number(form.get('id')), user.id]);
  revalidatePath('/finance');
}

/** Starts or resumes Stripe Connect Express onboarding (test mode). */
export async function startOnboarding() {
  const user = await requireUser('/sell/payouts');
  if (!stripe) redirect('/sell/payouts?error=stripe');
  const { rows } = await pool.query<{ stripe_account_id: string }>('SELECT stripe_account_id FROM seller_accounts WHERE user_id = $1', [user.id]);
  let accountId = rows[0]?.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express', country: 'SG', email: user.email,
      capabilities: { transfers: { requested: true } }, metadata: { user_id: user.id },
    });
    accountId = account.id;
    await pool.query('INSERT INTO seller_accounts (user_id, stripe_account_id) VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING', [user.id, accountId]);
  }
  const link = await stripe.accountLinks.create({
    account: accountId, type: 'account_onboarding',
    refresh_url: `${env.APP_URL}/sell/payouts`, return_url: `${env.APP_URL}/sell/payouts?returned=1`,
  });
  redirect(link.url);
}

/** Transfers the seller's available earnings to their connected account. */
export async function requestPayout(): Promise<ActionState> {
  const user = await requireUser('/finance');
  if (!stripe) return { error: 'Stripe is not configured.' };
  const { rows } = await pool.query<{ stripe_account_id: string; payouts_enabled: boolean }>(
    'SELECT stripe_account_id, payouts_enabled FROM seller_accounts WHERE user_id = $1', [user.id]);
  const account = rows[0];
  if (!account?.payouts_enabled) return { error: 'Finish payout onboarding first (Sell → Payouts).' };

  const payoutId = crypto.randomUUID();
  let amount = 0;
  try {
    // Lock the wallet row so two concurrent requests cannot pay out the same earnings.
    amount = await tx(async (client) => {
      await client.query('INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
      await client.query('SELECT 1 FROM wallets WHERE user_id = $1 FOR UPDATE', [user.id]);
      const { available } = await sellerBalance(user.id);
      if (available < 1) return 0;
      await client.query(`INSERT INTO payouts (id, user_id, amount_sgd, status) VALUES ($1,$2,$3,'pending')`, [payoutId, user.id, available]);
      return available;
    });
    if (!amount) return { error: 'No earnings are available for payout yet (sales are held for 7 days).' };
    const transfer = await stripe.transfers.create(
      { amount: toCents(amount), currency: 'sgd', destination: account.stripe_account_id, metadata: { payout_id: payoutId, user_id: user.id } },
      { idempotencyKey: `payout-${payoutId}` });
    await pool.query(`UPDATE payouts SET status = 'paid', stripe_transfer_id = $2 WHERE id = $1`, [payoutId, transfer.id]);
    await notify({ userId: user.id, type: 'payout', title: `Payout sent: ${money2(amount)}`, link: '/finance' });
    revalidatePath('/finance');
    return { ok: `Payout of ${money2(amount)} sent to your connected account.` };
  } catch (error) {
    if (amount) await pool.query(`UPDATE payouts SET status = 'failed' WHERE id = $1`, [payoutId]);
    console.error('Payout failed', error);
    return { error: 'Stripe could not complete the transfer. In test mode the platform needs available balance (use test card 4000 0000 0000 0077).' };
  }
}
