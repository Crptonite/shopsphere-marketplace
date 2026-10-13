import 'server-only';
import { NextResponse } from 'next/server';
import { getCurrentUser, type AppUser } from '@/lib/auth';
import { hasDb } from '@/lib/db';

export const jsonError = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Guards an API route: database configured and a signed-in user. */
export async function apiUser(): Promise<{ user: AppUser } | { response: NextResponse }> {
  if (!hasDb()) return { response: jsonError('Database is not configured.', 503) };
  const user = await getCurrentUser();
  if (!user) return { response: jsonError('Please sign in.', 401) };
  return { user };
}

export function serverError(context: string, error: unknown) {
  console.error(`${context}:`, error);
  return jsonError('Something went wrong. Please try again.', 500);
}

/** Guards an admin API route: signed-in user with admin rights. */
export async function apiAdmin(): Promise<{ user: AppUser } | { response: NextResponse }> {
  const auth = await apiUser();
  if ('response' in auth) return auth;
  if (!auth.user.isAdmin) return { response: jsonError('Admins only.', 403) };
  return auth;
}
