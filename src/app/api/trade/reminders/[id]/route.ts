import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { apiUser, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

/** Turns off one of the signed-in user's reminders. */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const result = await pool.query('UPDATE trade_reminders SET active = false WHERE id = $1 AND user_id = $2', [Number(id), auth.user.id]);
  if (!result.rowCount) return jsonError('Not found.', 404);
  return NextResponse.json({ ok: true });
}
