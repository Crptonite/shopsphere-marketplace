'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Star } from 'lucide-react';

type Kind = 'favourite' | 'watchlist';

const LABELS: Record<Kind, { on: string; off: string }> = {
  favourite: { on: 'Loved', off: 'Love stock' },
  watchlist: { on: 'On watchlist', off: 'Add to watchlist' },
};

/** Toggles a stock in the signed-in user's loved list or watchlist. */
export default function SaveButton({ ticker, kind, initialSaved, signedIn }: { ticker: string; kind: Kind; initialSaved: boolean; signedIn: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const Icon = kind === 'favourite' ? Heart : Star;

  async function toggle() {
    if (!signedIn) {
      router.push('/login');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = saved
        ? await fetch(`/api/trade/saves?ticker=${encodeURIComponent(ticker)}&kind=${kind}`, { method: 'DELETE' })
        : await fetch('/api/trade/saves', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ticker, kind }),
          });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Could not update');
      }
      setSaved(!saved);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <button type="button" className={saved ? 'btn' : 'btn btn-ghost'} onClick={toggle} disabled={busy} aria-pressed={saved}>
        <Icon size={14} fill={saved ? 'currentColor' : 'none'} aria-hidden /> {saved ? LABELS[kind].on : LABELS[kind].off}
      </button>
      {error && <span className="hint" role="alert">{error}</span>}
    </span>
  );
}
