import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiUser, jsonError, serverError } from '@/lib/api';
import { getConversation, listConversations, openConversation, postMessage } from '@/lib/chats';

export const runtime = 'nodejs';

const FILTERS = ['inbox', 'selling', 'buying', 'archived', 'unread'] as const;

export async function GET(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const f = request.nextUrl.searchParams.get('filter');
  const filter = FILTERS.find((x) => x === f) ?? 'inbox';
  return NextResponse.json({ conversations: await listConversations(auth.user.id, filter, request.nextUrl.searchParams.get('q') ?? '') });
}

const startSchema = z.object({ productId: z.string().min(1), message: z.string().trim().max(5000).optional() });

/** Opens (or reuses) a thread with the seller of a listing, optionally sending a first message. */
export async function POST(request: NextRequest) {
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const parsed = startSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('Invalid request.');
  try {
    const opened = await openConversation(auth.user.id, parsed.data.productId);
    if ('error' in opened) return jsonError(opened.error);
    if (parsed.data.message) {
      const c = await getConversation(opened.id, auth.user.id);
      if (c) await postMessage(c, auth.user.id, parsed.data.message);
    }
    return NextResponse.json({ id: opened.id }, { status: 201 });
  } catch (error) {
    return serverError('Open conversation failed', error);
  }
}
