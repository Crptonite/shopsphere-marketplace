import { coverImage } from '@/lib/files';
import Link from 'next/link';
import { Search, Store } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { hasDb, pool } from '@/lib/db';
import { money } from '@/lib/format';
import { KINDA_THING } from '@/lib/mega-menu';
import { LISTING_COLUMNS, type Listing } from '@/lib/products';

type Pick = { id: string; title: string; price: number; image: string; seller: string };

/** Latest active smartphone listings. Falls back to the sample catalog when no database is configured. */
async function dailyPicks(): Promise<Pick[]> {
  if (!hasDb()) {
    return catalog.filter((p) => p.category === 'Phones').slice(0, 8)
      .map((p) => ({ id: p.id, title: p.title, price: p.price, image: p.image, seller: p.seller }));
  }
  const { rows } = await pool.query<Listing>(
    `SELECT ${LISTING_COLUMNS} FROM products p
     WHERE p.status = 'active' AND p.category = 'Phones'
     ORDER BY p.created_at DESC LIMIT 8`,
  );
  return rows.map((r) => ({ id: r.id, title: r.title, price: r.price, image: coverImage(r.images, r.image), seller: r.seller }));
}

export default async function HomeRecommendations() {
  const picks = await dailyPicks().catch(() => []);
  return <section className="home-recs" aria-label="Recommended for you">
    <div className="rec-card">
      <h2>Looks like your kinda thing</h2>
      <div className="rec-chips">
        {KINDA_THING.map((term) => <Link key={term} className="rec-chip" href={`/search?q=${encodeURIComponent(term)}`}>
          <Search size={14} /> {term}
        </Link>)}
      </div>
    </div>

    <div className="rec-head">
      <h2>Your Daily Picks</h2>
      <Link className="text-link" href="/search?category=Phones">See all phones</Link>
    </div>
    {picks.length === 0 ? <p className="hint">No phone listings yet.</p> : <div className="rec-grid">
      {picks.map((p) => <Link key={p.id} href={`/products/${p.id}`} className="product-card">
        <div className="product-image-wrap">{p.image ? <img className="product-image" src={p.image} alt={p.title} /> : <div className="product-image" />}</div>
        <div className="product-info">
          <h3>{p.title}</h3>
          <p className="product-price">{money(p.price)}</p>
          <div className="seller-line"><Store size={11} /><span>{p.seller}</span></div>
        </div>
      </Link>)}
    </div>}
  </section>;
}
