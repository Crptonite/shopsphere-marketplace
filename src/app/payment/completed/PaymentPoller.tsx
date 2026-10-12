'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Re-renders the server page every 2s (for up to a minute) until the webhook confirms payment. */
export default function PaymentPoller() {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= 30) return;
    const t = setTimeout(() => { router.refresh(); setTries((n) => n + 1); }, 2000);
    return () => clearTimeout(t);
  }, [tries, router]);
  return tries >= 30
    ? <p className="hint">Still waiting. Check <a href="/orders">your orders</a> shortly — if the webhook is not running locally, start <code>stripe listen</code>.</p>
    : null;
}
