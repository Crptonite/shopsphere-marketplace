import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { pool, hasDb } from '@/lib/db';
import { rankProducts } from '@/lib/catalog';
import { embed, vectorLiteral, searchFiltersSchema, type SearchFilters } from '@/lib/ai';
import { cached } from '@/lib/redis';
import { filterClause, LISTING_COLUMNS, type Listing } from '@/lib/products';
import { externalMatches, type ExternalProduct } from '@/lib/serp';

export const runtime = 'nodejs';

const num = (v: string | null) => (v === null || v === '' || !Number.isFinite(Number(v)) ? undefined : Number(v));
const str = (v: string | null) => v?.trim() || undefined;

type SearchResult = { mode: string; query: string; items: Listing[]; external: ExternalProduct[]; semanticSearchEnabled: boolean };

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const sort = sp.get('sort') === 'recent' ? 'recent' : 'best_match';
  const limit = Math.min(Math.max(Number(sp.get('limit') ?? 24) || 24, 1), 100);
  const parsed = searchFiltersSchema.safeParse({
    q: (sp.get('q') ?? '').trim().slice(0, 200),
    brand: str(sp.get('brand')), model: str(sp.get('model')), category: str(sp.get('category')),
    location: str(sp.get('location')), condition: str(sp.get('condition')), listingType: str(sp.get('listingType')),
    minPrice: num(sp.get('minPrice')), maxPrice: num(sp.get('maxPrice')),
  });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid filters.' }, { status: 400 });
  const filters = parsed.data;
  const id = str(sp.get('id'));

  if (!hasDb()) {
    let items = rankProducts(filters.q, sort);
    if (filters.brand) items = items.filter((p) => p.brand.toLowerCase() === filters.brand!.toLowerCase());
    if (filters.condition) items = items.filter((p) => p.condition === filters.condition);
    if (filters.maxPrice) items = items.filter((p) => p.price <= filters.maxPrice!);
    return NextResponse.json({
      mode: 'demo', query: filters.q, items: items.slice(0, limit), external: [],
      message: 'Showing clearly labelled local demo catalogue. Configure DATABASE_URL for PostgreSQL search.',
    });
  }

  const cacheKey = `search:results:${createHash('sha1').update(JSON.stringify({ filters, id, sort, limit })).digest('hex')}`;
  try {
    const result = await cached<SearchResult>(cacheKey, 60, () => runSearch(filters, id, sort, limit));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Product search failed:', error);
    return NextResponse.json({ error: 'Search service is temporarily unavailable.' }, { status: 503 });
  }
}

async function runSearch(filters: SearchFilters, id: string | undefined, sort: string, limit: number): Promise<SearchResult> {
  const q = filters.q;
  // Optional semantic signal. Exact model/text matches remain in the ranking formula,
  // so vector similarity does not overwhelm identifiers such as "iPhone 18 Pro Max".
  const embedding = sort === 'recent' || !q ? null : await embed(q);
  const params: unknown[] = [q, sort, vectorLiteral(embedding), limit];
  const extra = filterClause({ ...filters, id }, params);
  const score = `(
      CASE WHEN lower(p.title) = lower($1) THEN 100 ELSE 0 END +
      CASE WHEN lower(p.model) = lower($1) THEN 95 ELSE 0 END +
      CASE WHEN lower(p.title) LIKE lower($1) || '%' THEN 35 ELSE 0 END +
      CASE WHEN lower(p.brand) = lower($1) THEN 20 ELSE 0 END +
      ts_rank(p.search_document, websearch_to_tsquery('english', NULLIF($1,''))) * 10 +
      CASE WHEN $3::vector IS NOT NULL AND p.embedding IS NOT NULL
           THEN (1 - (p.embedding <=> $3::vector)) * 12 ELSE 0 END)`;
  const { rows } = await pool.query<Listing>(
    `SELECT ${LISTING_COLUMNS}, ${score} AS relevance_score
     FROM products p
     WHERE p.status = 'active'
       AND ($1 = '' OR p.search_document @@ websearch_to_tsquery('english', $1)
            OR p.title ILIKE '%' || $1 || '%' OR p.model ILIKE '%' || $1 || '%'
            OR p.brand ILIKE '%' || $1 || '%' OR p.category ILIKE '%' || $1 || '%'
            OR ($3::vector IS NOT NULL AND p.embedding IS NOT NULL AND (p.embedding <=> $3::vector) < 0.6))
       ${extra}
     ORDER BY
       CASE WHEN $2 = 'recent' THEN p.created_at END DESC,
       CASE WHEN $2 <> 'recent' THEN ${score} END DESC,
       p.created_at DESC
     LIMIT $4`,
    params,
  );
  const external = q ? await externalMatches(q).catch(() => []) : [];
  return { mode: embedding ? 'postgres-hybrid' : 'postgres-text', query: q, items: rows, external, semanticSearchEnabled: Boolean(embedding) };
}
