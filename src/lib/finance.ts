import 'server-only';
import { pool } from '@/lib/db';
import { getQuote, usdToSgd } from '@/lib/quotes';

export type LedgerRow = {
  id: number; kind: string; amount: number; balanceBefore: number; balanceAfter: number;
  description: string; category: string | null; availableAt: string; createdAt: string;
};

export async function cashBalance(userId: string): Promise<number> {
  const { rows } = await pool.query<{ b: number }>('SELECT balance_sgd::float8 AS b FROM wallets WHERE user_id = $1', [userId]);
  return rows[0]?.b ?? 0;
}

export async function ledger(userId: string, limit = 100): Promise<LedgerRow[]> {
  const { rows } = await pool.query<LedgerRow>(
    `SELECT id::int, kind, amount_sgd::float8 AS amount, balance_before::float8 AS "balanceBefore", balance_after::float8 AS "balanceAfter",
            description, category, available_at AS "availableAt", created_at AS "createdAt"
     FROM ledger_entries WHERE user_id = $1 ORDER BY id DESC LIMIT $2`, [userId, limit]);
  return rows;
}

/** Spending = verified purchases minus refunds (both come only from Stripe webhooks). */
export async function spendingSummary(userId: string) {
  const { rows } = await pool.query<{ month: number; year: number; lifetime: number; refunds: number; orders: number }>(
    `SELECT
       COALESCE(-SUM(amount_sgd) FILTER (WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore'), 0)::float8 AS month,
       COALESCE(-SUM(amount_sgd) FILTER (WHERE created_at >= date_trunc('year', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore'), 0)::float8 AS year,
       COALESCE(-SUM(amount_sgd), 0)::float8 AS lifetime,
       COALESCE(SUM(amount_sgd) FILTER (WHERE kind = 'refund'), 0)::float8 AS refunds,
       COUNT(*) FILTER (WHERE kind = 'purchase')::int AS orders
     FROM ledger_entries WHERE user_id = $1 AND kind IN ('purchase','refund')`, [userId]);
  return rows[0];
}

/** Net spend per month (Singapore time) for the last 12 months, zero-filled. */
export async function monthlySpending(userId: string) {
  const { rows } = await pool.query<{ month: string; spent: number; refunded: number }>(
    `WITH months AS (
       SELECT generate_series(date_trunc('month', now() AT TIME ZONE 'Asia/Singapore') - interval '11 months',
                              date_trunc('month', now() AT TIME ZONE 'Asia/Singapore'), interval '1 month') AS m)
     SELECT to_char(months.m, 'Mon YY') AS month,
            COALESCE(-SUM(l.amount_sgd) FILTER (WHERE l.kind = 'purchase'), 0)::float8 AS spent,
            COALESCE(SUM(l.amount_sgd) FILTER (WHERE l.kind = 'refund'), 0)::float8 AS refunded
     FROM months LEFT JOIN ledger_entries l ON l.user_id = $1 AND l.kind IN ('purchase','refund')
       AND date_trunc('month', l.created_at AT TIME ZONE 'Asia/Singapore') = months.m
     GROUP BY months.m ORDER BY months.m`, [userId]);
  return rows;
}

export async function spendingByCategory(userId: string) {
  const { rows } = await pool.query<{ category: string; spent: number }>(
    `SELECT p.category, SUM(oi.unit_price_sgd * oi.quantity * (1 - o.refunded_sgd / NULLIF(o.total_sgd, 0)))::float8 AS spent
     FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id
     WHERE o.buyer_id = $1 AND o.status IN ('paid','processing','shipped','completed','refunded')
     GROUP BY p.category HAVING SUM(oi.unit_price_sgd * oi.quantity * (1 - o.refunded_sgd / NULLIF(o.total_sgd, 0))) > 0
     ORDER BY spent DESC`, [userId]);
  return rows;
}

/** Seller earnings: sales minus reversals, split into pending (hold window) and available, minus payouts. */
export async function sellerBalance(userId: string) {
  const { rows } = await pool.query<{ earned: number; pending: number; matured: number; paidOut: number; lifetimeSales: number }>(
    `SELECT
       COALESCE(SUM(amount_sgd), 0)::float8 AS earned,
       COALESCE(SUM(amount_sgd) FILTER (WHERE kind = 'sale' AND available_at > now()), 0)::float8 AS pending,
       COALESCE(SUM(amount_sgd) FILTER (WHERE kind = 'sale_reversal' OR available_at <= now()), 0)::float8 AS matured,
       (SELECT COALESCE(SUM(amount_sgd), 0)::float8 FROM payouts WHERE user_id = $1 AND status <> 'failed') AS "paidOut",
       COALESCE(SUM(amount_sgd) FILTER (WHERE kind = 'sale'), 0)::float8 AS "lifetimeSales"
     FROM ledger_entries WHERE user_id = $1 AND kind IN ('sale','sale_reversal')`, [userId]);
  const r = rows[0];
  const available = Math.max(0, Math.round((r.matured - r.paidOut) * 100) / 100);
  return { pending: r.pending, available, paidOut: r.paidOut, lifetimeSales: r.lifetimeSales, net: r.earned };
}

export type HoldingView = { id: number; symbol: string; quantity: number; avgCost: number; currency: string; price: number | null; valueSgd: number | null; gainPct: number | null; source: string | null };
export type PropertyView = { id: number; name: string; purchasePrice: number; estValue: number; loan: number; equity: number; valuationDate: string; valueSource: string };

export async function holdings(userId: string): Promise<{ items: HoldingView[]; totalSgd: number; fxEstimated: boolean; missingQuotes: boolean }> {
  const { rows } = await pool.query<{ id: number; symbol: string; quantity: number; avgCost: number; currency: string }>(
    `SELECT id::int, symbol, quantity::float8, avg_cost::float8 AS "avgCost", currency FROM holdings WHERE user_id = $1 ORDER BY symbol`, [userId]);
  const fx = await usdToSgd();
  let total = 0;
  let missing = false;
  const items = await Promise.all(rows.map(async (h) => {
    const q = await getQuote(h.symbol);
    if (!q) { missing = true; return { ...h, price: null, valueSgd: null, gainPct: null, source: null }; }
    const rate = h.currency === 'SGD' ? 1 : fx.rate;
    const valueSgd = Math.round(q.price * h.quantity * rate * 100) / 100;
    total += valueSgd;
    return { ...h, price: q.price, valueSgd, gainPct: h.avgCost > 0 ? ((q.price - h.avgCost) / h.avgCost) * 100 : null, source: q.source };
  }));
  return { items, totalSgd: Math.round(total * 100) / 100, fxEstimated: fx.estimated, missingQuotes: missing };
}

export async function properties(userId: string): Promise<{ items: PropertyView[]; equitySgd: number }> {
  const { rows } = await pool.query<PropertyView>(
    `SELECT id::int, name, purchase_price_sgd::float8 AS "purchasePrice", est_value_sgd::float8 AS "estValue",
            outstanding_loan_sgd::float8 AS loan, (est_value_sgd - outstanding_loan_sgd)::float8 AS equity,
            valuation_date::text AS "valuationDate", value_source AS "valueSource"
     FROM property_assets WHERE user_id = $1 ORDER BY id`, [userId]);
  return { items: rows, equitySgd: rows.reduce((s, p) => s + p.equity, 0) };
}

/** Records today's net-worth snapshot (one per day, last write wins) and returns history. */
export async function snapshotNetWorth(userId: string, cash: number, stocks: number, property: number) {
  await pool.query(
    `INSERT INTO networth_snapshots (user_id, snapshot_date, cash_sgd, stocks_sgd, property_sgd)
     VALUES ($1, (now() AT TIME ZONE 'Asia/Singapore')::date, $2, $3, $4)
     ON CONFLICT (user_id, snapshot_date) DO UPDATE SET cash_sgd = EXCLUDED.cash_sgd, stocks_sgd = EXCLUDED.stocks_sgd, property_sgd = EXCLUDED.property_sgd`,
    [userId, cash, stocks, property]);
  const { rows } = await pool.query<{ date: string; cash: number; stocks: number; property: number }>(
    `SELECT to_char(snapshot_date, 'DD Mon') AS date, cash_sgd::float8 AS cash, stocks_sgd::float8 AS stocks, property_sgd::float8 AS property
     FROM networth_snapshots WHERE user_id = $1 ORDER BY snapshot_date DESC LIMIT 90`, [userId]);
  return rows.reverse();
}
