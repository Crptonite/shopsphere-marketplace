import Link from 'next/link';
import SampleBanner from '@/components/trade/SampleBanner';
import SparkLine from '@/components/trade/SparkLine';
import { SAMPLE_INDEX_HISTORY } from '@/lib/sample-stocks';
import { catalogue } from '@/lib/trade-data';

export const metadata = { title: 'Trade — ShopSphere' };
export const dynamic = 'force-dynamic';

/** Trade dashboard: index trend, top movers from the stock catalogue, and quick links. */
export default async function TradePage() {
  const stocks = await catalogue();
  const first = SAMPLE_INDEX_HISTORY[0];
  const last = SAMPLE_INDEX_HISTORY[SAMPLE_INDEX_HISTORY.length - 1];
  const change = ((last - first) / first) * 100;
  const movers = [...stocks].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 4);
  return <main className="page page-wide">
    <div className="page-head"><div><div className="eyebrow">TRADE</div><h1>Dashboard</h1><p>Singapore market overview. {stocks.length} stocks in the catalogue.</p></div></div>
    <SampleBanner />
    <div className="grid-2" style={{ marginTop: 14 }}>
      <div className="card" style={{ padding: 16 }}>
        <div className="hint">Sample index (12 points)</div>
        <strong style={{ fontSize: 22 }}>{last.toLocaleString('en-SG')}</strong> <span style={{ color: change < 0 ? 'var(--danger)' : 'var(--green, #2f7d4f)' }}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span>
        <SparkLine values={SAMPLE_INDEX_HISTORY} />
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div className="hint">Biggest movers</div>
        {movers.map((s) => <Link key={s.ticker} href={`/trade/${s.ticker}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
          <span>{s.ticker} · {s.name}</span><strong style={{ color: s.change < 0 ? 'var(--danger)' : 'inherit' }}>{s.change > 0 ? '+' : ''}{s.change.toFixed(1)}%</strong>
        </Link>)}
      </div>
    </div>
    <div className="grid-3" style={{ marginTop: 14 }}>
      <Link className="card" href="/trade/screener" style={{ padding: 16 }}><strong>Screener</strong><div className="hint">Nine criteria, saved filters</div></Link>
      <Link className="card" href="/trade/workspace/watchlist" style={{ padding: 16 }}><strong>Watchlist</strong><div className="hint">Stocks you follow</div></Link>
      <Link className="card" href="/trade/workspace/portfolio" style={{ padding: 16 }}><strong>Portfolio</strong><div className="hint">Your positions and gains</div></Link>
    </div>
    <div className="grid-2" style={{ marginTop: 14 }}>
      <Link className="card" href="/trade/ai-chat" style={{ padding: 16 }}><strong>OpenRouter</strong><div className="hint">Ask questions in the AI chat</div></Link>
      <Link className="card" href="/trade/app-ideas" style={{ padding: 16 }}><strong>Mobile app projects</strong><div className="hint">Ideas 21 to 40</div></Link>
    </div>
  </main>;
}
