import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { BROWSER_COOKIE } from '@/lib/account-vault';

export const SESSION_COOKIE_OPTS = { path: '/', sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 400 };

/** Only relative, same-site paths may be used as redirect targets. */
export function safeNext(value: string) {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

/** Gives the browser its vault id cookie the first time it uses account switching. */
export function withBrowser(response: NextResponse, request: NextRequest, browserId: string) {
  if (!request.cookies.has(BROWSER_COOKIE)) {
    response.cookies.set(BROWSER_COOKIE, browserId, { ...SESSION_COOKIE_OPTS, httpOnly: true });
  }
  return response;
}
