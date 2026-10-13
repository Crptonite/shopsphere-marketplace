import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { apiUser, jsonError } from '@/lib/api';
import { LISTING_COLUMNS } from '@/lib/products';

export const runtime = 'nodejs';

/** ?ids=1 returns only liked product ids (for hearts); otherwise the liked listings. */
export async function GET(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  if (request.nextUrl.searchParams.get('ids')) {
    const { rows } = await pool.query<{ product_id: string }>('SELECT product_id FROM likes WHERE user_id = $1', [auth.user.id]);
    return NextResponse.json({ ids: rows.map((r) => r.product_id) });
  }
  const { rows } = await pool.query(
    `SELECT ${LISTING_COLUMNS}, p.previous_price_sgd::float8 AS "previousPrice" FROM likes l JOIN products p ON p.id = l.product_id
     WHERE l.user_id = $1 AND p.status <> 'removed' ORDER BY l.created_at DESC LIMIT 200`, [auth.user.id]);
  return NextResponse.json({ items: rows });
}

/** Toggle a like. */
export async function POST(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const parsed = z.object({ productId: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('Invalid request.');
  const removed = await pool.query('DELETE FROM likes WHERE user_id = $1 AND product_id = $2', [auth.user.id, parsed.data.productId]);
  if (removed.rowCount) return NextResponse.json({ liked: false });
  const exists = await pool.query(`SELECT 1 FROM products WHERE id = $1 AND status <> 'removed'`, [parsed.data.productId]);
  if (!exists.rowCount) return jsonError('Listing not found.', 404);
  await pool.query('INSERT INTO likes (user_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [auth.user.id, parsed.data.productId]);
  return NextResponse.json({ liked: true });
}
