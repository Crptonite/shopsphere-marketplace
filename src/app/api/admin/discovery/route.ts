import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { apiUser, jsonError, serverError } from '@/lib/api';
import { discoverProducts } from '@/lib/serp';
import { invalidate } from '@/lib/redis';

export const runtime = 'nodejs';

async function admin() {
  const auth = await apiUser();
  if ('response' in auth) return auth;
  if (!auth.user.isAdmin) return { response: jsonError('Admins only.', 403) };
  return auth;
}

export async function GET() {
  const auth = await admin();
  if ('response' in auth) return auth.response;
  const { rows } = await pool.query(
    `SELECT id::int, query, title, price_text AS "priceText", thumbnail, merchant, source_url AS "sourceUrl", retrieved_at AS "retrievedAt"
     FROM external_products ORDER BY retrieved_at DESC LIMIT 100`);
  return NextResponse.json({ items: rows });
}

export async function POST(request: NextRequest) {
  const auth = await admin();
  if ('response' in auth) return auth.response;
  const parsed = z.object({ query: z.string().trim().min(2).max(120) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('Enter a search query.');
  try {
    const count = await discoverProducts(parsed.data.query);
    await invalidate('search:');
    return NextResponse.json({ stored: count });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not configured')) return jsonError(error.message, 503);
    return serverError('Discovery failed', error);
  }
}
