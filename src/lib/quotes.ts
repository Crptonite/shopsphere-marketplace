import 'server-only';
import { env } from '@/lib/env';
import { cached } from '@/lib/redis';

export type Quote = { symbol: string; price: number; currency: string; source: 'fmp' | 'finnhub' };

async function fromFmp(symbol: string): Promise<Quote | null> {
  if (!env.FMP_API_KEY) return null;
  const res = await fetch(`https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(symbol)}&apikey=${env.FMP_API_KEY}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ price?: number }>;
  const price = data?.[0]?.price;
  return typeof price === 'number' ? { symbol, price, currency: 'USD', source: 'fmp' } : null;
}

async function fromFinnhub(symbol: string): Promise<Quote | null> {
  if (!env.FINNHUB_API_KEY) return null;
  const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${env.FINNHUB_API_KEY}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = (await res.json()) as { c?: number };
  return data.c ? { symbol, price: data.c, currency: 'USD', source: 'finnhub' } : null;
}

/** Latest quote (FMP, then Finnhub), cached for 60 seconds. Null when unavailable. */
export async function getQuote(symbol: string): Promise<Quote | null> {
  const s = symbol.trim().toUpperCase();
  return cached(`quote:${s}`, 60, async () => {
    try {
      return (await fromFmp(s)) ?? (await fromFinnhub(s));
    } catch (e) {
      console.warn('Quote lookup failed', s, e);
      return null;
    }
  });
}

/** USD→SGD rate, cached for an hour. Falls back to a fixed estimate and says so. */
export async function usdToSgd(): Promise<{ rate: number; estimated: boolean }> {
  return cached('fx:USDSGD', 3600, async () => {
    try {
      if (env.FMP_API_KEY) {
        const res = await fetch(`https://financialmodelingprep.com/stable/quote?symbol=USDSGD&apikey=${env.FMP_API_KEY}`, { cache: 'no-store' });
        const data = (await res.json()) as Array<{ price?: number }>;
        if (typeof data?.[0]?.price === 'number') return { rate: data[0].price, estimated: false };
      }
    } catch { /* use estimate */ }
    return { rate: 1.3, estimated: true };
  });
}
