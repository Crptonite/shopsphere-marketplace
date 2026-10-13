import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { apiUser, jsonError, serverError } from '@/lib/api';

export const runtime = 'nodejs';

const positionSchema = z.object({
  ticker: z.string().trim().toUpperCase().regex(/^[A-Z0-9.]{2,10}$/),
  shares: z.coerce.number().positive().max(1_000_000_000),
  avgCost: z.coerce.number().min(0).max(1_000_000),
});

export async function POST(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const parsed = positionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('Enter a ticker, a share count and an average cost.');
  try {
    const found = await pool.query('SELECT 1 FROM trade_stocks WHERE ticker = $1', [parsed.data.ticker]);
    if (!found.rowCount) return jsonError('Unknown stock.', 404);
    const { rows } = await pool.query<{ id: number }>(
      'INSERT INTO trade_positions (user_id, ticker, shares, avg_cost) VALUES ($1,$2,$3,$4) RETURNING id::int',
      [auth.user.id, parsed.data.ticker, parsed.data.shares, parsed.data.avgCost],
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) {
    return serverError('Could not add the position', error);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return jsonError('Invalid position.');
  const result = await pool.query('DELETE FROM trade_positions WHERE id = $1 AND user_id = $2', [id, auth.user.id]);
  if (!result.rowCount) return jsonError('Not found.', 404);
  return NextResponse.json({ ok: true });
}
