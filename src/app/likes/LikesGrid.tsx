'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heart, Search, X } from 'lucide-react';
import ProductCard, { type CardItem } from '@/components/ProductCard';
import { useLikes } from '@/components/useLikes';

const STORAGE_KEY = 'shopsphere-likes-search';

/** Local-storage access that never throws (private windows and blocked storage).  */
const readSaved = () => { try { return localStorage.getItem(STORAGE_KEY) ?? ''; } catch { return ''; } };
const writeSaved = (value: string) => { try { if (value) localStorage.setItem(STORAGE_KEY, value); else localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } };

/** Keeps ?q= in the address bar without a navigation, so refresh and share keep the search. */
function writeUrl(value: string) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set('q', value); else url.searchParams.delete('q');
  window.history.replaceState(null, '', url);
}

const matches = (item: CardItem, terms: string[]) => {
  const haystack = `${item.title} ${item.brand} ${item.seller} ${item.location} ${item.condition ?? ''}`.toLowerCase();
  return terms.every((t) => haystack.includes(t));
};

export default function LikesGrid() {
  const [items, setItems] = useState<CardItem[] | null>(null);
  const [q, setQ] = useState('');
  const { ids, toggle } = useLikes();

  useEffect(() => {
    fetch('/api/likes').then((r) => r.json()).then((d) => setItems(d.items ?? [])).catch(() => setItems([]));
    // Restore the saved search: URL first, then the last one used on this device.
    const fromUrl = new URL(window.location.href).searchParams.get('q');
    const initial = fromUrl ?? readSaved();
    setQ(initial);
    writeUrl(initial);
  }, []);

  function update(value: string) {
    setQ(value);
    writeSaved(value.trim());
    writeUrl(value.trim());
  }

  if (!items) return <p className="hint">Loading…</p>;
  if (!items.length) return <div className="empty"><Heart size={28} /><h3>No likes yet</h3><p>Tap the heart on any listing to save it here.</p><Link className="btn" href="/">Browse listings</Link></div>;

  const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const shown = terms.length ? items.filter((p) => matches(p, terms)) : items;

  return <>
    <div className="likes-search" role="search">
      <label className="search-field likes-field">
        <Search size={17} />
        <input value={q} onChange={(e) => update(e.target.value)} placeholder="Search your likes" aria-label="Search your likes" />
        {q && <button type="button" className="clear-search" onClick={() => update('')} aria-label="Clear search"><X size={16} /></button>}
      </label>
      {terms.length > 0 && <span className="hint">{shown.length} of {items.length} match “{q.trim()}”</span>}
    </div>
    {shown.length === 0
      ? <div className="empty"><Search size={26} /><h3>No likes match “{q.trim()}”</h3><p>Try another word, or clear the search to see all your likes.</p><button className="btn btn-ghost" onClick={() => update('')}>Clear search</button></div>
      : <div className="product-grid">{shown.map((p) => <ProductCard key={p.id} product={p} saved={ids.includes(p.id)} onSave={toggle} />)}</div>}
  </>;
}
