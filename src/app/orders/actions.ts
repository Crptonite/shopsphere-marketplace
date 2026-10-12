'use server';

import { revalidatePath } from 'next/cache';
import { pool } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { notify } from '@/lib/notify';

/** Seller marks a paid order shipped (single-seller orders); buyer marks it received. */
export async function updateOrderStatus(form: FormData) {
  const user = await requireUser('/orders');
  const id = String(form.get('id'));
  const status = String(form.get('status'));
  if (status === 'shipped') {
    const { rows } = await pool.query<{ buyer_id: string }>(
      `UPDATE orders o SET status = 'shipped' WHERE o.id = $1 AND o.status = 'paid'
         AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.seller_id = $2)
         AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.seller_id IS DISTINCT FROM $2)
       RETURNING o.buyer_id`, [id, user.id]);
    if (rows[0]) await notify({ userId: rows[0].buyer_id, type: 'order', title: 'Your order has shipped', body: `Order ${id.slice(0, 8)}`, link: '/orders' });
  } else if (status === 'completed') {
    await pool.query(`UPDATE orders SET status = 'completed' WHERE id = $1 AND buyer_id = $2 AND status IN ('paid','shipped')`, [id, user.id]);
  }
  revalidatePath('/orders');
}
