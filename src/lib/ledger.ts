import 'server-only';
import type { PoolClient } from 'pg';

export type LedgerKind = 'purchase' | 'sale' | 'refund' | 'sale_reversal' | 'deposit' | 'withdrawal' | 'adjustment';

export type LedgerInput = {
  userId: string;
  kind: LedgerKind;
  /** Signed: negative reduces cash (purchase, withdrawal, sale_reversal). */
  amount: number;
  description: string;
  category?: string | null;
  refType?: string | null;
  refId?: string | null;
  availableAt?: Date;
};

/**
 * Posts one cash-ledger row and moves the wallet balance, recording the balance
 * before and after. Must be called inside a transaction. A row with the same
 * (user, kind, ref) is a no-op, which makes webhook replays safe.
 */
export async function postLedger(client: PoolClient, e: LedgerInput): Promise<boolean> {
  await client.query('INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [e.userId]);
  const { rows } = await client.query<{ balance_sgd: string }>('SELECT balance_sgd FROM wallets WHERE user_id = $1 FOR UPDATE', [e.userId]);
  const before = Number(rows[0].balance_sgd);
  const after = Math.round((before + e.amount) * 100) / 100;

  const inserted = await client.query(
    `INSERT INTO ledger_entries (user_id, kind, amount_sgd, balance_before, balance_after, description, category, ref_type, ref_id, available_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (user_id, kind, ref_type, ref_id) WHERE ref_id IS NOT NULL DO NOTHING
     RETURNING id`,
    [e.userId, e.kind, e.amount, before, after, e.description, e.category ?? null, e.refType ?? null, e.refId ?? null, e.availableAt ?? new Date()],
  );
  if (!inserted.rowCount) return false;
  await client.query('UPDATE wallets SET balance_sgd = $2, updated_at = now() WHERE user_id = $1', [e.userId, after]);
  return true;
}

/** Days a sale stays "pending" before it can be paid out (buyer-protection window). */
export const SALE_HOLD_DAYS = 7;
