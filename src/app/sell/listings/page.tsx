import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { pool, hasDb } from '@/lib/db';
import { listingsBySeller } from '@/lib/products';
import { coverImage } from '@/lib/files';
import { dateOnly, listingTypeLabel, money } from '@/lib/format';
import AccountShell from '@/components/AccountShell';
import SelectAll from '@/components/SelectAll';
import RemoveListingButton from '../RemoveListingButton';
import MarkSoldButton from '../MarkSoldButton';

export const metadata = { title: 'Manage listings — ShopSphere' };

const TABS = [
  { id: 'active', label: 'Active', match: (s: string) => s === 'active' },
  { id: 'inactive', label: 'Inactive', match: (s: string) => s === 'draft' },
  { id: 'others', label: 'Others', match: (s: string) => s === 'sold' || s === 'removed' },
] as const;

const DATE_RANGES = [{ value: '', label: 'Any time' }, { value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }];
const PRICE_BANDS: Record<string, [number, number]> = { '0-100': [0, 100], '100-500': [100, 500], '500-1000': [500, 1000], '1000+': [1000, Infinity] };
const PRICE_OPTIONS = [{ value: '', label: 'Any price' }, { value: '0-100', label: 'Under S$100' }, { value: '100-500', label: 'S$100–500' }, { value: '500-1000', label: 'S$500–1,000' }, { value: '1000+', label: 'S$1,000+' }];
const TYPE_LABELS: Record<string, string> = { goods: 'Goods', trade_in: 'Trade-in', property_sale: 'Property sale', property_rent: 'Property rent' };
const SORTS = [{ value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }, { value: 'price_high', label: 'Price: high to low' }, { value: 'price_low', label: 'Price: low to high' }, { value: 'likes', label: 'Most liked' }];

type Params = { tab?: string; q?: string; category?: string; condition?: string; type?: string; date?: string; price?: string; sort?: string };

export default async function ManageListingsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser('/sell/listings');
  if (!hasDb()) return <AccountShell active="/sell/listings"><div className="alert alert-warn">Database not configured.</div></AccountShell>;
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.tab) ?? TABS[0];

  const [all, likeCounts] = await Promise.all([
    listingsBySeller(user.id),
    pool.query<{ product_id: string; n: number }>(
      'SELECT l.product_id, COUNT(*)::int AS n FROM likes l JOIN products p ON p.id = l.product_id WHERE p.seller_id = $1 GROUP BY l.product_id', [user.id]),
  ]);
  const likes = new Map(likeCounts.rows.map((r) => [r.product_id, r.n]));
  const categories = [...new Set(all.map((l) => l.category).filter(Boolean))].sort();
  const conditions = [...new Set(all.map((l) => l.condition).filter((c): c is string => Boolean(c)))];

  const q = (sp.q ?? '').trim().toLowerCase();
  const cutoff = sp.date ? Date.now() - Number(sp.date) * 86_400_000 : 0;
  const [minPrice, maxPrice] = PRICE_BANDS[sp.price ?? ''] ?? [0, Infinity];
  const sort = sp.sort ?? 'newest';
  const rows = all
    .filter((l) => tab.match(l.status)
      && (!q || l.title.toLowerCase().includes(q))
      && (!sp.category || l.category === sp.category)
      && (!sp.condition || l.condition === sp.condition)
      && (!sp.type || l.listingType === sp.type)
      && (!cutoff || new Date(l.createdAt).getTime() >= cutoff)
      && l.price >= minPrice && l.price <= maxPrice)
    .sort((a, b) => {
      if (sort === 'oldest') return +new Date(a.createdAt) - +new Date(b.createdAt);
      if (sort === 'price_high') return b.price - a.price;
      if (sort === 'price_low') return a.price - b.price;
      if (sort === 'likes') return (likes.get(b.id) ?? 0) - (likes.get(a.id) ?? 0);
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });

  return <AccountShell active="/sell/listings">
    <div className="page-head"><div><div className="eyebrow">SELLING</div><h1>Manage listings</h1></div><Link className="btn" href="/sell">New listing</Link></div>

    <nav className="tabs">
      {TABS.map((t) => <Link key={t.id} href={`/sell/listings?tab=${t.id}`} aria-current={t.id === tab.id ? 'page' : undefined}>
        {all.filter((l) => t.match(l.status)).length} {t.label}
      </Link>)}
    </nav>

    <form className="listing-filters" method="get">
      <input type="hidden" name="tab" value={tab.id} />
      <label>Search<input className="input" name="q" defaultValue={sp.q ?? ''} placeholder="Search listings..." /></label>
      <label>Category<select name="category" defaultValue={sp.category ?? ''}><option value="">All</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
      <label>Promotion status<select disabled><option>All</option></select></label>
      <label>Listing type<select name="type" defaultValue={sp.type ?? ''}><option value="">All</option>{Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label>Condition<select name="condition" defaultValue={sp.condition ?? ''}><option value="">All</option>{conditions.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
      <label>Date created<select name="date" defaultValue={sp.date ?? ''}>{DATE_RANGES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select></label>
      <label>Price<select name="price" defaultValue={sp.price ?? ''}>{PRICE_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select></label>
      <label>Sort<select name="sort" defaultValue={sort}>{SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
      <button className="btn btn-sm" type="submit">Apply</button>
      <Link className="hint" href={`/sell/listings?tab=${tab.id}`}>Reset</Link>
    </form>

    {rows.length === 0 ? <div className="empty"><h3>No {tab.label.toLowerCase()} listings match</h3><p>Try clearing a filter.</p></div> : <div className="card table-wrap"><table className="table">
      <thead><tr><th><SelectAll /></th><th /><th>Listing</th><th>Listed on</th><th className="num">Price</th><th className="num">Likes</th><th className="num">Actions</th></tr></thead>
      <tbody>{rows.map((l) => {
        const image = coverImage(l.images, l.image);
        return <tr key={l.id}>
          <td><input type="checkbox" name="select" value={l.id} aria-label={`Select ${l.title}`} /></td>
          <td style={{ width: 84 }}>{image && <img src={image} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />}</td>
          <td><Link href={`/products/${l.id}`}><strong>{l.title}</strong></Link><div className="hint">{listingTypeLabel[l.listingType]} · stock {l.stockQty}</div></td>
          <td className="hint">{dateOnly(l.createdAt)}</td>
          <td className="num">{money(l.price)}</td>
          <td className="num">{likes.get(l.id) ?? 0}</td>
          <td className="num" style={{ whiteSpace: 'nowrap' }}>
            <button className="btn btn-ghost btn-sm" disabled title="Insights are coming soon">📈 View insights</button>{' '}
            <button className="btn btn-ghost btn-sm" disabled title="Promotions are coming soon">Promote</button>{' '}
            <Link className="btn btn-ghost btn-sm" href={`/sell?edit=${l.id}`}>Edit</Link>{' '}
            {(l.status === 'active' || l.status === 'sold') && <><MarkSoldButton id={l.id} status={l.status} />{' '}</>}
            <RemoveListingButton id={l.id} />
          </td>
        </tr>;
      })}</tbody>
    </table></div>}
  </AccountShell>;
}
