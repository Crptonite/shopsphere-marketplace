import 'server-only';
import { z } from 'zod';
import { env } from '@/lib/env';
import { cached } from '@/lib/redis';
import { createHash } from 'node:crypto';

export async function embed(text: string): Promise<number[] | null> {
  if (!env.OPENAI_API_KEY || !text.trim()) return null;
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: env.EMBEDDING_MODEL, input: text.slice(0, 8000) }),
      cache: 'no-store',
    });
    if (!response.ok) {
      console.error('Embedding provider returned', response.status);
      return null;
    }
    const payload = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
    return payload.data?.[0]?.embedding ?? null;
  } catch (e) {
    console.error('Embedding failed', e);
    return null;
  }
}

export const vectorLiteral = (v: number[] | null) => (v ? `[${v.join(',')}]` : null);

export const searchFiltersSchema = z.object({
  q: z.string().default(''),
  brand: z.string().optional(),
  model: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  condition: z.enum(['New', 'Like new', 'Good', 'Fair']).optional(),
  listingType: z.enum(['goods', 'trade_in', 'property_sale', 'property_rent']).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().positive().optional(),
});
export type SearchFilters = z.infer<typeof searchFiltersSchema>;

const SYSTEM = `You convert Singapore marketplace search queries into JSON filters.
Return ONLY a JSON object with these optional keys:
q (remaining free-text keywords, keep model names like "iPhone 17 Pro"), brand, model, category,
location (Singapore area e.g. "Tampines"), condition ("New"|"Like new"|"Good"|"Fair"),
listingType ("goods"|"trade_in"|"property_sale"|"property_rent"), minPrice, maxPrice (numbers in SGD).
Omit keys you are unsure about. "under 1500" => maxPrice 1500. "rent"/"for rent" condo/HDB => property_rent.`;

/** Groq query understanding. Falls back to plain keywords when Groq is unavailable. */
export async function parseQuery(query: string): Promise<SearchFilters> {
  const q = query.trim();
  if (!q || !env.GROQ_API_KEY) return { q };
  const key = `search:parse:${createHash('sha1').update(q.toLowerCase()).digest('hex')}`;
  return cached(key, 600, async () => {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: env.GROQ_MODEL,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: q }],
        }),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`Groq ${response.status}`);
      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const parsed = searchFiltersSchema.safeParse(JSON.parse(payload.choices?.[0]?.message?.content ?? '{}'));
      return parsed.success ? parsed.data : { q };
    } catch (e) {
      console.warn('Query parsing failed; using raw keywords', e);
      return { q };
    }
  });
}
