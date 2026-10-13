'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SampleStock } from '@/lib/sample-stocks';
import SavedFilters, { type Thresholds } from '@/components/trade/SavedFilters';

type Criterion = { key: keyof SampleStock; label: string; min?: number; max?: number };

/** The nine core criteria, with editable thresholds. */
const CRITERIA: Criterion[] = [
  { key: 'marketCapSgdM', label: 'Market cap (S$M)', min: 500 },
  { key: 'pe', label: 'P/E', min: 5, max: 20 },
  { key: 'pb', label: 'P/B', max: 2.5 },
  { key: 'dividendYield', label: 'Dividend yield (%)', min: 3 },
  { key: 'revenueGrowth', label: 'Revenue growth (%)', min: 5 },
  { key: 'epsGrowth', label: 'EPS growth (%)', min: 0 },
  { key: 'roa', label: 'ROA (%)', min: 5 },
  { key: 'debtToEquity', label: 'Debt-to-equity', max: 1 },
  { key: 'volumeRatio', label: 'Volume ratio', min: 1.5 },
];

const defaults = (): Thresholds =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, { min: c.min?.toString() ?? '', max: c.max?.toString() ?? '' }]));

/** Screens the stock catalogue (from Neon, or samples) against editable thresholds. */
export default function ScreenerTable({ stocks, signedIn }: { stocks: SampleStock[]; signedIn: boolean }) {
  const [thresholds, setThresholds] = useState<Thresholds>(defaults);
  const [sort, setSort] = useState<keyof SampleStock>('marketCapSgdM');

  const rows = useMemo(() => {
    const passes = (s: SampleStock) => CRITERIA.every((c) => {
      const t = thresholds[c.key];
      const v = s[c.key] as number;
      if (t?.min && v < Number(t.min)) return false;
      if (t?.max && v > Number(t.max)) return false;
      return true;
    });
    return stocks.filter(passes).sort((a, b) => (b[sort] as number) - (a[sort] as number));
  }, [stocks, thresholds, sort]);

  const setField = (key: string, field: 'min' | 'max', value: string) =>
    setThresholds((t) => ({ ...t, [key]: { ...t[key], [field]: value } }));

  return <div>
    <SavedFilters thresholds={thresholds} signedIn={signedIn} onLoad={(criteria) => setThresholds(() => Object.fromEntries(
      CRITERIA.map((c) => [c.key, { min: criteria[c.key]?.min ?? '', max: criteria[c.key]?.max ?? '' }]),
    ))} />
    <div className="card" style={{ padding: 14, marginBottom: 14 }}>
      <div className="grid-3" style={{ gap: 10 }}>
        {CRITERIA.map((c) => <label key={c.key} style={{ fontSize: 12 }}>{c.label}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input type="number" placeholder="Min" aria-label={`${c.label} minimum`} value={thresholds[c.key]?.min ?? ''} onChange={(e) => setField(c.key, 'min', e.target.value)} />
            <input type="number" placeholder="Max" aria-label={`${c.label} maximum`} value={thresholds[c.key]?.max ?? ''} onChange={(e) => setField(c.key, 'max', e.target.value)} />
          </div>
        </label>)}
      </div>
    </div>
    <div className="hint" style={{ marginBottom: 8 }}>{rows.length} of {stocks.length} stocks match all nine criteria.
      {' '}<label>Sort by <select value={sort} onChange={(e) => setSort(e.target.value as keyof SampleStock)}>
        <option value="marketCapSgdM">Market cap</option><option value="pe">P/E</option><option value="dividendYield">Dividend yield</option><option value="revenueGrowth">Revenue growth</option>
      </select></label></div>
    <div className="table-wrap"><table className="table">
      <thead><tr><th>Ticker</th><th>Company</th><th>Sector</th><th className="num">Price</th><th className="num">Mkt cap (S$M)</th><th className="num">P/E</th><th className="num">P/B</th><th className="num">Yield</th></tr></thead>
      <tbody>{rows.map((s) => <tr key={s.ticker}><td><Link href={`/trade/${s.ticker}`}>{s.ticker}</Link></td><td>{s.name}</td><td>{s.sector}</td><td className="num">S${s.price.toFixed(2)}</td><td className="num">{s.marketCapSgdM.toLocaleString('en-SG')}</td><td className="num">{s.pe}</td><td className="num">{s.pb}</td><td className="num">{s.dividendYield}%</td></tr>)}</tbody>
    </table></div>
    {rows.length === 0 && <p className="hint">No stock passes every threshold. Clear a field to widen the screen.</p>}
  </div>;
}
