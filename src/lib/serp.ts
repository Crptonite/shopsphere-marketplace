import 'server-only';
import { env } from '@/lib/env';
import { pool } from '@/lib/db';

type ShoppingResult = { title?: string; price?: string; extracted_price?: number; thumbnail?: string; source?: string; product_link?: string; link?: string };

/**
 * Google Shopping discovery via SerpApi (Singapore). Results are stored as
 * external, unverified discovery data with their source URL and retrieval time.
 */
export async function discoverProducts(query: string) {
  if (!env.SERP_API_KEY) throw new Error('SERP_API_KEY is not configured.');
  const params = new URLSearchParams({ engine: 'google_shopping', q: query, location: 'Singapore', gl: 'sg', hl: 'en', api_key: env.SERP_API_KEY });
  const response = await fetch(`https://serpapi.com/search.json?${params}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Product discovery request failed (${response.status})`);
  const data = (await response.json()) as { shopping_results?: ShoppingResult[] };
  const results = (data.shopping_results ?? []).filter((r) => r.title && (r.product_link || r.link)).slice(0, 30);

  for (const r of results) {
    await pool.query(
      `INSERT INTO external_products (query, title, price_text, price_sgd, thumbnail, merchant, source_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (source_url) DO UPDATE SET title = EXCLUDED.title, price_text = EXCLUDED.price_text,
         price_sgd = EXCLUDED.price_sgd, thumbnail = EXCLUDED.thumbnail, merchant = EXCLUDED.merchant, retrieved_at = now()`,
      [query, r.title, r.price ?? null, r.extracted_price ?? null, r.thumbnail ?? null, r.source ?? null, r.product_link ?? r.link],
    );
  }
  return results.length;
}

export type ExternalProduct = { id: number; title: string; priceText: string | null; thumbnail: string | null; merchant: string | null; sourceUrl: string; retrievedAt: string };

export async function externalMatches(q: string, limit = 6): Promise<ExternalProduct[]> {
  if (!q.trim()) return [];
  const { rows } = await pool.query<ExternalProduct>(
    `SELECT id, title, price_text AS "priceText", thumbnail, merchant, source_url AS "sourceUrl", retrieved_at AS "retrievedAt"
     FROM external_products
     WHERE retrieved_at > now() - interval '14 days' AND (title ILIKE '%' || $1 || '%' OR similarity(title, $1) > 0.2)
     ORDER BY similarity(title, $1) DESC, retrieved_at DESC LIMIT $2`,
    [q.trim(), limit],
  );
  return rows;
}
