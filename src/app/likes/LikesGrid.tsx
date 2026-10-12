'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import ProductCard, { type CardItem } from '@/components/ProductCard';
import { useLikes } from '@/components/useLikes';

export default function LikesGrid() {
  const [items, setItems] = useState<CardItem[] | null>(null);
  const { ids, toggle } = useLikes();
  useEffect(() => { fetch('/api/likes').then((r) => r.json()).then((d) => setItems(d.items ?? [])).catch(() => setItems([])); }, []);

  if (!items) return <p className="hint">Loading…</p>;
  if (!items.length) return <div className="empty"><Heart size={28} /><h3>No likes yet</h3><p>Tap the heart on any listing to save it here.</p><Link className="btn" href="/">Browse listings</Link></div>;
  return <div className="product-grid">{items.map((p) => <ProductCard key={p.id} product={p} saved={ids.includes(p.id)} onSave={toggle} />)}</div>;
}
