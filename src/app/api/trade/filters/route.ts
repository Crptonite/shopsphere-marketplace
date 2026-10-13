import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { apiUser, jsonError, serverError } from '@/lib/api';

export const runtime = 'nodejs';

const criteriaSchema = z.record(z.string().max(40), z.object({ min: z.string().max(20).optional(), max: z.string().max(20).optional() }));

/** The user's saved screener filters. */
export async function GET() {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const { rows } = await pool.query(
    'SELECT id::int, name, criteria, created_at AS "createdAt" FROM trade_filters WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [auth.user.id],
  );
  return NextResponse.json({ filters: rows });
}

export async function POST(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const body = z.object({ name: z.string().trim().min(1).max(80), criteria: criteriaSchema }).safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError('Give the filter a name.');
  try {
    const { rows } = await pool.query<{ id: number }>(
      'INSERT INTO trade_filters (user_id, name, criteria) VALUES ($1,$2,$3) RETURNING id::int',
      [auth.user.id, body.data.name, JSON.stringify(body.data.criteria)],
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) {
    return serverError('Could not save the filter', error);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return jsonError('Invalid filter.');
  await pool.query('DELETE FROM trade_filters WHERE id = $1 AND user_id = $2', [id, auth.user.id]);
  return NextResponse.json({ ok: true });
}
