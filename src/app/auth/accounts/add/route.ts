import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { BROWSER_COOKIE, identityFromCookies, isAuthCookie, park, vaultEnabled, type SessionCookie } from '@/lib/account-vault';
import { safeNext, withBrowser } from '@/lib/account-routes';

export const runtime = 'nodejs';

/** Parks the current account, clears the browser's session, and opens the sign-in page for another account. */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const next = safeNext(String(form?.get('next') ?? '/'));
  const response = NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, request.url), { status: 303 });
  if (!vaultEnabled()) return response;

  const browserId = request.cookies.get(BROWSER_COOKIE)?.value ?? randomUUID();
  const cookies: SessionCookie[] = request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
  if (identityFromCookies(cookies)) {
    await park(browserId, cookies);
    for (const c of cookies) if (isAuthCookie(c.name)) response.cookies.set(c.name, '', { path: '/', maxAge: 0 });
  }
  return withBrowser(response, request, browserId);
}
