import { NextRequest, NextResponse } from 'next/server';
import { cached } from '@/lib/redis';
import { SG_AREAS, nearestArea } from '@/lib/locations';

export const runtime = 'nodejs';

type SerpLocation = { name: string; canonical_name: string; country_code: string; target_type: string; gps?: [number, number] };

/**
 * Location suggestions for the search bar. Local planning areas match instantly; SerpApi's
 * Locations API (no key required) resolves other Singapore place names.
 * ?lat=&lng= reverse-maps a browser geolocation to the nearest area.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const lat = Number(sp.get('lat'));
  const lng = Number(sp.get('lng'));
  if (sp.has('lat') && Number.isFinite(lat) && Number.isFinite(lng)) {
    const area = nearestArea(lat, lng);
    return NextResponse.json({ nearest: area?.name ?? null });
  }

  const q = (sp.get('q') ?? '').trim().slice(0, 60);
  const local = SG_AREAS.filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8).map((a) => ({ name: a.name, source: 'local' }));
  if (q.length < 2) return NextResponse.json({ items: local });

  const remote = await cached(`locations:${q.toLowerCase()}`, 86_400, async () => {
    try {
      const res = await fetch(`https://serpapi.com/locations.json?${new URLSearchParams({ q, limit: '20' })}`, { cache: 'no-store' });
      if (!res.ok) return [];
      const data = (await res.json()) as SerpLocation[];
      return data.filter((l) => l.country_code === 'SG').slice(0, 6).map((l) => ({ name: l.name, canonical: l.canonical_name, source: 'serpapi' }));
    } catch {
      return [];
    }
  });
  const seen = new Set(local.map((l) => l.name.toLowerCase()));
  return NextResponse.json({ items: [...local, ...remote.filter((r) => !seen.has(r.name.toLowerCase()))].slice(0, 10) });
}
