'use client';

import { useMemo, useState } from 'react';

/** Dollar-cost averaging projection. Figures are assumptions, not forecasts. */
export default function DcaCalculator() {
  const [monthly, setMonthly] = useState(500);
  const [years, setYears] = useState(10);
  const [annual, setAnnual] = useState(6);

  const result = useMemo(() => {
    const r = annual / 100 / 12;
    const months = Math.max(0, Math.round(years * 12));
    let value = 0;
    for (let i = 0; i < months; i++) value = (value + monthly) * (1 + r);
    const invested = monthly * months;
    return { invested, value, gain: value - invested };
  }, [monthly, years, annual]);

  const fmt = (n: number) => `S$${Math.round(n).toLocaleString('en-SG')}`;

  return <div className="card" style={{ padding: 16 }}>
    <h3 style={{ margin: '0 0 10px' }}>DCA calculator</h3>
    <div className="grid-3" style={{ gap: 10 }}>
      <label>Monthly amount (S$)<input type="number" min={0} step={50} value={monthly} onChange={(e) => setMonthly(Number(e.target.value) || 0)} /></label>
      <label>Years<input type="number" min={1} max={40} value={years} onChange={(e) => setYears(Math.min(40, Math.max(1, Number(e.target.value) || 1)))} /></label>
      <label>Assumed return (% a year)<input type="number" min={-20} max={30} step={0.5} value={annual} onChange={(e) => setAnnual(Number(e.target.value) || 0)} /></label>
    </div>
    <div className="grid-3" style={{ marginTop: 14, gap: 10 }}>
      <div><div className="hint">Total invested</div><strong>{fmt(result.invested)}</strong></div>
      <div><div className="hint">Projected value</div><strong>{fmt(result.value)}</strong></div>
      <div><div className="hint">Projected gain</div><strong style={{ color: result.gain < 0 ? 'var(--danger)' : 'inherit' }}>{fmt(result.gain)}</strong></div>
    </div>
    <p className="hint" style={{ marginTop: 10 }}>Illustration only: assumes a fixed return every month, no fees or taxes. Real returns vary and can be negative.</p>
  </div>;
}
