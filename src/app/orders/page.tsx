import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { pool, hasDb } from '@/lib/db';
import { dateTime, money2 } from '@/lib/format';
import AccountShell from '@/components/AccountShell';
import { updateOrderStatus } from './actions';

export const metadata = { title: 'Orders — ShopSphere' };

type OrderRow = { id: string; status: string; total: number; refunded: number; createdAt: string; paidAt: string | null; items: Array<{ title: string; qty: number; price: number; productId: string }>; counterpart: string | null; soleSeller: boolean };

const STAGES = [
  { id: 'to-pay', label: 'To pay', match: (o: OrderRow) => o.status === 'pending' },
  { id: 'in-progress', label: 'In progress', match: (o: OrderRow) => ['paid', 'processing', 'shipped'].includes(o.status) && o.refunded === 0 },
  { id: 'completed', label: 'Completed', match: (o: OrderRow) => o.status === 'completed' && o.refunded === 0 },
  { id: 'returns', label: 'Returns', match: (o: OrderRow) => o.status === 'refunded' || o.refunded > 0 },
  { id: 'cancelled', label: 'Cancelled', match: (o: OrderRow) => o.status === 'cancelled' },
] as const;

const STATUS_PILL: Record<string, string> = { paid: 'pill-green', shipped: 'pill-green', completed: 'pill-green', pending: 'pill-warn', processing: 'pill-warn', cancelled: 'pill-red', refunded: 'pill-red' };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ view?: string; stage?: string }> }) {
  const user = await requireUser('/orders');
  const sp = await searchParams;
  const view = sp.view === 'sales' ? 'sales' : 'purchases';
  if (!hasDb()) return <main className="page"><div className="alert alert-warn">Database not configured.</div></main>;

  const { rows } = view === 'purchases'
    ? await pool.query<OrderRow>(
      `SELECT o.id, o.status, o.total_sgd::float8 AS total, o.refunded_sgd::float8 AS refunded, o.created_at AS "createdAt", o.paid_at AS "paidAt",
              json_agg(json_build_object('title', oi.title_snapshot, 'qty', oi.quantity, 'price', oi.unit_price_sgd::float8, 'productId', oi.product_id)) AS items,
              string_agg(DISTINCT u.display_name, ', ') AS counterpart, false AS "soleSeller"
       FROM orders o JOIN order_items oi ON oi.order_id = o.id LEFT JOIN users u ON u.id = oi.seller_id
       WHERE o.buyer_id = $1 AND (o.status <> 'pending' OR o.created_at > now() - interval '1 day')
       GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100`, [user.id])
    : await pool.query<OrderRow>(
      `SELECT o.id, o.status, SUM(oi.unit_price_sgd * oi.quantity)::float8 AS total, o.refunded_sgd::float8 AS refunded, o.created_at AS "createdAt", o.paid_at AS "paidAt",
              json_agg(json_build_object('title', oi.title_snapshot, 'qty', oi.quantity, 'price', oi.unit_price_sgd::float8, 'productId', oi.product_id)) AS items,
              MAX(b.display_name) AS counterpart,
              NOT EXISTS (SELECT 1 FROM order_items x WHERE x.order_id = o.id AND x.seller_id IS DISTINCT FROM $1) AS "soleSeller"
       FROM orders o JOIN order_items oi ON oi.order_id = o.id AND oi.seller_id = $1 JOIN users b ON b.id = o.buyer_id
       WHERE o.status <> 'pending'
       GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100`, [user.id]);

  const stage = STAGES.find((s) => s.id === sp.stage) ?? STAGES[1];
  const shown = rows.filter(stage.match);
  const base = view === 'sales' ? '/orders?view=sales&' : '/orders?';

  return <AccountShell active={view === 'sales' ? '/orders?view=sales' : '/orders'}>
    <div className="page-head"><div><div className="eyebrow">ORDER HISTORY</div><h1>{view === 'purchases' ? 'Your purchases' : 'Your sales'}</h1></div></div>
    <nav className="tabs">{STAGES.filter((s) => view === 'purchases' || s.id !== 'to-pay').map((s) => <Link key={s.id} href={`${base}stage=${s.id}`} aria-current={s.id === stage.id ? 'page' : undefined}>{s.label} ({rows.filter(s.match).length})</Link>)}</nav>
    {shown.length === 0 ? <div className="empty"><h3>No {stage.label.toLowerCase()} {view === 'purchases' ? 'orders' : 'sales'}</h3><p>{view === 'purchases' ? 'Orders appear here once you check out; they move to In progress after Stripe confirms payment.' : 'Paid orders for your listings appear here.'}</p></div>
      : <div className="card table-wrap"><table className="table">
        <thead><tr><th>Order</th><th>Items</th><th>{view === 'purchases' ? 'Seller' : 'Buyer'}</th><th>Status</th><th className="num">Total</th><th /></tr></thead>
        <tbody>{shown.map((o) => <tr key={o.id}>
          <td><strong>{o.id.slice(0, 8)}</strong><br /><span className="hint">{dateTime(o.paidAt ?? o.createdAt)}</span></td>
          <td>{o.items.map((i) => <div key={i.productId}><Link href={`/products/${i.productId}`}>{i.title}</Link> × {i.qty}</div>)}</td>
          <td>{o.counterpart ?? '—'}</td>
          <td><span className={`pill ${STATUS_PILL[o.status] ?? ''}`}>{o.status}</span>{o.refunded > 0 && o.status !== 'refunded' && <div className="hint">{money2(o.refunded)} refunded</div>}</td>
          <td className="num">{money2(o.total)}</td>
          <td className="num">
            {view === 'sales' && o.status === 'paid' && o.soleSeller && <form action={updateOrderStatus}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value="shipped" /><button className="btn btn-ghost btn-sm">Mark shipped</button></form>}
            {view === 'purchases' && (o.status === 'paid' || o.status === 'shipped') && <form action={updateOrderStatus}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value="completed" /><button className="btn btn-ghost btn-sm">Mark received</button></form>}
          </td>
        </tr>)}</tbody>
      </table></div>}
  </AccountShell>;
}
