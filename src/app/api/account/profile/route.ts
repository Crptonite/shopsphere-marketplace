import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { apiUser, jsonError, serverError } from '@/lib/api';
import { createSupabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const schema = z.object({ displayName: z.string().trim().min(2, 'Name must be 2–80 characters.').max(80, 'Name must be 2–80 characters.') });

/** Changes the signed-in user's display name in Neon and in the Supabase login metadata. */
export async function POST(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid name.');
  const displayName = parsed.data.displayName;
  try {
    const { rows } = await pool.query<{ display_name: string }>('UPDATE users SET display_name = $2 WHERE id = $1 RETURNING display_name', [auth.user.id, displayName]);
    if (!rows[0]) return jsonError('Account not found.', 404);
    const supabase = createSupabaseAdmin();
    if (supabase) {
      const { error } = await supabase.auth.admin.updateUserById(auth.user.id, { user_metadata: { full_name: displayName } });
      if (error) console.error('Could not update login metadata:', error.message);
    }
    return NextResponse.json({ displayName: rows[0].display_name });
  } catch (error) {
    return serverError('Profile update failed', error);
  }
}
