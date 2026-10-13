import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { notify } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sends due trade reminders. Run every 15 minutes (see vercel.json).
 * Protected by CRON_SECRET: Vercel Cron sends it as a Bearer token.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  // Claim due rows and move them forward in one statement, so overlapping runs cannot send twice.
  const { rows } = await pool.query<{ userId: string; ticker: string | null; title: string; body: string }>(
    `UPDATE trade_reminders SET
       last_sent_at = now(),
       next_at = CASE frequency WHEN 'weekly' THEN next_at + interval '7 days' WHEN 'monthly' THEN next_at + interval '1 month' ELSE next_at END,
       active = (frequency <> 'once')
     WHERE id IN (
       SELECT id FROM trade_reminders WHERE active AND next_at <= now() ORDER BY next_at LIMIT 100 FOR UPDATE SKIP LOCKED
     )
     RETURNING user_id AS "userId", ticker, title, body`,
  );
  for (const r of rows) {
    await notify({
      userId: r.userId,
      type: 'trade_reminder',
      title: r.title,
      body: r.body || (r.ticker ? `Reminder for ${r.ticker}.` : 'Your investing reminder is due.'),
      link: r.ticker ? `/trade/${r.ticker}` : '/trade/workspace/dca-reminders',
    });
  }
  return NextResponse.json({ sent: rows.length });
}
