import 'server-only';
import { pool } from '@/lib/db';
import { notify } from '@/lib/notify';
import { announceChat } from '@/lib/realtime';

export type Conversation = {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string | null;
  productTitle: string | null;
  productImage: string | null;
  productType: string | null;
  otherName: string;
  role: 'buyer' | 'seller';
  lastMessage: string | null;
  lastMessageAt: string;
  unread: boolean;
  archived: boolean;
};

export type InboxFilter = 'inbox' | 'selling' | 'buying' | 'archived' | 'unread';

export type ChatMessage = { id: number; senderId: string; body: string; kind: string; meta: Record<string, unknown> | null; createdAt: string };

const CONVERSATION_SELECT = `
  SELECT c.id, c.buyer_id AS "buyerId", c.seller_id AS "sellerId", c.product_id AS "productId",
         p.title AS "productTitle", p.image_url AS "productImage", p.listing_type AS "productType",
         CASE WHEN c.buyer_id = $1 THEN s.display_name ELSE b.display_name END AS "otherName",
         CASE WHEN c.buyer_id = $1 THEN 'buyer' ELSE 'seller' END AS role,
         (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS "lastMessage",
         c.last_message_at AS "lastMessageAt",
         EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> $1
                 AND m.created_at > COALESCE(CASE WHEN c.buyer_id = $1 THEN c.buyer_read_at ELSE c.seller_read_at END, 'epoch')) AS unread,
         CASE WHEN c.buyer_id = $1 THEN c.buyer_archived ELSE c.seller_archived END AS archived
  FROM conversations c
  JOIN users b ON b.id = c.buyer_id JOIN users s ON s.id = c.seller_id
  LEFT JOIN products p ON p.id = c.product_id`;

export async function listConversations(userId: string, filter: InboxFilter = 'inbox', search = ''): Promise<Conversation[]> {
  const { rows } = await pool.query<Conversation>(
    `SELECT * FROM (${CONVERSATION_SELECT} WHERE c.buyer_id = $1 OR c.seller_id = $1) t
     WHERE CASE $2
       WHEN 'archived' THEN archived
       WHEN 'selling' THEN role = 'seller' AND NOT archived
       WHEN 'buying' THEN role = 'buyer' AND NOT archived
       WHEN 'unread' THEN unread
       ELSE NOT archived END
       AND ($3 = '' OR "otherName" ILIKE '%' || $3 || '%' OR "productTitle" ILIKE '%' || $3 || '%')
     ORDER BY "lastMessageAt" DESC LIMIT 100`, [userId, filter, search.trim()]);
  return rows;
}

export async function setArchived(c: Conversation, archived: boolean) {
  const column = c.role === 'buyer' ? 'buyer_archived' : 'seller_archived';
  await pool.query(`UPDATE conversations SET ${column} = $2 WHERE id = $1`, [c.id, archived]);
}

/** Returns the conversation only if userId is a participant. */
export async function getConversation(id: string, userId: string): Promise<Conversation | null> {
  const { rows } = await pool.query<Conversation>(`${CONVERSATION_SELECT} WHERE c.id = $2 AND (c.buyer_id = $1 OR c.seller_id = $1)`, [userId, id]);
  return rows[0] ?? null;
}

export async function getMessages(conversationId: string, afterId = 0): Promise<ChatMessage[]> {
  const { rows } = await pool.query<ChatMessage>(
    `SELECT id::int, sender_id AS "senderId",
       CASE WHEN deleted_at IS NOT NULL THEN 'Message deleted' ELSE body END AS body,
       CASE WHEN deleted_at IS NOT NULL THEN 'system' ELSE kind END AS kind,
       CASE WHEN deleted_at IS NOT NULL THEN NULL ELSE meta END AS meta,
       created_at AS "createdAt"
     FROM messages
     WHERE conversation_id = $1
       AND (id > $2 OR (deleted_at IS NOT NULL AND deleted_at > now() - interval '5 minutes'))
     ORDER BY id LIMIT 500`,
    [conversationId, afterId],
  );
  return rows;
}

export async function markRead(c: Conversation) {
  const column = c.role === 'buyer' ? 'buyer_read_at' : 'seller_read_at';
  await pool.query(`UPDATE conversations SET ${column} = now() WHERE id = $1`, [c.id]);
}

export async function postMessage(c: Conversation, senderId: string, body: string, kind = 'text', meta: Record<string, unknown> | null = null) {
  const { rows } = await pool.query<{ id: number }>(
    'INSERT INTO messages (conversation_id, sender_id, body, kind, meta) VALUES ($1,$2,$3,$4,$5) RETURNING id::int', [c.id, senderId, body, kind, meta]);
  await pool.query('UPDATE conversations SET last_message_at = now(), buyer_archived = false, seller_archived = false WHERE id = $1', [c.id]);
  await markRead(c);
  await announceChat(c.id);
  if (kind === 'system') return rows[0].id;
  const recipient = senderId === c.buyerId ? c.sellerId : c.buyerId;
  const title = kind === 'offer' ? 'New trade-in offer' : kind === 'viewing' ? 'New viewing request' : 'New message';
  await notify({ userId: recipient, type: kind === 'offer' ? 'offer' : kind === 'viewing' ? 'viewing' : 'message', title, body: body.slice(0, 140), link: `/chats/${c.id}` });
  return rows[0].id;
}

/** Finds or creates the buyer↔seller thread for a listing. */
export async function openConversation(buyerId: string, productId: string): Promise<{ id: string } | { error: string }> {
  const { rows } = await pool.query<{ seller_id: string | null }>(
    `SELECT p.seller_id FROM products p JOIN users u ON u.id = p.seller_id WHERE p.id = $1 AND p.status <> 'removed'`, [productId]);
  const sellerId = rows[0]?.seller_id;
  if (!sellerId) return { error: 'This listing has no seller account to message (sample listings cannot be contacted).' };
  if (sellerId === buyerId) return { error: 'This is your own listing.' };
  const result = await pool.query<{ id: string }>(
    `INSERT INTO conversations (id, buyer_id, seller_id, product_id) VALUES ($1,$2,$3,$4)
     ON CONFLICT (buyer_id, seller_id, coalesce(product_id, '')) DO UPDATE SET buyer_id = EXCLUDED.buyer_id RETURNING id`,
    [crypto.randomUUID(), buyerId, sellerId, productId],
  );
  return { id: result.rows[0].id };
}

export async function unreadChats(userId: string): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM conversations c WHERE (c.buyer_id = $1 OR c.seller_id = $1) AND EXISTS (
       SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> $1
       AND m.created_at > COALESCE(CASE WHEN c.buyer_id = $1 THEN c.buyer_read_at ELSE c.seller_read_at END, 'epoch'))`, [userId]);
  return rows[0]?.n ?? 0;
}
