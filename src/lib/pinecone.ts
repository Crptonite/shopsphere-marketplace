import 'server-only';
import { Pinecone } from '@pinecone-database/pinecone';
import { env, features } from '@/lib/env';

/** Pinecone holds one vector per stock for semantic search. Neon remains the source of truth. */
function index() {
  if (!features.pinecone) return null;
  return new Pinecone({ apiKey: env.PINECONE_API_KEY! }).index(env.PINECONE_INDEX);
}

export async function upsertStockVectors(items: { ticker: string; values: number[]; metadata: Record<string, string | number> }[]) {
  const idx = index();
  if (!idx || items.length === 0) return 0;
  await idx.upsert(items.map((i) => ({ id: `stock:${i.ticker}`, values: i.values, metadata: i.metadata })));
  return items.length;
}

/** Tickers whose stored vectors are closest to the query vector. */
export async function similarStockTickers(vector: number[], topK = 10): Promise<string[]> {
  const idx = index();
  if (!idx) return [];
  const res = await idx.query({ vector, topK });
  return (res.matches ?? []).map((m) => m.id.replace('stock:', ''));
}
