import 'server-only';
import Redis from 'ioredis';
import { env } from '@/lib/env';

declare global {
  var __shopsphereRedis: Redis | null | undefined;
}

function connect(): Redis | null {
  if (!env.REDIS_URL) return null;
  const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: false });
  client.on('error', (e) => console.warn('[redis]', e.message));
  return client;
}

export const redis: Redis | null = global.__shopsphereRedis === undefined ? connect() : global.__shopsphereRedis;
if (process.env.NODE_ENV !== 'production') global.__shopsphereRedis = redis;

/** Read-through cache. Redis is never authoritative: on any failure we call fn directly. */
export async function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  if (!redis || redis.status !== 'ready') return fn();
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch { /* fall through */ }
  const value = await fn();
  redis.set(key, JSON.stringify(value), 'EX', ttlSeconds).catch(() => {});
  return value;
}

export async function invalidate(...prefixes: string[]) {
  if (!redis || redis.status !== 'ready') return;
  try {
    for (const prefix of prefixes) {
      let cursor = '0';
      do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
        cursor = next;
        if (keys.length) await redis.del(...keys);
      } while (cursor !== '0');
    }
  } catch (e) {
    console.warn('[redis] invalidate failed', e);
  }
}

export async function del(key: string) {
  if (redis?.status === 'ready') await redis.del(key).catch(() => {});
}
