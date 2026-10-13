import 'server-only';
import { createSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Tells open chat windows that a conversation changed. The broadcast carries no message content:
 * clients re-fetch through the authenticated API, so only the signal is public.
 */
export async function announceChat(conversationId: string) {
  const admin = createSupabaseAdmin();
  if (!admin) return;
  try {
    const channel = admin.channel(`chat:${conversationId}`);
    await channel.send({ type: 'broadcast', event: 'changed', payload: {} });
    await admin.removeChannel(channel);
  } catch (error) {
    console.warn('[realtime] announce failed', error);
  }
}
