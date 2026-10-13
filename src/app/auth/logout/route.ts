import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

/** Signs the current user out, then returns to `?to=` (relative paths only) or the home page. */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  await supabase?.auth.signOut();
  const to = request.nextUrl.searchParams.get('to') ?? '/';
  const safe = to.startsWith('/') && !to.startsWith('//') ? to : '/';
  return NextResponse.redirect(new URL(safe, request.url), { status: 303 });
}
