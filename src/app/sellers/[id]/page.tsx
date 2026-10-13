import { notFound } from 'next/navigation';
import { hasDb, pool } from '@/lib/db';
import { listingsBySeller } from '@/lib/products';
import SellerListings from './SellerListings';

export const dynamic = 'force-dynamic';

type Seller = { id: string; displayName: string; joinedAt: string };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasDb()) return { title: 'Seller — ShopSphere' };
  const { rows } = await pool.query<{ display_name: string }>('SELECT display_name FROM users WHERE id = $1', [id]);
  return { title: `${rows[0]?.display_name ?? 'Seller'} — ShopSphere` };
}

/** Public seller page: shows the seller's name, when they joined, and their active listings. */
export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasDb()) return <main className="page"><div className="alert alert-warn">Database not configured.</div></main>;

  const { rows } = await pool.query<Seller>(
    `SELECT id, display_name AS "displayName", created_at AS "joinedAt" FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  ).catch(async () => pool.query<Seller>(
    `SELECT id, display_name AS "displayName", created_at AS "joinedAt" FROM users WHERE id = $1`,
    [id],
  ));
  const seller = rows[0];
  if (!seller) notFound();

  const listings = (await listingsBySeller(id)).filter((l) => l.status === 'active');
  const joined = new Intl.DateTimeFormat('en-SG', { month: 'short', year: 'numeric' }).format(new Date(seller.joinedAt));

  return <main className="page">
    <div className="card seller-head">
      <span className="pd-avatar">{seller.displayName.slice(0, 1).toUpperCase()}</span>
      <div>
        <h1 className="seller-name">{seller.displayName}</h1>
        <div className="hint">Joined {joined} · {listings.length} active {listings.length === 1 ? 'listing' : 'listings'}</div>
      </div>
    </div>
    <h2 style={{ fontSize: 18, margin: '20px 0 12px' }}>Listings from {seller.displayName}</h2>
    <SellerListings items={listings} />
  </main>;
}
