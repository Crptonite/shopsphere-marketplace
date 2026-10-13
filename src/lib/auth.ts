import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { pool, hasDb } from '@/lib/db';
import { adminEmails } from '@/lib/env';
import { createSupabaseServer } from '@/lib/supabase/server';

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  isAdmin: boolean;
};

/**
 * Returns the signed-in user, mirroring the Supabase Auth identity into Neon `users`.
 * Neon `users.id` equals the Supabase auth user id so foreign keys stay simple.
 */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const supabase = await createSupabaseServer();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const meta = user.user_metadata ?? {};
  const displayName = String(meta.full_name || meta.name || user.email.split('@')[0]).slice(0, 80);
  const avatarUrl = String(meta.avatar_url || meta.picture || '');
  const envAdmin = adminEmails.has(user.email.toLowerCase());

  const identity: AppUser = { id: user.id, email: user.email, displayName, avatarUrl, isAdmin: envAdmin };
  if (!hasDb()) return identity;

  const row = await syncUserRow(identity, user.email);
  // Suspended or deleted accounts are treated as signed out.
  if (row === 'blocked') return null;
  return row ?? identity;
});

type UserRow = { id: string; email: string; display_name: string; avatar_url: string; is_admin: boolean; blocked: boolean };
const USER_COLUMNS = 'id, email, display_name, avatar_url, is_admin, (suspended_at IS NOT NULL OR deleted_at IS NOT NULL) AS blocked';

/**
 * Mirrors the Supabase identity into Neon `users`. Never throws: a database problem is logged
 * and the caller falls back to the Supabase identity, so sign-in still works.
 * Uses no ON CONFLICT target, so it works whichever unique key (id, auth_id or email) collides.
 */
async function syncUserRow(identity: AppUser, email: string): Promise<AppUser | 'blocked' | null> {
  try {
    const updated = await pool.query<UserRow>(
      `UPDATE users SET email = $2, avatar_url = $3, is_admin = is_admin OR $4
       WHERE id = $1 RETURNING ${USER_COLUMNS}`,
      [identity.id, email, identity.avatarUrl, identity.isAdmin],
    );
    let row = updated.rows[0];
    if (!row) {
      const inserted = await pool.query<UserRow>(
        `INSERT INTO users (id, auth_id, email, display_name, avatar_url, is_admin)
         VALUES ($1, $1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING RETURNING ${USER_COLUMNS}`,
        [identity.id, email, identity.displayName, identity.avatarUrl, identity.isAdmin],
      );
      row = inserted.rows[0];
    }
    if (!row) {
      console.error('[auth] users row not created: email already linked to another user id');
      return null;
    }
    if (row.blocked) return 'blocked';
    return { id: row.id, email: row.email, displayName: row.display_name, avatarUrl: row.avatar_url, isAdmin: row.is_admin };
  } catch (error) {
    console.error('[auth] could not sync users row', error);
    return null;
  }
}

/** For pages: redirect to /login when signed out. */
export async function requireUser(next = '/'): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser('/admin/discovery');
  if (!user.isAdmin) redirect('/');
  return user;
}
