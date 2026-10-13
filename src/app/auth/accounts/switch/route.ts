import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { BROWSER_COOKIE, identityFromCookies, isAuthCookie, park, take, vaultEnabled, type SessionCookie } from '@/lib/account-vault';
import { SESSION_COOKIE_OPTS as COOKIE_OPTS, safeNext, withBrowser } from '@/lib/account-routes';

export const runtime = 'nodejs';

/** Switches to a recently used account: parks the current one, then restores the chosen one. */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const to = String(form?.get('to') ?? '');
  const next = safeNext(String(form?.get('next') ?? '/'));
  const go = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });
  if (!vaultEnabled() || !to) return go('/login');

  const browserId = request.cookies.get(BROWSER_COOKIE)?.value ?? randomUUID();
  const cookies: SessionCookie[] = request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
  const current = identityFromCookies(cookies);
  if (current?.userId === to) return withBrowser(go(next), request, browserId);

  if (current) await park(browserId, cookies);
  const restore = await take(browserId, to);
  if (!restore) {
    const msg = 'That account was not used in the last 2 hours. Sign in again to use it.';
    return withBrowser(go(`/login?error=oauth&message=${encodeURIComponent(msg)}`), request, browserId);
  }

  const response = go(next);
  for (const c of cookies) if (isAuthCookie(c.name)) response.cookies.set(c.name, '', { path: '/', maxAge: 0 });
  for (const c of restore) response.cookies.set(c.name, c.value, COOKIE_OPTS);
  return withBrowser(response, request, browserId);
}
