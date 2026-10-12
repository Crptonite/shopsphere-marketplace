import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { resolveCartId } from '@/lib/cart';
import { hasDb } from '@/lib/db';

export const runtime = 'nodejs';

/** OAuth / email-confirmation callback: exchanges the code for a session cookie. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const nextParam = request.nextUrl.searchParams.get('next') ?? '/';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';
  const supabase = await createSupabaseServer();
  if (!code || !supabase) return NextResponse.redirect(new URL('/login?error=1', request.url));

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL('/login?error=1', request.url));

  // Mirror the user into Neon and merge any guest cart.
  if (hasDb()) {
    const user = await getCurrentUser().catch(() => null);
    if (user) await resolveCartId(user, false).catch(() => null);
  }
  return NextResponse.redirect(new URL(next, request.url));
}
