import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { hasDb } from '@/lib/db';
import { monthlySpending, spendingByCategory, spendingSummary } from '@/lib/finance';
import { money2 } from '@/lib/format';
import { SpendingChart } from '@/components/Charts';

export const metadata = { title: 'Spending — ShopSphere' };

export default async function SpendingPage() {
  const user = await requireUser('/spending');
  if (!hasDb()) return <main className="page"><div className="alert alert-warn">Database not configured.</div></main>;
  const [summary, monthly, categories] = await Promise.all([spendingSummary(user.id), monthlySpending(user.id), spendingByCategory(user.id)]);
  const totalCat = categories.reduce((s, c) => s + c.spent, 0);

  return <main className="page">
    <div className="page-head">
      <div><div className="eyebrow">SPENDING DASHBOARD</div><h1>What you&apos;ve spent</h1><p>Calculated only from Stripe-verified payments, with refunds deducted. Singapore time.</p></div>
      <Link className="btn btn-ghost" href="/finance">Open finance dashboard</Link>
    </div>
    <div className="stat-grid">
      <div className="stat accent"><small>This month</small><strong>{money2(summary.month)}</strong><span>Net of refunds</span></div>
      <div className="stat"><small>This year</small><strong>{money2(summary.year)}</strong><span>Net of refunds</span></div>
      <div className="stat"><small>Lifetime</small><strong>{money2(summary.lifetime)}</strong><span>{summary.orders} paid {summary.orders === 1 ? 'order' : 'orders'}</span></div>
      <div className="stat"><small>Refunded</small><strong>{money2(summary.refunds)}</strong><span>Lifetime</span></div>
    </div>
    <div className="grid-wide">
      <div className="card"><h2>Last 12 months</h2><SpendingChart data={monthly} /></div>
      <div className="card"><h2>By category</h2>
        {categories.length === 0 ? <p className="hint">No purchases yet.</p> : <table className="table"><tbody>
          {categories.map((c) => <tr key={c.category}><td>{c.category}<div style={{ height: 5, borderRadius: 3, background: 'var(--green)', width: `${Math.max(4, (c.spent / totalCat) * 100)}%`, marginTop: 5 }} /></td><td className="num">{money2(c.spent)}</td></tr>)}
        </tbody></table>}
      </div>
    </div>
  </main>;
}
