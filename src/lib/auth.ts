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

  if (!hasDb()) return { id: user.id, email: user.email, displayName, avatarUrl, isAdmin: envAdmin };

  const result = await pool.query<{ id: string; email: string; display_name: string; avatar_url: string; is_admin: boolean }>(
    `INSERT INTO users (id, auth_id, email, display_name, avatar_url, is_admin)
     VALUES ($1, $1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, avatar_url = EXCLUDED.avatar_url,
       is_admin = users.is_admin OR EXCLUDED.is_admin
     RETURNING id, email, display_name, avatar_url, is_admin`,
    [user.id, user.email, displayName, avatarUrl, envAdmin],
  );
  const row = result.rows[0];
  return { id: row.id, email: row.email, displayName: row.display_name, avatarUrl: row.avatar_url, isAdmin: row.is_admin };
});

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
