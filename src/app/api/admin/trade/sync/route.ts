import { NextResponse } from 'next/server';
import { tx } from '@/lib/db';
import { apiAdmin, serverError } from '@/lib/api';
import { embed } from '@/lib/ai';
import { upsertStockVectors } from '@/lib/pinecone';
import { SAMPLE_STOCKS, type SampleStock } from '@/lib/sample-stocks';

export const runtime = 'nodejs';

const describe = (s: SampleStock) =>
  `${s.ticker} ${s.name}, ${s.sector}. P/E ${s.pe}, P/B ${s.pb}, dividend yield ${s.dividendYield}%, revenue growth ${s.revenueGrowth}%, ROA ${s.roa}%, debt-to-equity ${s.debtToEquity}.`;

/**
 * Admin only. Writes the stock catalogue to Neon and one embedding per stock to Pinecone.
 * Replace SAMPLE_STOCKS with the market-data provider's feed once it is connected.
 */
export async function POST() {
  const auth = await apiAdmin();
  if ('response' in auth) return auth.response;
  try {
    await tx(async (client) => {
      for (const s of SAMPLE_STOCKS) {
        await client.query(
          `INSERT INTO trade_stocks (ticker, name, sector, data, updated_at) VALUES ($1,$2,$3,$4,now())
           ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, sector = EXCLUDED.sector, data = EXCLUDED.data, updated_at = now()`,
          [s.ticker, s.name, s.sector, JSON.stringify(s)],
        );
      }
    });
    const vectors: { ticker: string; values: number[]; metadata: Record<string, string | number> }[] = [];
    for (const s of SAMPLE_STOCKS) {
      const values = await embed(describe(s));
      if (values) vectors.push({ ticker: s.ticker, values, metadata: { name: s.name, sector: s.sector } });
    }
    const indexed = await upsertStockVectors(vectors);
    return NextResponse.json({ stocks: SAMPLE_STOCKS.length, indexed });
  } catch (error) {
    return serverError('Trade sync failed', error);
  }
}
