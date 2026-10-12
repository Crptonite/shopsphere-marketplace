import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { pool, hasDb } from '@/lib/db';
import { listingsBySeller } from '@/lib/products';
import { cashBalance, sellerBalance, spendingSummary } from '@/lib/finance';
import { money, money2 } from '@/lib/format';
import AccountShell from '@/components/AccountShell';

export const metadata = { title: 'My account — ShopSphere' };

type Mini = { id: string; title: string; price: number; image: string };

export default async function AccountPage() {
  const user = await requireUser('/account');
  if (!hasDb()) return <AccountShell active="/account"><div className="alert alert-warn">Database not configured.</div></AccountShell>;

  const [listings, seller, cash, spend, likes, counts] = await Promise.all([
    listingsBySeller(user.id),
    sellerBalance(user.id),
    cashBalance(user.id),
    spendingSummary(user.id),
    pool.query<Mini>(`SELECT p.id, p.title, p.price_sgd::float8 AS price,
        COALESCE((SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY sort_order LIMIT 1), p.image_url) AS image
      FROM likes l JOIN products p ON p.id = l.product_id WHERE l.user_id = $1 ORDER BY l.created_at DESC LIMIT 4`, [user.id]).then((r) => r.rows),
    pool.query<{ sales: number; purchases: number }>(`SELECT
        (SELECT COUNT(DISTINCT oi.order_id)::int FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.seller_id = $1 AND o.status NOT IN ('pending','cancelled')) AS sales,
        (SELECT COUNT(*)::int FROM orders WHERE buyer_id = $1 AND status NOT IN ('pending','cancelled')) AS purchases`, [user.id]).then((r) => r.rows[0]),
  ]);
  const active = listings.filter((l) => l.status === 'active');
  const mini = (items: Mini[]) => <div className="mini-grid">{items.map((i) => <Link key={i.id} href={`/products/${i.id}`}>{i.image ? <img src={i.image} alt="" /> : <span className="panel-dot" />}<span>{i.title}</span><strong>{money(i.price)}</strong></Link>)}</div>;

  return <AccountShell active="/account">
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: 64, height: 64, borderRadius: '50%' }} /> : <span className="avatar" style={{ width: 64, height: 64, fontSize: 24 }}>{user.displayName[0]?.toUpperCase()}</span>}
      <div style={{ flex: 1 }}><h2 style={{ margin: 0 }}>{user.displayName}</h2><p className="hint" style={{ margin: '4px 0 0' }}>{user.email}</p></div>
      <Link className="btn btn-ghost" href="/sell">List an item</Link>
    </div>
    <div className="stat-grid" style={{ marginTop: 16 }}>
      <div className="stat accent"><small>Cash balance</small><strong>{money2(cash)}</strong><span><Link href="/finance">Finance dashboard →</Link></span></div>
      <div className="stat"><small>Seller earnings</small><strong>{money2(seller.available)}</strong><span>{money2(seller.pending)} pending</span></div>
      <div className="stat"><small>Spent this month</small><strong>{money2(spend.month)}</strong><span>{money2(spend.year)} this year</span></div>
      <div className="stat"><small>Activity</small><strong>{counts.sales} / {counts.purchases}</strong><span>sales / purchases</span></div>
    </div>
    <div className="card"><Link className="section-link" href="/sell/listings"><h2 style={{ margin: 0 }}>My listings</h2><span className="hint">{active.length} active <ChevronRight size={14} /></span></Link>
      {active.length ? <div style={{ marginTop: 12 }}>{mini(active.slice(0, 4).map((l) => ({ id: l.id, title: l.title, price: l.price, image: l.images[0] || l.image })))}</div> : <p className="hint">No active listings.</p>}
    </div>
    <div className="card"><Link className="section-link" href="/orders?view=sales"><h2 style={{ margin: 0 }}>My sales</h2><ChevronRight size={16} /></Link></div>
    <div className="card"><Link className="section-link" href="/orders"><h2 style={{ margin: 0 }}>My purchases</h2><ChevronRight size={16} /></Link></div>
    <div className="card"><Link className="section-link" href="/likes"><h2 style={{ margin: 0 }}>My likes</h2><ChevronRight size={16} /></Link>
      {likes.length ? <div style={{ marginTop: 12 }}>{mini(likes)}</div> : <p className="hint">Nothing liked yet.</p>}
    </div>
  </AccountShell>;
}
