import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiUser, jsonError, serverError } from '@/lib/api';
import { askOpenRouter } from '@/lib/openrouter';
import { features } from '@/lib/env';

export const runtime = 'nodejs';

const bodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(2000),
  })).min(1).max(20),
});

/** Signed-in users only. The last messages are sent to OpenRouter; nothing is stored. */
export async function POST(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  if (!features.openrouter) return jsonError('AI chat is not configured yet (OPENROUTER_API_KEY).', 503);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('Send a message of up to 2000 characters.');
  if (parsed.data.messages.at(-1)?.role !== 'user') return jsonError('The last message must be from you.');
  try {
    const reply = await askOpenRouter(parsed.data.messages.slice(-12));
    return NextResponse.json({ reply });
  } catch (error) {
    return serverError('AI chat failed', error);
  }
}
