import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool, tx } from '@/lib/db';
import { apiAdmin, jsonError, serverError } from '@/lib/api';
import { createSupabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const schema = z.object({ action: z.enum(['suspend', 'unsuspend', 'delete']) });

/**
 * Suspend, unsuspend or delete an account.
 * Suspended accounts are treated as signed out. Delete removes their listings, anonymises the
 * account and deletes the Supabase login, so existing orders and chats keep valid references.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await apiAdmin();
  if ('response' in auth) return auth.response;
  if (id === auth.user.id) return jsonError('You cannot suspend or delete your own account here.');

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('Invalid action.');
  const { action } = parsed.data;

  const target = await pool.query<{ is_admin: boolean }>('SELECT is_admin FROM users WHERE id = $1', [id]);
  if (!target.rows[0]) return jsonError('User not found.', 404);
  if (target.rows[0].is_admin) return jsonError('Remove admin rights before changing this account.', 403);

  try {
    if (action === 'suspend') {
      await pool.query('UPDATE users SET suspended_at = now() WHERE id = $1 AND deleted_at IS NULL', [id]);
      return NextResponse.json({ ok: true, action });
    }
    if (action === 'unsuspend') {
      await pool.query('UPDATE users SET suspended_at = NULL WHERE id = $1 AND deleted_at IS NULL', [id]);
      return NextResponse.json({ ok: true, action });
    }

    await tx(async (client) => {
      await client.query(`UPDATE products SET status = 'removed', updated_at = now() WHERE seller_id = $1`, [id]);
      await client.query('DELETE FROM likes WHERE user_id = $1', [id]);
      await client.query(
        `UPDATE users SET deleted_at = now(), suspended_at = COALESCE(suspended_at, now()), is_admin = false,
           display_name = 'Deleted user', email = $2, avatar_url = '', phone = NULL, sms_opt_in = false
         WHERE id = $1`,
        [id, `deleted+${id}@removed.invalid`],
      );
    });

    // Remove the login too. Without service-role credentials the account stays blocked in the app.
    let loginRemoved = false;
    const supabase = createSupabaseAdmin();
    if (supabase) {
      const { error } = await supabase.auth.admin.deleteUser(id);
      loginRemoved = !error;
      if (error) console.error('Supabase login delete failed:', error.message);
    }
    return NextResponse.json({ ok: true, action, loginRemoved });
  } catch (error) {
    return serverError('Admin user action failed', error);
  }
}
