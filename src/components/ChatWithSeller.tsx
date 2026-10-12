'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MessageCircle } from 'lucide-react';

export default function ChatWithSeller({ productId, label = 'Chat with seller', className = 'btn btn-ghost', signedIn }: { productId: string; label?: string; className?: string; signedIn: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function open() {
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(`/products/${productId}`)}`);
    setBusy(true);
    const res = await fetch('/api/chats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? 'Could not open chat.');
    router.push(`/chats/${data.id}`);
  }

  return <>
    <button className={className} onClick={open} disabled={busy}><MessageCircle size={16} /> {busy ? 'Opening…' : label}</button>
    {error && <p className="hint" style={{ color: 'var(--danger)' }} role="alert">{error}</p>}
  </>;
}
