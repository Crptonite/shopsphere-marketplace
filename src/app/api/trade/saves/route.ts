import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { apiUser, jsonError, serverError } from '@/lib/api';
import { userSaves } from '@/lib/trade-data';

export const runtime = 'nodejs';

const kindSchema = z.enum(['favourite', 'watchlist']);

/** The user's loved stocks (favourite) and watchlist. */
export async function GET() {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  return NextResponse.json(await userSaves(auth.user.id));
}

export async function POST(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const body = await request.json().catch(() => null);
  const ticker = String(body?.ticker ?? '').trim().toUpperCase();
  const kind = kindSchema.safeParse(body?.kind);
  if (!kind.success || !ticker) return jsonError('Choose a stock and a list.');
  try {
    const found = await pool.query('SELECT 1 FROM trade_stocks WHERE ticker = $1', [ticker]);
    if (!found.rowCount) return jsonError('Unknown stock.', 404);
    await pool.query('INSERT INTO trade_saves (user_id, ticker, kind) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [auth.user.id, ticker, kind.data]);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return serverError('Could not save', error);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const ticker = (request.nextUrl.searchParams.get('ticker') ?? '').toUpperCase();
  const kind = kindSchema.safeParse(request.nextUrl.searchParams.get('kind'));
  if (!kind.success || !ticker) return jsonError('Choose a stock and a list.');
  await pool.query('DELETE FROM trade_saves WHERE user_id = $1 AND ticker = $2 AND kind = $3', [auth.user.id, ticker, kind.data]);
  return NextResponse.json({ ok: true });
}
