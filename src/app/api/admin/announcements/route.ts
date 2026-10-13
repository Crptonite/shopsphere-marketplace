import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { apiAdmin, jsonError, serverError } from '@/lib/api';

export const runtime = 'nodejs';

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().max(500).default(''),
  link: z.string().max(200).regex(/^\/(?!\/)/, 'Link must start with /').optional().or(z.literal('')),
});

/** Sends an in-app promo or event message to every active account (Updates panel and badge). */
export async function POST(request: NextRequest) {
  const auth = await apiAdmin();
  if ('response' in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues.map((i) => i.message).join('; '));
  const { title, body, link } = parsed.data;
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       SELECT u.id, 'promo', $1, $2, $3
       FROM users u LEFT JOIN notification_prefs p ON p.user_id = u.id
       WHERE u.deleted_at IS NULL AND u.suspended_at IS NULL AND COALESCE(p.in_app_enabled, true)`,
      [title, body, link || null],
    );
    return NextResponse.json({ sent: result.rowCount ?? 0 }, { status: 201 });
  } catch (error) {
    return serverError('Announcement failed', error);
  }
}
