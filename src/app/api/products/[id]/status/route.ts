import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { apiUser, jsonError, serverError } from '@/lib/api';
import { invalidate } from '@/lib/redis';

export const runtime = 'nodejs';

const bodySchema = z.object({ status: z.enum(['active', 'sold']) });

/** Owner marks a listing as sold, or back to active. Removed listings cannot be changed here. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('Status must be active or sold.');
  try {
    const found = await pool.query<{ seller_id: string; status: string }>('SELECT seller_id, status FROM products WHERE id = $1', [id]);
    const row = found.rows[0];
    if (!row) return jsonError('Not found.', 404);
    if (row.seller_id !== auth.user.id) return jsonError('You can only change your own listings.', 403);
    if (row.status === 'removed' || row.status === 'draft') return jsonError('This listing cannot be changed here.', 409);
    await pool.query('UPDATE products SET status = $2, updated_at = now() WHERE id = $1', [id, parsed.data.status]);
    await invalidate('search:');
    return NextResponse.json({ id, status: parsed.data.status });
  } catch (error) {
    return serverError('Status update failed', error);
  }
}
