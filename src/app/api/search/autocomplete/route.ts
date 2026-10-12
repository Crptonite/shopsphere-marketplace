import { NextRequest, NextResponse } from 'next/server';
import { pool, hasDb } from '@/lib/db';
import { catalog, modelGroups } from '@/lib/catalog';
import { cached } from '@/lib/redis';

export const runtime = 'nodejs';

type Suggestion = { id: string; title: string; model: string; price: number; image: string; isSample: boolean };
type Group = { brand: string; label: string; models: string[] };

// "17" / "18" style queries map to iPhone generations; "s26", "fold" etc. are matched as text.
function matchGroups(q: string, groups: Group[]) {
  return groups.filter((g) => `${g.brand} ${g.label} ${g.models.join(' ')}`.toLowerCase().includes(q)
    || (/^\d{2}$/.test(q) && g.label.includes(q))
    || (q.includes('iphone') && g.brand === 'Apple') || ((q.includes('samsung') || q.includes('galaxy')) && g.brand === 'Samsung')).slice(0, 4);
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase().slice(0, 80);
  if (!q) return NextResponse.json({ products: [], groups: [] });

  if (!hasDb()) {
    const products = catalog.filter((p) => `${p.title} ${p.brand} ${p.model}`.toLowerCase().includes(q) || (/^\d{2}$/.test(q) && p.model.includes(q))).slice(0, 5)
      .map((p) => ({ id: p.id, title: p.title, model: p.model, price: p.price, image: p.image, isSample: true }));
    return NextResponse.json({ products, groups: matchGroups(q, modelGroups) });
  }

  try {
    const result = await cached(`search:autocomplete:${q}`, 30, async () => {
      const generation = /^\d{2}$/.test(q) ? `iphone ${q}` : q;
      const { rows: products } = await pool.query<Suggestion>(
        `SELECT p.id, p.title, p.model, p.price_sgd::float8 AS price,
                COALESCE((SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY sort_order LIMIT 1), p.image_url) AS image,
                p.is_sample AS "isSample"
         FROM products p
         WHERE p.status = 'active' AND (p.title ILIKE '%' || $1 || '%' OR p.model ILIKE '%' || $2 || '%' OR similarity(p.title, $1) > 0.25)
         ORDER BY (lower(p.title) LIKE $1 || '%') DESC, similarity(p.title, $1) DESC, p.created_at DESC LIMIT 5`,
        [q, generation],
      );
      const { rows: families } = await pool.query<{ brand: string; family_name: string; models: string[] }>(
        `SELECT brand, family_name, array_agg(model_name ORDER BY model_name) AS models FROM model_families
         GROUP BY brand, family_name ORDER BY brand, family_name DESC`,
      );
      const groups = matchGroups(q, families.map((f) => ({ brand: f.brand, label: f.family_name, models: f.models })));
      return { products, groups };
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Autocomplete failed:', error);
    return NextResponse.json({ products: [], groups: [] });
  }
}
