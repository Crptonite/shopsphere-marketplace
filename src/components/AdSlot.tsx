import Link from 'next/link';
import { pool, hasDb } from '@/lib/db';
import { money } from '@/lib/format';

type Promo = { id: string; title: string; price: number; image: string; location: string };

/**
 * Sponsored slot. Shows a promoted marketplace listing (products.promoted_until), else a
 * recent real listing, else a house "sell with us" card. No third-party ad network.
 */
export default async function AdSlot({ excludeSellerId }: { excludeSellerId?: string }) {
  let promo: Promo | null = null;
  if (hasDb()) {
    try {
      const { rows } = await pool.query<Promo>(
        `SELECT p.id, p.title, p.price_sgd::float8 AS price, p.location,
                COALESCE((SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY sort_order LIMIT 1), p.image_url) AS image
         FROM products p WHERE p.status = 'active' AND NOT p.is_sample AND p.listing_type IN ('goods','trade_in')
           AND p.seller_id IS DISTINCT FROM $1
         ORDER BY (p.promoted_until > now()) DESC NULLS LAST, random() LIMIT 1`, [excludeSellerId ?? null]);
      promo = rows[0] ?? null;
    } catch { /* fall back to house card */ }
  }
  return <aside className="ad-slot" aria-label="Sponsored">
    <div className="ad-label">Sponsored</div>
    {promo ? <Link href={`/products/${promo.id}`} className="ad-card">
      {promo.image && <img src={promo.image} alt="" />}
      <strong>{promo.title}</strong>
      <span>{money(promo.price)} · {promo.location}</span>
      <em>View listing →</em>
    </Link> : <Link href="/sell" className="ad-card ad-house">
      <strong>Declutter &amp; earn</strong>
      <span>List your phone, laptop or spare room in under a minute. Chat with buyers and get paid securely.</span>
      <em>Start selling →</em>
    </Link>}
  </aside>;
}
