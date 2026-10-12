'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

type Item = { id: number; query: string; title: string; priceText: string | null; thumbnail: string | null; merchant: string | null; sourceUrl: string; retrievedAt: string };

const SUGGESTED = ['Apple iPhone latest models Singapore', 'Samsung Galaxy S series Singapore', 'iPhone 17 Pro Max 256GB', 'Apple iPhone 18', 'Samsung Galaxy Z Fold'];

export default function DiscoveryPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = () => fetch('/api/admin/discovery').then((r) => r.json()).then((d) => setItems(d.items ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);

  async function run(q: string) {
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/admin/discovery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? { kind: 'ok', text: `Stored ${data.stored} results for “${q}”.` } : { kind: 'error', text: data.error ?? 'Discovery failed.' });
    if (res.ok) load();
  }

  return <>
    <div className="card">
      <form className="composer" style={{ borderTop: 0, paddingTop: 0 }} onSubmit={(e) => { e.preventDefault(); if (query.trim()) run(query.trim()); }}>
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Samsung Galaxy S26 Ultra" />
        <button className="btn" disabled={busy}>{busy ? 'Searching…' : 'Discover'}</button>
      </form>
      <div className="search-hints">{SUGGESTED.map((s) => <button key={s} onClick={() => run(s)} disabled={busy}>{s}</button>)}</div>
      {msg && <div className={`alert ${msg.kind === 'ok' ? 'alert-ok' : 'alert-error'}`} style={{ marginTop: 12 }}>{msg.text}</div>}
    </div>
    <div className="card table-wrap"><table className="table">
      <thead><tr><th /><th>Title</th><th>Price</th><th>Merchant</th><th>Query</th><th>Retrieved</th></tr></thead>
      <tbody>{items.map((i) => <tr key={i.id}>
        <td>{i.thumbnail && <img src={i.thumbnail} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />}</td>
        <td><a href={i.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{i.title} <ExternalLink size={11} /></a><div><span className="pill pill-warn">External · unverified</span></div></td>
        <td>{i.priceText ?? '—'}</td><td>{i.merchant ?? '—'}</td><td className="hint">{i.query}</td>
        <td className="hint">{new Date(i.retrievedAt).toLocaleString('en-SG')}</td>
      </tr>)}</tbody>
    </table></div>
  </>;
}
