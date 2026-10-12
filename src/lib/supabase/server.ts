import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { env, features } from '@/lib/env';

/** Cookie-bound Supabase client for server components, route handlers and actions. */
export async function createSupabaseServer() {
  if (!features.auth) return null;
  const store = await cookies();
  return createServerClient(env.SUPABASE_URL!, env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, options);
        } catch {
          // Server components cannot set cookies; middleware refreshes the session instead.
        }
      },
    },
  });
}

/** Service-role client for Storage uploads. Never expose to the browser. */
export function createSupabaseAdmin() {
  if (!features.storage) return null;
  return createAdminClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}
