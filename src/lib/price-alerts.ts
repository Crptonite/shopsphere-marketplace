import 'server-only';
import { pool } from '@/lib/db';
import { money2 } from '@/lib/format';
import { notify } from '@/lib/notify';
import { discountPercent } from '@/lib/pricing';

/**
 * Tells everyone who liked a listing when its price goes down (not the seller).
 * Runs after a price update and never throws, so the seller's save always succeeds.
 */
export async function notifyPriceDrop(productId: string, title: string, oldPrice: number, newPrice: number, sellerId: string): Promise<number> {
  const percent = discountPercent(oldPrice, newPrice);
  if (percent <= 0) return 0;
  try {
    const { rows } = await pool.query<{ user_id: string }>(
      'SELECT user_id FROM likes WHERE product_id = $1 AND user_id <> $2',
      [productId, sellerId],
    );
    await Promise.all(rows.map((r) => notify({
      userId: r.user_id,
      type: 'price_drop',
      title: `Price drop: ${title}`,
      body: `Now ${money2(newPrice)}, was ${money2(oldPrice)} (${percent}% off).`,
      link: `/products/${productId}`,
    })));
    return rows.length;
  } catch (error) {
    console.error('price drop alert failed', error);
    return 0;
  }
}
