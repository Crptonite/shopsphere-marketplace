// Applies db/migrations/*.sql in order, tracking them in schema_migrations.
// Usage: node scripts/migrate.mjs [--test] [--seed]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const file of ['.env.local', '.env']) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const useTest = process.argv.includes('--test');
const connectionString = useTest ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;
if (!connectionString) {
  console.error(`${useTest ? 'DATABASE_URL_TEST' : 'DATABASE_URL'} is not set.`);
  process.exit(1);
}
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString);
const needsSsl = !isLocal && (process.env.DATABASE_SSL === 'true' || /sslmode=require|neon\.tech/.test(connectionString));
const client = new pg.Client({ connectionString, ssl: needsSsl ? { rejectUnauthorized: true } : undefined });

await client.connect();
try {
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const applied = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const dir = join(root, 'db', 'migrations');
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (applied.has(name)) continue;
    process.stdout.write(`Applying ${name}... `);
    await client.query('BEGIN');
    try {
      await client.query(readFileSync(join(dir, name), 'utf8'));
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      console.log('done');
    } catch (error) {
      await client.query('ROLLBACK');
      console.log('failed');
      throw error;
    }
  }
  if (process.argv.includes('--seed')) {
    await client.query(readFileSync(join(root, 'db', 'seed.sql'), 'utf8'));
    console.log('Seed applied.');
  }
  console.log(`Migrations up to date (${useTest ? 'test' : 'main'} database).`);
} finally {
  await client.end();
}
