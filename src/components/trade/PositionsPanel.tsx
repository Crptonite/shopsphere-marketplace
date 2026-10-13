'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { PositionRow } from '@/lib/trade-data';

type StockOption = { ticker: string; name: string };

/** Add and remove portfolio positions. Saved to Neon through /api/trade/positions. */
export default function PositionsPanel({ positions, stocks, signedIn }: { positions: PositionRow[]; stocks: StockOption[]; signedIn: boolean }) {
  const router = useRouter();
  const [ticker, setTicker] = useState(stocks[0]?.ticker ?? '');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(input: RequestInfo, init?: RequestInit) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(input, init);
      if (res.status === 401) {
        router.push('/login');
        return false;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Something went wrong');
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    const ok = await send('/api/trade/positions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ticker, shares, avgCost }),
    });
    if (ok) {
      setShares('');
      setAvgCost('');
    }
  }

  async function remove(id: number) {
    await send(`/api/trade/positions?id=${id}`, { method: 'DELETE' });
  }

  if (!signedIn) {
    return <p className="hint">Sign in to record your positions. <a href="/login">Sign in</a></p>;
  }

  return <div>
    <form onSubmit={add} className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
      <label style={{ fontSize: 12 }}>Stock
        <select value={ticker} onChange={(e) => setTicker(e.target.value)}>
          {stocks.map((s) => <option key={s.ticker} value={s.ticker}>{s.ticker} · {s.name}</option>)}
        </select>
      </label>
      <label style={{ fontSize: 12 }}>Shares
        <input type="number" min="0" step="any" required value={shares} onChange={(e) => setShares(e.target.value)} />
      </label>
      <label style={{ fontSize: 12 }}>Average cost (S$)
        <input type="number" min="0" step="any" required value={avgCost} onChange={(e) => setAvgCost(e.target.value)} />
      </label>
      <button type="submit" className="btn" disabled={busy || !ticker}>Add position</button>
      {error && <span className="hint" role="alert">{error}</span>}
    </form>
    {positions.length === 0 ? <p className="hint">No positions yet. Add one above.</p> : null}
    {positions.length > 0 && <div className="table-wrap"><table className="table">
      <thead><tr><th>Ticker</th><th className="num">Shares</th><th className="num">Avg cost</th><th className="num">Price</th><th className="num">Value</th><th className="num">Gain</th><th /></tr></thead>
      <tbody>{positions.map((p) => {
        const value = p.shares * p.price;
        const gain = (p.price - p.avgCost) * p.shares;
        return <tr key={p.id}>
          <td><a href={`/trade/${p.ticker}`}>{p.ticker}</a></td>
          <td className="num">{p.shares.toLocaleString('en-SG')}</td>
          <td className="num">S${p.avgCost.toFixed(2)}</td>
          <td className="num">S${p.price.toFixed(2)}</td>
          <td className="num">S${value.toLocaleString('en-SG', { maximumFractionDigits: 0 })}</td>
          <td className="num" style={{ color: gain < 0 ? 'var(--danger)' : 'inherit' }}>S${gain.toLocaleString('en-SG', { maximumFractionDigits: 0 })}</td>
          <td><button type="button" className="btn btn-ghost" onClick={() => remove(p.id)} disabled={busy}>Remove</button></td>
        </tr>;
      })}</tbody>
    </table></div>}
  </div>;
}
