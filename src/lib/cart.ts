import 'server-only';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import type { AppUser } from '@/lib/auth';

export const GUEST_COOKIE = 'ss_cart';

export type CartLine = {
  productId: string;
  title: string;
  image: string;
  price: number;
  quantity: number;
  stockQty: number;
  status: string;
  listingType: string;
  sellerId: string | null;
  seller: string;
  isSample: boolean;
};

/**
 * Resolves the cart for this request. Signed-in users get their own cart; a guest cart
 * (session cookie) is merged into it on first sight and the cookie is cleared.
 * Only call from route handlers or server actions (it may set cookies).
 */
export async function resolveCartId(user: AppUser | null, create: boolean): Promise<string | null> {
  const store = await cookies();
  const guestSession = store.get(GUEST_COOKIE)?.value;

  if (user) {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO carts (id, user_id) VALUES ($1, $2) ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET user_id = EXCLUDED.user_id RETURNING id`,
      [crypto.randomUUID(), user.id],
    );
    const cartId = rows[0].id;
    if (guestSession) {
      const guest = await pool.query<{ id: string }>('SELECT id FROM carts WHERE session_id = $1 AND user_id IS NULL', [guestSession]);
      if (guest.rows[0]) {
        await pool.query(
          `INSERT INTO cart_items (cart_id, product_id, quantity)
           SELECT $1, product_id, quantity FROM cart_items WHERE cart_id = $2
           ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = GREATEST(cart_items.quantity, EXCLUDED.quantity)`,
          [cartId, guest.rows[0].id],
        );
        await pool.query('DELETE FROM carts WHERE id = $1', [guest.rows[0].id]);
      }
      store.delete(GUEST_COOKIE);
    }
    return cartId;
  }

  if (guestSession) {
    const { rows } = await pool.query<{ id: string }>('SELECT id FROM carts WHERE session_id = $1 AND user_id IS NULL', [guestSession]);
    if (rows[0]) return rows[0].id;
  }
  if (!create) return null;
  const session = guestSession ?? crypto.randomUUID();
  const id = crypto.randomUUID();
  await pool.query('INSERT INTO carts (id, session_id) VALUES ($1, $2)', [id, session]);
  store.set(GUEST_COOKIE, session, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return id;
}

export async function cartLines(cartId: string): Promise<CartLine[]> {
  const { rows } = await pool.query<CartLine>(
    `SELECT p.id AS "productId", p.title, p.price_sgd::float8 AS price, ci.quantity, p.stock_qty AS "stockQty", p.status,
            p.listing_type AS "listingType", p.seller_id AS "sellerId", p.seller_display_name AS seller, p.is_sample AS "isSample",
            COALESCE((SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY sort_order LIMIT 1), p.image_url) AS image
     FROM cart_items ci JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = $1 ORDER BY ci.id`,
    [cartId],
  );
  return rows;
}

/** Read-only cart count for headers (never creates or merges). */
export async function cartCount(user: AppUser | null): Promise<number> {
  try {
    const store = await cookies();
    const session = store.get(GUEST_COOKIE)?.value;
    const { rows } = await pool.query<{ n: number }>(
      `SELECT COALESCE(SUM(ci.quantity), 0)::int AS n FROM cart_items ci JOIN carts c ON c.id = ci.cart_id
       WHERE ($1::text IS NOT NULL AND c.user_id = $1) OR ($2::text IS NOT NULL AND c.session_id = $2 AND c.user_id IS NULL)`,
      [user?.id ?? null, session ?? null],
    );
    return rows[0]?.n ?? 0;
  } catch {
    return 0;
  }
}
