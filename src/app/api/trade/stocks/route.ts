import { NextRequest, NextResponse } from 'next/server';
import { embed } from '@/lib/ai';
import { features } from '@/lib/env';
import { similarStockTickers } from '@/lib/pinecone';
import { catalogue } from '@/lib/trade-data';

export const runtime = 'nodejs';

/** Stock list. With ?q=, uses Pinecone to find semantically similar stocks, otherwise matches name and ticker. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
  const all = await catalogue();
  if (!q) return NextResponse.json({ stocks: all });
  if (features.pinecone) {
    const vector = await embed(q);
    if (vector) {
      const tickers = new Set(await similarStockTickers(vector, 10));
      return NextResponse.json({ stocks: all.filter((s) => tickers.has(s.ticker)), search: 'semantic' });
    }
  }
  const lower = q.toLowerCase();
  return NextResponse.json({ stocks: all.filter((s) => `${s.ticker} ${s.name} ${s.sector}`.toLowerCase().includes(lower)), search: 'text' });
}
