'use client';

import { useCallback, useEffect, useState } from 'react';

export type Thresholds = Record<string, { min?: string; max?: string }>;
type SavedFilter = { id: number; name: string; criteria: Thresholds; createdAt: string };

/** Save the current screener thresholds under a name, reload them later, or delete them. */
export default function SavedFilters({ thresholds, onLoad, signedIn }: { thresholds: Thresholds; onLoad: (criteria: Thresholds) => void; signedIn: boolean }) {
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!signedIn) return;
    const res = await fetch('/api/trade/filters').catch(() => null);
    if (res?.ok) {
      const body = await res.json();
      setFilters(body.filters ?? []);
    }
  }, [signedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setMessage('');
    const criteria = Object.fromEntries(
      Object.entries(thresholds)
        .map(([key, t]) => [key, { ...(t.min ? { min: t.min } : {}), ...(t.max ? { max: t.max } : {}) }])
        .filter(([, t]) => Object.keys(t as object).length > 0),
    );
    const res = await fetch('/api/trade/filters', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, criteria }),
    });
    if (res.status === 401) return setMessage('Sign in to save filters.');
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return setMessage(body?.error ?? 'Could not save the filter');
    }
    setName('');
    setMessage('Filter saved.');
    void load();
  }

  async function remove(id: number) {
    await fetch(`/api/trade/filters?id=${id}`, { method: 'DELETE' });
    void load();
  }

  if (!signedIn) return <p className="hint">Sign in to save filter criteria.</p>;

  return <div className="card" style={{ padding: 14, marginBottom: 14 }}>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <input type="text" placeholder="Name this filter" aria-label="Filter name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      <button type="button" className="btn" onClick={save} disabled={!name.trim()}>Save filter</button>
      {message && <span className="hint" role="status">{message}</span>}
    </div>
    {filters.length > 0 && <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 6 }}>
      {filters.map((f) => <li key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <strong style={{ flex: 1 }}>{f.name}</strong>
        <button type="button" className="btn btn-ghost" onClick={() => onLoad(f.criteria)}>Load</button>
        <button type="button" className="btn btn-ghost" onClick={() => remove(f.id)}>Delete</button>
      </li>)}
    </ul>}
  </div>;
}
