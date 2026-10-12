import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { pool, hasDb } from '@/lib/db';
import { listingsBySeller } from '@/lib/products';
import { dateOnly, listingTypeLabel, money } from '@/lib/format';
import AccountShell from '@/components/AccountShell';
import RemoveListingButton from '../RemoveListingButton';

export const metadata = { title: 'Manage listings — ShopSphere' };

const TABS = [
  { id: 'active', label: 'Active', match: (s: string) => s === 'active' },
  { id: 'inactive', label: 'Inactive', match: (s: string) => s === 'draft' },
  { id: 'others', label: 'Others', match: (s: string) => s === 'sold' },
] as const;

export default async function ManageListingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; sort?: string }> }) {
  const user = await requireUser('/sell/listings');
  if (!hasDb()) return <AccountShell active="/sell/listings"><div className="alert alert-warn">Database not configured.</div></AccountShell>;
  const { tab: tabParam, q = '', sort } = await searchParams;
  const tab = TABS.find((t) => t.id === tabParam) ?? TABS[0];

  const [all, likeCounts] = await Promise.all([
    listingsBySeller(user.id),
    pool.query<{ product_id: string; n: number }>(
      `SELECT l.product_id, COUNT(*)::int AS n FROM likes l JOIN products p ON p.id = l.product_id WHERE p.seller_id = $1 GROUP BY l.product_id`, [user.id]),
  ]);
  const likes = new Map(likeCounts.rows.map((r) => [r.product_id, r.n]));
  let rows = all.filter((l) => tab.match(l.status) && (!q || l.title.toLowerCase().includes(q.toLowerCase())));
  if (sort === 'price') rows = rows.sort((a, b) => b.price - a.price);
  if (sort === 'likes') rows = rows.sort((a, b) => (likes.get(b.id) ?? 0) - (likes.get(a.id) ?? 0));

  return <AccountShell active="/sell/listings">
    <div className="page-head"><div><h1>Manage listings</h1></div><Link className="btn" href="/sell">New listing</Link></div>
    <form className="filters-row" style={{ marginTop: 0 }}>
      <input type="hidden" name="tab" value={tab.id} />
      <input className="input" name="q" defaultValue={q} placeholder="Search listings…" style={{ maxWidth: 320, borderRadius: 8, fontSize: 13 }} />
      <select name="sort" defaultValue={sort ?? ''} aria-label="Sort"><option value="">Newest</option><option value="price">Highest price</option><option value="likes">Most liked</option></select>
      <button className="btn btn-ghost btn-sm">Apply</button>
    </form>
    <nav className="tabs">{TABS.map((t) => <Link key={t.id} href={`/sell/listings?tab=${t.id}`} aria-current={t.id === tab.id ? 'page' : undefined}>{all.filter((l) => t.match(l.status)).length} {t.label}</Link>)}</nav>
    {rows.length === 0 ? <div className="empty"><h3>No {tab.label.toLowerCase()} listings</h3></div> : <div className="card table-wrap"><table className="table">
      <thead><tr><th /><th>Listing</th><th>Listed on</th><th className="num">Price</th><th className="num">Likes</th><th className="num">Action</th></tr></thead>
      <tbody>{rows.map((l) => <tr key={l.id}>
        <td style={{ width: 84 }}>{(l.images[0] || l.image) && <img src={l.images[0] || l.image} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />}</td>
        <td><Link href={`/products/${l.id}`}><strong>{l.title}</strong></Link><div className="hint">{listingTypeLabel[l.listingType]} · stock {l.stockQty}</div></td>
        <td className="hint">{dateOnly(l.createdAt)}</td>
        <td className="num">{money(l.price)}</td>
        <td className="num">{likes.get(l.id) ?? 0}</td>
        <td className="num"><Link className="btn btn-ghost btn-sm" href={`/sell?edit=${l.id}`}>Edit</Link> <RemoveListingButton id={l.id} /></td>
      </tr>)}</tbody>
    </table></div>}
  </AccountShell>;
}
