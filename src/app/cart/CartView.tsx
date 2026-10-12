'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, ShoppingCart, X } from 'lucide-react';
import { money2 } from '@/lib/format';

type Line = { productId: string; title: string; image: string; price: number; quantity: number; stockQty: number; status: string; seller: string; isSample: boolean };
type Cart = { items: Line[]; subtotal: number; count: number; message?: string };

export default function CartView() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetch('/api/cart').then((r) => r.json()).then(setCart).catch(() => setError('Could not load your cart.')); }, []);

  async function setQty(productId: string, quantity: number) {
    const res = await fetch('/api/cart', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, quantity }) });
    if (res.ok) { setCart(await res.json()); router.refresh(); }
  }

  async function checkout() {
    setBusy(true);
    setError('');
    const res = await fetch('/api/checkout', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) return router.push('/login?next=/cart');
    if (!res.ok || !data.url) { setBusy(false); return setError(data.error ?? 'Checkout failed.'); }
    window.location.href = data.url; // Stripe-hosted Checkout
  }

  if (!cart) return <p className="hint">{error || 'Loading…'}</p>;
  if (!cart.items.length) return <div className="empty"><ShoppingCart size={30} /><h3>Your cart is waiting</h3><p>{cart.message ?? 'Find something you love and add it here.'}</p><Link className="btn" href="/">Browse listings</Link></div>;

  const blocked = cart.items.some((l) => l.status !== 'active' || l.stockQty < l.quantity);
  return <div className="card">
    {cart.items.map((l) => <div className="cart-row" key={l.productId}>
      {l.image ? <img src={l.image} alt="" /> : <span />}
      <div><Link href={`/products/${l.productId}`}><strong>{l.title}</strong></Link><br />
        <span className="hint">{l.seller}{l.isSample ? ' · Sample listing' : ''}</span>
        {l.status !== 'active' && <div className="pill pill-red" style={{ marginTop: 4 }}>No longer available</div>}
        {l.status === 'active' && l.stockQty < l.quantity && <div className="pill pill-warn" style={{ marginTop: 4 }}>Only {l.stockQty} left</div>}
      </div>
      <input className="input qty" type="number" min={1} max={Math.max(1, l.stockQty)} value={l.quantity} aria-label="Quantity" onChange={(e) => setQty(l.productId, Math.max(1, Number(e.target.value) || 1))} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><strong>{money2(l.price * l.quantity)}</strong><button className="remove-item" onClick={() => setQty(l.productId, 0)} aria-label="Remove item"><X size={16} /></button></div>
    </div>)}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
      <span>Subtotal ({cart.count} {cart.count === 1 ? 'item' : 'items'})</span><strong style={{ font: "800 22px 'Manrope'" }}>{money2(cart.subtotal)}</strong>
    </div>
    <p className="hint">Payment is processed by Stripe in <strong>test mode</strong> — use card 4242 4242 4242 4242. Your order is confirmed only after Stripe verifies the payment.</p>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    <button className="btn btn-block" onClick={checkout} disabled={busy || blocked}>{busy ? 'Redirecting to Stripe…' : <>Checkout securely <ArrowRight size={16} /></>}</button>
  </div>;
}
