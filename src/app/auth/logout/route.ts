import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

/** Signs the current user out, then returns to the home page. */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  await supabase?.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
