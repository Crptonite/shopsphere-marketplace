'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

/** Liked listing ids for the signed-in user, stored server-side via /api/likes. */
export function useLikes() {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>([]);
  const [signedIn, setSignedIn] = useState(true);

  useEffect(() => {
    fetch('/api/likes?ids=1').then((r) => {
      if (r.status === 401 || r.status === 503) { setSignedIn(false); return null; }
      return r.json();
    }).then((d) => d && setIds(d.ids ?? [])).catch(() => {});
  }, []);

  const toggle = useCallback(async (id: string) => {
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    setIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
    const res = await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: id }) });
    if (!res.ok) setIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id])); // roll back
  }, [signedIn, router]);

  return { ids, toggle };
}
