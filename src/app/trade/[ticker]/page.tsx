import Link from 'next/link';
import { notFound } from 'next/navigation';
import SampleBanner from '@/components/trade/SampleBanner';
import RemindersPanel from '@/components/trade/RemindersPanel';
import SaveButton from '@/components/trade/SaveButton';
import { getCurrentUser } from '@/lib/auth';
import { stockByTicker, userSaves } from '@/lib/trade-data';

export const dynamic = 'force-dynamic';

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const [s, user] = await Promise.all([stockByTicker(ticker), getCurrentUser()]);
  if (!s) notFound();
  const saves = user ? await userSaves(user.id) : { favourite: [], watchlist: [] };

  const stats: [string, string][] = [
    ['Market cap', `S$${s.marketCapSgdM.toLocaleString('en-SG')}M`],
    ['P/E', String(s.pe)],
    ['P/B', String(s.pb)],
    ['Dividend yield', `${s.dividendYield}%`],
    ['Revenue growth', `${s.revenueGrowth}%`],
    ['EPS growth', `${s.epsGrowth}%`],
    ['ROA', `${s.roa}%`],
    ['Debt-to-equity', String(s.debtToEquity)],
    ['Volume vs average', `${s.volumeRatio}×`],
  ];

  return <main className="page page-wide">
    <p className="hint"><Link href="/trade/workspace/watchlist">← Watchlist</Link></p>
    <div className="page-head"><div><div className="eyebrow">{s.sector.toUpperCase()}</div><h1>{s.ticker} · {s.name}</h1>
      <p><strong style={{ fontSize: 22 }}>S${s.price.toFixed(2)}</strong>{' '}
        <span style={{ color: s.change < 0 ? 'var(--danger)' : 'var(--green, #2f7d4f)' }}>{s.change > 0 ? '+' : ''}{s.change.toFixed(1)}%</span></p></div></div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
      <SaveButton ticker={s.ticker} kind="favourite" initialSaved={saves.favourite.includes(s.ticker)} signedIn={!!user} />
      <SaveButton ticker={s.ticker} kind="watchlist" initialSaved={saves.watchlist.includes(s.ticker)} signedIn={!!user} />
    </div>
    <SampleBanner />
    <div className="grid-2" style={{ marginTop: 14, alignItems: 'start' }}>
      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 10px' }}>Key figures</h3>
        <dl className="spec">{stats.map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        <p className="hint">Chart, news and signals will appear here once market data is connected.</p>
        <p style={{ marginTop: 10 }}><Link href="/trade/workspace/dca-reminders">Open the DCA calculator</Link></p>
      </div>
      <RemindersPanel ticker={s.ticker} />
    </div>
  </main>;
}
