import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool, hasDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { jsonError, serverError } from '@/lib/api';
import { cartLines, resolveCartId } from '@/lib/cart';
import { isProperty } from '@/lib/format';

export const runtime = 'nodejs';

const itemSchema = z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().min(0).max(99).default(1) });

async function respond(cartId: string | null) {
  const items = cartId ? await cartLines(cartId) : [];
  const subtotal = items.reduce((sum, l) => sum + l.price * l.quantity, 0);
  return NextResponse.json({ items, subtotal, count: items.reduce((n, l) => n + l.quantity, 0) });
}

export async function GET() {
  if (!hasDb()) return NextResponse.json({ items: [], subtotal: 0, count: 0, message: 'Database is not configured.' });
  try {
    return await respond(await resolveCartId(await getCurrentUser(), false));
  } catch (error) {
    return serverError('Cart load failed', error);
  }
}

/** Add an item (quantity is added to any existing line). */
export async function POST(request: NextRequest) {
  if (!hasDb()) return jsonError('Database is not configured.', 503);
  const parsed = itemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('Invalid cart item.');
  try {
    const { rows } = await pool.query<{ status: string; stock_qty: number; listing_type: string; seller_id: string | null }>(
      'SELECT status, stock_qty, listing_type, seller_id FROM products WHERE id = $1', [parsed.data.productId]);
    const p = rows[0];
    if (!p || p.status !== 'active') return jsonError('This listing is not available.', 404);
    if (isProperty(p.listing_type)) return jsonError('Property listings are arranged through enquiries and viewings, not checkout.');
    if (p.stock_qty < 1) return jsonError('This item is out of stock.', 409);
    const user = await getCurrentUser();
    if (user && p.seller_id === user.id) return jsonError('You cannot buy your own listing.');

    const cartId = (await resolveCartId(user, true))!;
    await pool.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1,$2,$3)
       ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, $4)`,
      [cartId, parsed.data.productId, Math.max(1, Math.min(parsed.data.quantity, p.stock_qty)), p.stock_qty],
    );
    return await respond(cartId);
  } catch (error) {
    return serverError('Add to cart failed', error);
  }
}

/** Set a line's quantity; 0 removes it. */
export async function PATCH(request: NextRequest) {
  if (!hasDb()) return jsonError('Database is not configured.', 503);
  const parsed = itemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('Invalid cart item.');
  try {
    const cartId = await resolveCartId(await getCurrentUser(), false);
    if (!cartId) return respond(null);
    if (parsed.data.quantity === 0) {
      await pool.query('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cartId, parsed.data.productId]);
    } else {
      await pool.query(
        `UPDATE cart_items ci SET quantity = LEAST($3, p.stock_qty) FROM products p
         WHERE ci.cart_id = $1 AND ci.product_id = $2 AND p.id = ci.product_id AND p.stock_qty > 0`,
        [cartId, parsed.data.productId, parsed.data.quantity],
      );
    }
    return await respond(cartId);
  } catch (error) {
    return serverError('Cart update failed', error);
  }
}
