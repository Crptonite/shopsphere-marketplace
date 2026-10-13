import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { apiUser, jsonError, serverError } from '@/lib/api';

export const runtime = 'nodejs';

const createSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().max(500).default(''),
  ticker: z.string().trim().toUpperCase().regex(/^[A-Z0-9.]{2,10}$/).nullable().optional(),
  frequency: z.enum(['once', 'weekly', 'monthly']),
  firstAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date'),
});

/** The signed-in user's active reminders. */
export async function GET() {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const { rows } = await pool.query(
    `SELECT id::int, ticker, title, body, frequency, next_at AS "nextAt", last_sent_at AS "lastSentAt"
     FROM trade_reminders WHERE user_id = $1 AND active ORDER BY next_at LIMIT 100`,
    [auth.user.id],
  );
  return NextResponse.json({ reminders: rows });
}

/** Creates a reminder. Its first send happens at `firstAt`; the cron job sends it and schedules the next one. */
export async function POST(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues.map((i) => i.message).join('; '));
  const r = parsed.data;
  const firstAt = new Date(r.firstAt);
  if (firstAt.getTime() < Date.now() - 60_000) return jsonError('Choose a time in the future.');
  try {
    const { rows: count } = await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM trade_reminders WHERE user_id = $1 AND active', [auth.user.id]);
    if (count[0].n >= 50) return jsonError('You can have up to 50 active reminders.', 409);
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO trade_reminders (user_id, ticker, title, body, frequency, next_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id::int`,
      [auth.user.id, r.ticker ?? null, r.title, r.body, r.frequency, firstAt.toISOString()],
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) {
    return serverError('Could not save the reminder', error);
  }
}
