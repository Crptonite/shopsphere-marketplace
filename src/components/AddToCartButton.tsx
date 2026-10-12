'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, ShoppingCart } from 'lucide-react';

export default function AddToCartButton({ productId, className = 'btn', quantity = 1 }: { productId: string; className?: string; quantity?: number }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState('');

  async function add() {
    setState('busy');
    setError('');
    const res = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, quantity }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState('idle');
      setError(data.error ?? 'Could not add to cart.');
      return;
    }
    setState('done');
    router.refresh(); // updates the header cart count
    setTimeout(() => setState('idle'), 1800);
  }

  return <>
    <button className={className} onClick={add} disabled={state === 'busy'}>
      {state === 'done' ? <><Check size={16} /> Added</> : <><ShoppingCart size={16} /> {state === 'busy' ? 'Adding…' : 'Add to cart'}</>}
    </button>
    {error && <p className="hint" style={{ color: 'var(--danger)', marginTop: 6 }} role="alert">{error}</p>}
  </>;
}
