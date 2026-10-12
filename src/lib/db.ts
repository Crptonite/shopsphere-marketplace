import { Pool, type PoolClient } from 'pg';

declare global {
  var __shopspherePool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString ?? '');
const needsSsl = !isLocal && (process.env.DATABASE_SSL === 'true' || /sslmode=require|neon\.tech/.test(connectionString ?? ''));

export const pool = global.__shopspherePool ?? new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: needsSsl ? { rejectUnauthorized: true } : undefined,
});

if (process.env.NODE_ENV !== 'production') global.__shopspherePool = pool;

export const hasDb = () => Boolean(process.env.DATABASE_URL);

/** Runs fn inside a transaction; rolls back on any thrown error. */
export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
