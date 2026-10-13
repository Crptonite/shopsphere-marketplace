import 'server-only';
import { hasDb, pool } from '@/lib/db';
import { SAMPLE_STOCKS, type SampleStock } from '@/lib/sample-stocks';

/** All stocks in the catalogue. Falls back to the sample list when no database is configured. */
export async function catalogue(): Promise<SampleStock[]> {
  if (!hasDb()) return SAMPLE_STOCKS;
  const { rows } = await pool.query<{ data: SampleStock }>('SELECT data FROM trade_stocks ORDER BY ticker');
  return rows.length ? rows.map((r) => r.data) : SAMPLE_STOCKS;
}

export async function stockByTicker(ticker: string): Promise<SampleStock | null> {
  const upper = ticker.toUpperCase();
  if (!hasDb()) return SAMPLE_STOCKS.find((s) => s.ticker === upper) ?? null;
  const { rows } = await pool.query<{ data: SampleStock }>('SELECT data FROM trade_stocks WHERE ticker = $1', [upper]);
  return rows[0]?.data ?? null;
}

export async function userSaves(userId: string): Promise<{ favourite: string[]; watchlist: string[] }> {
  if (!hasDb()) return { favourite: [], watchlist: [] };
  const { rows } = await pool.query<{ ticker: string; kind: 'favourite' | 'watchlist' }>('SELECT ticker, kind FROM trade_saves WHERE user_id = $1', [userId]);
  return {
    favourite: rows.filter((r) => r.kind === 'favourite').map((r) => r.ticker),
    watchlist: rows.filter((r) => r.kind === 'watchlist').map((r) => r.ticker),
  };
}

export type PositionRow = { id: number; ticker: string; name: string; shares: number; avgCost: number; price: number };

export async function userPositions(userId: string): Promise<PositionRow[]> {
  if (!hasDb()) return [];
  const { rows } = await pool.query<PositionRow>(
    `SELECT p.id::int, p.ticker, s.name, p.shares::float8 AS shares, p.avg_cost::float8 AS "avgCost", (s.data->>'price')::float8 AS price
     FROM trade_positions p JOIN trade_stocks s ON s.ticker = p.ticker
     WHERE p.user_id = $1 ORDER BY p.opened_at, p.id`,
    [userId],
  );
  return rows;
}
