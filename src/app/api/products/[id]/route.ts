import { coverImage } from '@/lib/files';
import { notifyPriceDrop } from '@/lib/price-alerts';
import { NextRequest, NextResponse } from 'next/server';
import { pool, tx } from '@/lib/db';
import { apiUser, jsonError, serverError } from '@/lib/api';
import { getListing, listingSchema, normaliseListing, saveImages } from '@/lib/products';
import { embed, vectorLiteral } from '@/lib/ai';
import { invalidate } from '@/lib/redis';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const listing = await getListing(id).catch(() => null);
  if (!listing || listing.status === 'removed') return jsonError('Not found.', 404);
  return NextResponse.json({ item: listing });
}

async function ownedListing(id: string, userId: string) {
  const { rows } = await pool.query<{ seller_id: string | null }>('SELECT seller_id FROM products WHERE id = $1', [id]);
  if (!rows[0]) return 'missing';
  return rows[0].seller_id === userId ? 'ok' : 'forbidden';
}

/** Full update of a listing by its owner. */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const owned = await ownedListing(id, auth.user.id);
  if (owned !== 'ok') return jsonError(owned === 'missing' ? 'Not found.' : 'You can only edit your own listings.', owned === 'missing' ? 404 : 403);

  const parsed = listingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  const l = normaliseListing(parsed.data);
  try {
    const previous = await pool.query<{ price: number }>('SELECT price_sgd::float8 AS price FROM products WHERE id = $1', [id]);
    const embedding = await embed(`${l.title} ${l.brand} ${l.model} ${l.category} ${l.description}`);
    await tx(async (client) => {
      await client.query(
        `UPDATE products SET title=$2, brand=$3, model=$4, category=$5, price_sgd=$6, condition=$7, location=$8, image_url=$9,
           description=$10, status=CASE WHEN status = 'sold' AND $15 > 0 THEN $11 WHEN status = 'sold' THEN status ELSE $11 END,
           listing_type=$12, property=$13, embedding=COALESCE($14::vector, embedding), stock_qty=$15, updated_at=now()
         WHERE id=$1`,
        [id, l.title, l.brand, l.model, l.category, l.price, l.condition, l.location, coverImage(l.images), l.description, l.status,
          l.listingType, l.property ? JSON.stringify(l.property) : null, vectorLiteral(embedding), l.stockQty],
      );
      await saveImages(client, id, l.images);
    });
    await invalidate('search:');
    const before = previous.rows[0]?.price;
    if (before !== undefined && l.price !== before) {
      // Keep the price before a drop so the listing can show the discount; clear it when the price rises.
      await pool.query('UPDATE products SET previous_price_sgd = $2, price_changed_at = now() WHERE id = $1', [id, l.price < before ? before : null]);
    }
    if (before !== undefined && l.price < before) await notifyPriceDrop(id, l.title, before, l.price, auth.user.id);
    return NextResponse.json({ id });
  } catch (error) {
    return serverError('Product update failed', error);
  }
}

/** Owner removes a listing (soft delete; order history keeps referencing it). */
export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const owned = await ownedListing(id, auth.user.id);
  if (owned !== 'ok') return jsonError(owned === 'missing' ? 'Not found.' : 'Forbidden.', owned === 'missing' ? 404 : 403);
  await pool.query(`UPDATE products SET status = 'removed', updated_at = now() WHERE id = $1`, [id]);
  await invalidate('search:');
  return NextResponse.json({ ok: true });
}
