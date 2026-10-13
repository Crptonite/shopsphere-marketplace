import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { apiUser, jsonError, serverError } from '@/lib/api';
import { getConversation, getMessages, markRead, postMessage, setArchived } from '@/lib/chats';
import { notify } from '@/lib/notify';
import { announceChat } from '@/lib/realtime';
import { dateTime, isProperty, money2 } from '@/lib/format';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const c = await getConversation(id, auth.user.id);
  if (!c) return jsonError('Not found.', 404);
  const after = Number(request.nextUrl.searchParams.get('after') ?? 0) || 0;
  const messages = await getMessages(id, after);
  if (messages.length) await markRead(c);
  return NextResponse.json({ messages });
}

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), body: z.string().trim().min(1).max(5000) }),
  z.object({ type: z.literal('offer'), tradeItem: z.string().trim().min(2).max(300), cashDiff: z.coerce.number().min(-1_000_000).max(1_000_000) }),
  z.object({ type: z.literal('viewing'), slot: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date') }),
  z.object({ type: z.literal('archive'), archived: z.boolean() }),
  z.object({ type: z.literal('delete'), messageId: z.coerce.number().int().positive() }),
  z.object({ type: z.literal('file'), url: z.string().url().max(500), name: z.string().trim().min(1).max(200) }),
  z.object({ type: z.literal('respond'), target: z.enum(['offer', 'viewing']), targetId: z.string().min(1), accept: z.boolean() }),
]);

/** Send a message, make a trade-in offer, request a viewing, or (seller) respond to one. */
export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await apiUser();
  if ('response' in auth) return auth.response;
  const c = await getConversation(id, auth.user.id);
  if (!c) return jsonError('Not found.', 404);
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('Invalid message.');
  const a = parsed.data;
  const me = auth.user.id;

  try {
    if (a.type === 'archive') {
      await setArchived(c, a.archived);
    } else if (a.type === 'delete') {
      const result = await pool.query(
        `UPDATE messages SET deleted_at = now()
         WHERE id = $1 AND conversation_id = $2 AND sender_id = $3 AND kind = 'text' AND deleted_at IS NULL`,
        [a.messageId, c.id, me]);
      if (!result.rowCount) return jsonError('You can only delete your own text messages.', 403);
      await announceChat(id);
    } else if (a.type === 'text') {
      await postMessage(c, me, a.body);
    } else if (a.type === 'file') {
      // Only files uploaded by this user (their storage folder) can be attached.
      if (!a.url.includes('/storage/v1/object/public/') || !a.url.includes(`/${me}/`)) return jsonError('Attach a file you uploaded.', 403);
      await postMessage(c, me, a.name, 'file', { url: a.url, name: a.name });
    } else if (a.type === 'offer') {
      if (c.role !== 'buyer' || !c.productId) return jsonError('Only the buyer can make an offer on a listing.');
      if (c.productType !== 'trade_in' && c.productType !== 'goods') return jsonError('Trade-in offers are for item listings.');
      const offerId = crypto.randomUUID();
      await pool.query('INSERT INTO offers (id, product_id, buyer_id, conversation_id, trade_item, cash_diff_sgd) VALUES ($1,$2,$3,$4,$5,$6)',
        [offerId, c.productId, me, c.id, a.tradeItem, a.cashDiff]);
      const cash = a.cashDiff === 0 ? 'straight swap' : a.cashDiff > 0 ? `plus ${money2(a.cashDiff)} cash from me` : `plus ${money2(-a.cashDiff)} cash from you`;
      await postMessage(c, me, `Trade-in offer: my ${a.tradeItem}, ${cash}.`, 'offer', { offerId, tradeItem: a.tradeItem, cashDiff: a.cashDiff, status: 'pending' });
    } else if (a.type === 'viewing') {
      if (c.role !== 'buyer' || !c.productId || !isProperty(c.productType ?? '')) return jsonError('Viewings can be requested on property listings.');
      const slot = new Date(a.slot);
      if (slot.getTime() < Date.now()) return jsonError('Choose a future time.');
      const viewingId = crypto.randomUUID();
      await pool.query('INSERT INTO viewings (id, product_id, requester_id, conversation_id, slot) VALUES ($1,$2,$3,$4,$5)', [viewingId, c.productId, me, c.id, slot]);
      await postMessage(c, me, `Viewing request for ${dateTime(slot)}.`, 'viewing', { viewingId, slot: slot.toISOString(), status: 'requested' });
    } else {
      if (c.role !== 'seller') return jsonError('Only the seller can respond.', 403);
      const table = a.target === 'offer' ? 'offers' : 'viewings';
      const pendingStatus = a.target === 'offer' ? 'pending' : 'requested';
      const status = a.accept ? (a.target === 'offer' ? 'accepted' : 'confirmed') : 'declined';
      const updated = await pool.query(`UPDATE ${table} SET status = $3 WHERE id = $1 AND conversation_id = $2 AND status = $4 RETURNING id`,
        [a.targetId, c.id, status, pendingStatus]);
      if (!updated.rowCount) return jsonError('This request was already answered.', 409);
      const key = a.target === 'offer' ? 'offerId' : 'viewingId';
      await pool.query(`UPDATE messages SET meta = jsonb_set(meta, '{status}', to_jsonb($3::text)) WHERE conversation_id = $1 AND meta->>'${key}' = $2`, [c.id, a.targetId, status]);
      await postMessage(c, me, `${a.target === 'offer' ? 'Offer' : 'Viewing'} ${status}.`, 'system');
      await notify({ userId: c.buyerId, type: a.target, title: `Your ${a.target} was ${status}`, link: `/chats/${c.id}` });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError('Chat action failed', error);
  }
}
