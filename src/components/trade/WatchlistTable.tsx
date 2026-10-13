'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { SAMPLE_STOCKS } from '@/lib/sample-stocks';

/** Watchlist on sample data. Selections are kept in this page only (not saved yet). */
export default function WatchlistTable() {
  const [watching, setWatching] = useState<string[]>(['SMP01', 'SMP06']);
  const toggle = (t: string) => setWatching((w) => (w.includes(t) ? w.filter((x) => x !== t) : [...w, t]));
  const list = SAMPLE_STOCKS.filter((s) => watching.includes(s.ticker));
  return <div>
    <p className="hint">Star a stock to add it to your watchlist.</p>
    <div className="table-wrap"><table className="table">
      <thead><tr><th></th><th>Ticker</th><th>Company</th><th className="num">Price</th><th className="num">Change</th><th className="num">Volume ratio</th></tr></thead>
      <tbody>{SAMPLE_STOCKS.map((s) => <tr key={s.ticker}>
        <td><button type="button" className="btn btn-ghost btn-sm" aria-label={watching.includes(s.ticker) ? `Remove ${s.ticker}` : `Add ${s.ticker}`} onClick={() => toggle(s.ticker)}><Star size={14} fill={watching.includes(s.ticker) ? 'currentColor' : 'none'} /></button></td>
        <td><Link href={`/trade/${s.ticker}`}>{s.ticker}</Link></td><td>{s.name}</td><td className="num">S${s.price.toFixed(2)}</td>
        <td className="num" style={{ color: s.change < 0 ? 'var(--danger)' : 'inherit' }}>{s.change > 0 ? '+' : ''}{s.change.toFixed(1)}%</td>
        <td className="num">{s.volumeRatio.toFixed(1)}×</td>
      </tr>)}</tbody>
    </table></div>
    <p className="hint" style={{ marginTop: 10 }}>{list.length} on your watchlist.</p>
  </div>;
}
