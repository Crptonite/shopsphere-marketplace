import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { pool, hasDb } from '@/lib/db';

/** Browser id cookie. Holds no secret; it only scopes the vault rows to one browser. */
export const BROWSER_COOKIE = 'ss_browser';
/** A parked account stays switchable for 2 hours after its last use. */
export const SWITCH_WINDOW_SQL = "interval '2 hours'";
export const SWITCH_WINDOW_MS = 2 * 60 * 60 * 1000;

export type SessionCookie = { name: string; value: string };

const KEY_SOURCE = process.env.ACCOUNT_VAULT_KEY ?? '';
/** Feature is on only when a vault key is configured and the database is available. */
export const vaultEnabled = () => Boolean(KEY_SOURCE) && hasDb();

export const isAuthCookie = (name: string) =>
  name.startsWith('sb-') && name.includes('-auth-token') && !name.includes('code-verifier');

function key() {
  return createHash('sha256').update(KEY_SOURCE).digest();
}

function seal(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString('base64')).join('.');
}

function open(sealed: string) {
  const [iv, tag, body] = sealed.split('.').map((p) => Buffer.from(p, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const part = jwt.split('.')[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/** Reads who the Supabase session cookies belong to, without contacting Supabase. */
export function identityFromCookies(cookies: SessionCookie[]): { userId: string; email: string } | null {
  const chunks = new Map<string, string[]>();
  for (const c of cookies) {
    if (!isAuthCookie(c.name)) continue;
    const m = c.name.match(/^(.*)\.(\d+)$/);
    const base = m ? m[1] : c.name;
    const list = chunks.get(base) ?? [];
    list[m ? Number(m[2]) : 0] = c.value;
    chunks.set(base, list);
  }
  for (const list of chunks.values()) {
    let raw = list.join('');
    if (raw.startsWith('base64-')) raw = Buffer.from(raw.slice(7), 'base64url').toString('utf8');
    try {
      const session = JSON.parse(raw);
      const payload = typeof session?.access_token === 'string' ? decodeJwtPayload(session.access_token) : null;
      if (typeof payload?.sub === 'string' && typeof payload.email === 'string') {
        return { userId: payload.sub, email: payload.email };
      }
    } catch {
      // Not a session cookie; try the next group.
    }
  }
  return null;
}

/** Stores the browser's current session for its account so it can be switched back to. */
export async function park(browserId: string, cookies: SessionCookie[]) {
  const identity = identityFromCookies(cookies);
  if (!identity) return false;
  const sealed = seal(JSON.stringify(cookies.filter((c) => isAuthCookie(c.name))));
  await pool.query(
    `INSERT INTO account_vault (browser_id, user_id, email, sealed, last_used_at) VALUES ($1,$2,$3,$4,now())
     ON CONFLICT (browser_id, user_id) DO UPDATE SET email = EXCLUDED.email, sealed = EXCLUDED.sealed, last_used_at = now()`,
    [browserId, identity.userId, identity.email, sealed],
  );
  return true;
}

/** Parked accounts still inside the 2-hour window, most recently used first. */
export async function listAccounts(browserId: string): Promise<{ userId: string; email: string; expiresAt: number }[]> {
  await pool.query(`DELETE FROM account_vault WHERE browser_id = $1 AND last_used_at < now() - ${SWITCH_WINDOW_SQL}`, [browserId]);
  const { rows } = await pool.query<{ user_id: string; email: string; last_used_at: Date }>(
    'SELECT user_id, email, last_used_at FROM account_vault WHERE browser_id = $1 ORDER BY last_used_at DESC',
    [browserId],
  );
  return rows.map((r) => ({ userId: r.user_id, email: r.email, expiresAt: new Date(r.last_used_at).getTime() + SWITCH_WINDOW_MS }));
}

/** Takes a parked account out of the vault for switching in. Returns null when it is outside the window. */
export async function take(browserId: string, userId: string): Promise<SessionCookie[] | null> {
  const { rows } = await pool.query<{ sealed: string }>(
    `DELETE FROM account_vault WHERE browser_id = $1 AND user_id = $2 AND last_used_at >= now() - ${SWITCH_WINDOW_SQL} RETURNING sealed`,
    [browserId, userId],
  );
  if (!rows[0]) return null;
  return JSON.parse(open(rows[0].sealed)) as SessionCookie[];
}
