import { coverImage } from '@/lib/files';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { pool, hasDb } from '@/lib/db';
import { listingsBySeller } from '@/lib/products';
import { cashBalance, sellerBalance, spendingSummary } from '@/lib/finance';
import { money, money2 } from '@/lib/format';
import AccountShell from '@/components/AccountShell';
import { env, features } from '@/lib/env';
import ProfileSettings from './ProfileSettings';
import TipBanner from './TipBanner';

export const metadata = { title: 'My account — ShopSphere' };

export default async function AccountPage() {
  const user = await requireUser('/account');
  if (!hasDb()) return <AccountShell active="/account"><div className="alert alert-warn">Database not configured.</div></AccountShell>;

  const [listings, seller, cash, spend, likedCount, counts, likeCounts, joined] = await Promise.all([
    listingsBySeller(user.id),
    sellerBalance(user.id),
    cashBalance(user.id),
    spendingSummary(user.id),
    pool.query<{ n: number }>('SELECT COUNT(*)::int AS n FROM likes WHERE user_id = $1', [user.id]).then((r) => r.rows[0].n),
    pool.query<{ sales: number; purchases: number }>(`SELECT
        (SELECT COUNT(DISTINCT oi.order_id)::int FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.seller_id = $1 AND o.status NOT IN ('pending','cancelled')) AS sales,
        (SELECT COUNT(*)::int FROM orders WHERE buyer_id = $1 AND status NOT IN ('pending','cancelled')) AS purchases`, [user.id]).then((r) => r.rows[0]),
    pool.query<{ product_id: string; n: number }>(
      'SELECT l.product_id, COUNT(*)::int AS n FROM likes l JOIN products p ON p.id = l.product_id WHERE p.seller_id = $1 GROUP BY l.product_id', [user.id]).then((r) => r.rows),
    pool.query<{ created_at: string }>('SELECT created_at FROM users WHERE id = $1', [user.id]).then((r) => r.rows[0]?.created_at),
  ]);
  const active = listings.filter((l) => l.status === 'active');
  const shown = active.slice(0, 4);
  const likes = new Map(likeCounts.map((r) => [r.product_id, r.n]));
  const joinedLabel = joined ? new Date(joined).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' }) : '';

  return <AccountShell active="/account">
    <section className="card profile-card">
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="profile-avatar" /> : <span className="avatar profile-avatar">{user.displayName[0]?.toUpperCase()}</span>}
      <div className="profile-copy">
        <h2>{user.displayName}</h2>
        <p className="hint">{user.email}{joinedLabel && <> · Joined {joinedLabel}</>}</p>
      </div>
      <Link className="btn btn-ghost" href="/sell">List an item</Link>
    </section>

    <div className="profile-stats">
      <Link href="/sell/listings?tab=active" className="profile-stat"><small>Active</small><strong>{active.length}</strong></Link>
      <Link href="/orders" className="profile-stat"><small>Orders</small><strong>{counts.purchases}</strong></Link>
      <Link href="/likes" className="profile-stat"><small>Saved</small><strong>{likedCount}</strong></Link>
      <Link href="/finance" className="profile-stat"><small>Balance</small><strong>{money2(cash)}</strong></Link>
    </div>

    <TipBanner />

    <section className="card">
      <div className="section-link" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>My listings ({active.length})</h2>
        <Link className="text-link" href="/sell/listings">View all ›</Link>
      </div>
      {shown.length === 0 ? <p className="hint">No active listings. <Link href="/sell">Create one</Link>.</p> : <div className="acct-grid">
        {shown.map((l) => <article key={l.id} className="acct-item">
          {coverImage(l.images, l.image) ? <img src={coverImage(l.images, l.image)} alt="" /> : <div className="acct-noimg" />}
          <div className="acct-body">
            <Link href={`/products/${l.id}`}><strong>{l.title}</strong></Link>
            <span>{money(l.price)}</span>
            <small className="hint">❤️ {likes.get(l.id) ?? 0}</small>
            <button className="btn btn-ghost btn-sm" disabled title="Promotions are coming soon">Promote</button>
          </div>
        </article>)}
      </div>}
    </section>

    {features.auth
      ? <ProfileSettings displayName={user.displayName} email={user.email} url={env.SUPABASE_URL!} publishableKey={env.SUPABASE_PUBLISHABLE_KEY!} />
      : <div className="alert alert-warn" style={{ marginTop: 16 }}>Name and password changes need Supabase Auth configured.</div>}

    <div className="stat-grid" style={{ marginTop: 16 }}>
      <div className="stat accent"><small>Cash balance</small><strong>{money2(cash)}</strong><span><Link href="/finance">Finance dashboard ›</Link></span></div>
      <div className="stat"><small>Seller earnings</small><strong>{money2(seller.available)}</strong><span>{money2(seller.pending)} pending</span></div>
      <div className="stat"><small>Spent this month</small><strong>{money2(spend.month)}</strong><span>{money2(spend.year)} this year</span></div>
      <div className="stat"><small>Activity</small><strong>{counts.sales} / {counts.purchases}</strong><span>sales / purchases</span></div>
    </div>
    <div className="card"><Link className="section-link" href="/orders?view=sales"><h2 style={{ margin: 0 }}>My sales</h2><span className="hint">{counts.sales} ›</span></Link></div>
    <div className="card"><Link className="section-link" href="/orders"><h2 style={{ margin: 0 }}>My purchases</h2><span className="hint">{counts.purchases} ›</span></Link></div>
  </AccountShell>;
}
