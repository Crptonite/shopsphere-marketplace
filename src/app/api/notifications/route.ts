import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { apiUser, jsonError } from '@/lib/api';
import { badgeKey } from '@/lib/notify';
import { cached, del } from '@/lib/redis';
import { unreadChats } from '@/lib/chats';

export const runtime = 'nodejs';

/** Badge counts (cached briefly in Redis) plus, with ?list=1, recent notifications. */
export async function GET(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const userId = auth.user.id;
  const counts = await cached(badgeKey(userId), 20, async () => {
    const { rows } = await pool.query<{ n: number }>('SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL', [userId]);
    return { unread: rows[0].n, chats: await unreadChats(userId) };
  });
  if (!request.nextUrl.searchParams.get('list')) return NextResponse.json(counts);
  const { rows } = await pool.query(
    `SELECT id::int, type, title, body, link, read_at AS "readAt", created_at AS "createdAt" FROM notifications WHERE user_id = $1 ORDER BY id DESC LIMIT 50`, [userId]);
  return NextResponse.json({ ...counts, items: rows });
}

const markSchema = z.object({ ids: z.array(z.number().int()).max(200).optional(), all: z.boolean().optional() });

export async function PATCH(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const parsed = markSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('Invalid request.');
  if (parsed.data.all) await pool.query('UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL', [auth.user.id]);
  else if (parsed.data.ids?.length) await pool.query('UPDATE notifications SET read_at = now() WHERE user_id = $1 AND id = ANY($2)', [auth.user.id, parsed.data.ids]);
  await del(badgeKey(auth.user.id));
  return NextResponse.json({ ok: true });
}
