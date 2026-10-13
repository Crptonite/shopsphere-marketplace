import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { apiAdmin, serverError } from '@/lib/api';

export const runtime = 'nodejs';

/** Lists accounts for admins, optionally filtered by email, name or id. */
export async function GET(request: NextRequest) {
  const auth = await apiAdmin();
  if ('response' in auth) return auth.response;
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 100);
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.display_name AS "displayName", u.is_admin AS "isAdmin", u.created_at AS "createdAt",
              u.suspended_at AS "suspendedAt", u.deleted_at AS "deletedAt",
              (SELECT COUNT(*)::int FROM products p WHERE p.seller_id = u.id AND p.status <> 'removed') AS listings
       FROM users u
       WHERE $1 = '' OR u.email ILIKE '%' || $1 || '%' OR u.display_name ILIKE '%' || $1 || '%' OR u.id = $1
       ORDER BY u.created_at DESC LIMIT 100`,
      [q],
    );
    return NextResponse.json({ items: rows });
  } catch (error) {
    return serverError('Admin user list failed', error);
  }
}
