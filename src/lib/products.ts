import 'server-only';
import { z } from 'zod';
import { pool } from '@/lib/db';
import type { PoolClient } from 'pg';
import type { SearchFilters } from '@/lib/ai';
import { isProperty } from '@/lib/format';

export type Listing = {
  id: string;
  title: string;
  brand: string;
  model: string;
  category: string;
  price: number;
  condition: string | null;
  location: string;
  createdAt: string;
  image: string;
  images: string[];
  seller: string;
  sellerId: string | null;
  description: string;
  isSample: boolean;
  status: string;
  listingType: string;
  stockQty: number;
  property: PropertyDetails | null;
};

export const propertySchema = z.object({
  propertyType: z.enum(['HDB', 'Condo', 'Landed', 'Commercial', 'Room']).default('HDB'),
  bedrooms: z.coerce.number().int().min(0).max(20).optional(),
  bathrooms: z.coerce.number().int().min(0).max(20).optional(),
  floorAreaSqft: z.coerce.number().positive().max(100000).optional(),
  tenure: z.string().max(40).optional(),
  district: z.string().max(80).optional(),
  furnishing: z.enum(['Unfurnished', 'Partially furnished', 'Fully furnished']).optional(),
  availableFrom: z.string().max(20).optional(),
});
export type PropertyDetails = z.infer<typeof propertySchema>;

export const listingSchema = z.object({
  title: z.string().trim().min(3).max(140),
  brand: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(60),
  price: z.coerce.number().positive().max(100_000_000),
  condition: z.enum(['New', 'Like new', 'Good', 'Fair']).nullable().optional(),
  location: z.string().trim().max(80).default('Singapore'),
  description: z.string().trim().max(5000).default(''),
  listingType: z.enum(['goods', 'trade_in', 'property_sale', 'property_rent']).default('goods'),
  stockQty: z.coerce.number().int().min(0).max(10000).default(1),
  images: z.array(z.url()).max(4).default([]),
  property: propertySchema.nullable().optional(),
  status: z.enum(['draft', 'active']).default('active'),
});
export type ListingInput = z.infer<typeof listingSchema>;

export const LISTING_COLUMNS = `p.id, p.title, p.brand, p.model, p.category, p.price_sgd::float8 AS price, p.condition, p.location,
  p.created_at AS "createdAt", p.image_url AS image, p.seller_display_name AS seller, p.seller_id AS "sellerId",
  p.description, p.is_sample AS "isSample", p.status, p.listing_type AS "listingType", p.stock_qty AS "stockQty", p.property,
  COALESCE((SELECT array_agg(i.url ORDER BY i.sort_order) FROM product_images i WHERE i.product_id = p.id), ARRAY[]::text[]) AS images`;

export async function getListing(id: string): Promise<Listing | null> {
  const { rows } = await pool.query<Listing>(`SELECT ${LISTING_COLUMNS} FROM products p WHERE p.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listingsBySeller(sellerId: string): Promise<Listing[]> {
  const { rows } = await pool.query<Listing>(`SELECT ${LISTING_COLUMNS} FROM products p WHERE p.seller_id = $1 AND p.status <> 'removed' ORDER BY p.created_at DESC`, [sellerId]);
  return rows;
}

/** Builds the structured-filter WHERE clause shared by search and autocomplete. */
export function filterClause(f: Omit<SearchFilters, 'q'> & { id?: string }, params: unknown[]) {
  const where: string[] = [];
  const add = (sql: string, value: unknown) => { params.push(value); where.push(sql.replaceAll('?', `$${params.length}`)); };
  if (f.id) add('p.id = ?', f.id);
  if (f.brand) add('lower(p.brand) = lower(?)', f.brand);
  if (f.model) add('p.model ILIKE ? || \'%\'', f.model);
  if (f.category) add('lower(p.category) = lower(?)', f.category);
  if (f.location) add('lower(p.location) LIKE \'%\' || lower(?) || \'%\'', f.location);
  if (f.condition) add('p.condition = ?', f.condition);
  if (f.listingType) add('p.listing_type = ?', f.listingType);
  if (f.minPrice !== undefined) add('p.price_sgd >= ?', f.minPrice);
  if (f.maxPrice !== undefined) add('p.price_sgd <= ?', f.maxPrice);
  return where.length ? ` AND ${where.join(' AND ')}` : '';
}

/** Normalises listing-type specific fields: property has no condition and a single unit. */
export function normaliseListing(input: ListingInput) {
  const property = isProperty(input.listingType);
  return {
    ...input,
    condition: property ? null : (input.condition ?? 'Good'),
    stockQty: property ? 1 : input.stockQty,
    property: property ? (input.property ?? { propertyType: 'HDB' as const }) : null,
  };
}

export async function saveImages(client: PoolClient, productId: string, images: string[]) {
  await client.query('DELETE FROM product_images WHERE product_id = $1', [productId]);
  for (const [i, url] of images.entries()) {
    await client.query('INSERT INTO product_images (product_id, url, sort_order) VALUES ($1,$2,$3)', [productId, url, i]);
  }
}

