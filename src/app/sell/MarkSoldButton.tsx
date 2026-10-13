'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Toggles a listing between active and sold. Sold listings move to the "Sold & removed" tab. */
export default function MarkSoldButton({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sold = status === 'sold';

  async function toggle() {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/products/${id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: sold ? 'active' : 'sold' }) });
    setBusy(false);
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? 'Could not update.'); return; }
    router.refresh();
  }

  return <>
    <button className="btn btn-ghost btn-sm" onClick={toggle} disabled={busy}>{busy ? 'Saving…' : sold ? 'Mark active' : 'Mark as sold'}</button>
    {error && <span className="hint" style={{ color: 'var(--danger)' }} role="alert"> {error}</span>}
  </>;
}
