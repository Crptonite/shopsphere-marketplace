import Link from 'next/link';
import { Check, Clock, XCircle } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { pool, hasDb } from '@/lib/db';
import { dateTime, money2 } from '@/lib/format';
import PaymentPoller from './PaymentPoller';

export const metadata = { title: 'Payment — ShopSphere' };
export const dynamic = 'force-dynamic';

/**
 * Shows the verified amount from our database. The tick appears only once the
 * Stripe webhook has marked the order paid — never just because Stripe redirected here.
 */
export default async function PaymentCompletedPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const user = await requireUser(`/payment/completed?session_id=${session_id ?? ''}`);
  if (!session_id || !hasDb()) return <main className="page page-narrow"><div className="alert alert-error">Missing payment reference.</div></main>;

  const { rows } = await pool.query<{ id: string; status: string; total: number; paid_at: string | null; refunded: number }>(
    `SELECT id, status, total_sgd::float8 AS total, paid_at, refunded_sgd::float8 AS refunded FROM orders WHERE stripe_session_id = $1 AND buyer_id = $2`,
    [session_id, user.id]);
  const order = rows[0];
  if (!order) return <main className="page page-narrow"><div className="alert alert-error">We could not find this payment on your account.</div></main>;

  const paid = ['paid', 'processing', 'shipped', 'completed', 'refunded'].includes(order.status);
  const cancelled = order.status === 'cancelled';
  return <main className="page page-narrow" style={{ textAlign: 'center' }}>
    <div className="card" style={{ padding: '40px 24px' }}>
      {paid ? <>
        <div className="tick"><Check size={40} strokeWidth={3} /></div>
        <div className="eyebrow">PAYMENT VERIFIED</div>
        <h1 style={{ font: "700 28px 'Manrope'", margin: '8px 0' }}>{money2(order.total)} paid</h1>
        <p className="hint">Order {order.id.slice(0, 8)} · confirmed {order.paid_at ? dateTime(order.paid_at) : ''}</p>
        {order.refunded > 0 && <p className="hint">{money2(order.refunded)} has since been refunded.</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 18 }}><Link className="btn" href="/orders">View orders</Link><Link className="btn btn-ghost" href="/spending">See spending</Link></div>
      </> : cancelled ? <>
        <div className="tick" style={{ background: 'var(--danger)' }}><XCircle size={40} /></div>
        <h1 style={{ font: "700 24px 'Manrope'" }}>Order could not be completed</h1>
        <p className="hint">If you were charged, a full refund has been issued automatically.</p>
        <Link className="btn" href="/cart">Back to cart</Link>
      </> : <>
        <div className="tick" style={{ background: '#c9d3c2' }}><Clock size={36} /></div>
        <h1 style={{ font: "700 24px 'Manrope'" }}>Confirming your payment…</h1>
        <p className="hint">Waiting for Stripe to verify {money2(order.total)}. This usually takes a few seconds.</p>
        <PaymentPoller />
      </>}
    </div>
  </main>;
}
