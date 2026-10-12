import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { pool, hasDb } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { sellerBalance } from '@/lib/finance';
import { money2 } from '@/lib/format';
import { startOnboarding } from '@/app/finance/actions';

export const metadata = { title: 'Payouts — ShopSphere' };

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ returned?: string; error?: string }> }) {
  const user = await requireUser('/sell/payouts');
  const { returned, error } = await searchParams;
  if (!hasDb()) return <main className="page page-narrow"><div className="alert alert-warn">Database not configured.</div></main>;

  const { rows } = await pool.query<{ stripe_account_id: string; charges_enabled: boolean; payouts_enabled: boolean }>(
    'SELECT stripe_account_id, charges_enabled, payouts_enabled FROM seller_accounts WHERE user_id = $1', [user.id]);
  let account = rows[0];
  // Returning from onboarding: refresh status directly rather than waiting for the account.updated webhook.
  if (account && stripe && (returned || !account.payouts_enabled)) {
    try {
      const a = await stripe.accounts.retrieve(account.stripe_account_id);
      await pool.query('UPDATE seller_accounts SET charges_enabled = $2, payouts_enabled = $3, updated_at = now() WHERE user_id = $1', [user.id, a.charges_enabled, a.payouts_enabled]);
      account = { ...account, charges_enabled: a.charges_enabled, payouts_enabled: a.payouts_enabled };
    } catch (e) {
      console.warn('Could not refresh Connect account', e);
    }
  }
  const balance = await sellerBalance(user.id);

  return <main className="page page-narrow">
    <div className="page-head"><div><div className="eyebrow">SELLER PAYOUTS</div><h1>Get paid for your sales</h1><p>Payouts use Stripe Connect Express in test mode.</p></div></div>
    {(error === 'stripe' || !stripe) && <div className="alert alert-warn">Stripe is not configured. Add a test-mode STRIPE_SECRET_KEY.</div>}
    <div className="stat-grid stat-grid-3">
      <div className="stat accent"><small>Available</small><strong>{money2(balance.available)}</strong><span>Ready to pay out</span></div>
      <div className="stat"><small>Pending</small><strong>{money2(balance.pending)}</strong><span>Held 7 days after sale</span></div>
      <div className="stat"><small>Paid out</small><strong>{money2(balance.paidOut)}</strong><span>Lifetime</span></div>
    </div>
    <div className="card">
      <h2>Payout account</h2>
      {account ? <p>Status: {account.payouts_enabled ? <span className="pill pill-green">Payouts enabled</span> : <span className="pill pill-warn">Onboarding incomplete</span>}</p>
        : <p className="hint">Connect a Stripe Express account to receive your earnings. Eligibility for Singapore accounts is decided by Stripe.</p>}
      {!account?.payouts_enabled && stripe && <form action={startOnboarding}><button className="btn" type="submit">{account ? 'Continue onboarding' : 'Set up payouts'}</button></form>}
      {account?.payouts_enabled && <p className="hint">Request payouts from your <Link href="/finance">Finance dashboard</Link>.</p>}
    </div>
  </main>;
}
