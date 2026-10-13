import { coverImage } from '@/lib/files';
import { NextRequest, NextResponse } from 'next/server';
import { pool, tx, hasDb } from '@/lib/db';
import { catalog } from '@/lib/catalog';
import { apiUser, jsonError, serverError } from '@/lib/api';
import { listingSchema, LISTING_COLUMNS, normaliseListing, saveImages } from '@/lib/products';
import { embed, vectorLiteral } from '@/lib/ai';
import { invalidate } from '@/lib/redis';

export const runtime = 'nodejs';

export async function GET() {
  if (!hasDb()) return NextResponse.json({ mode: 'demo', items: catalog });
  try {
    const result = await pool.query(`SELECT ${LISTING_COLUMNS} FROM products p WHERE p.status = 'active' ORDER BY p.created_at DESC LIMIT 100`);
    return NextResponse.json({ mode: 'postgres', items: result.rows });
  } catch (error) {
    console.error('Product list failed:', error);
    return NextResponse.json({ error: 'Could not load products.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const parsed = listingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  const l = normaliseListing(parsed.data);

  try {
    const id = crypto.randomUUID();
    const embedding = await embed(`${l.title} ${l.brand} ${l.model} ${l.category} ${l.description}`);
    await tx(async (client) => {
      await client.query(
        `INSERT INTO products (id, title, brand, model, category, price_sgd, condition, location, image_url, seller_id, seller_display_name,
           description, is_sample, status, listing_type, stock_qty, property, embedding)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,false,$13,$14,$15,$16,$17::vector)`,
        [id, l.title, l.brand, l.model, l.category, l.price, l.condition, l.location, coverImage(l.images), auth.user.id, auth.user.displayName,
          l.description, l.status, l.listingType, l.stockQty, l.property ? JSON.stringify(l.property) : null, vectorLiteral(embedding)],
      );
      await saveImages(client, id, l.images);
    });
    await invalidate('search:');
    return NextResponse.json({ id, status: l.status }, { status: 201 });
  } catch (error) {
    return serverError('Product create failed', error);
  }
}
