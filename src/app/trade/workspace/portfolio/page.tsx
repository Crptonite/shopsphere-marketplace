import Link from 'next/link';
import SampleBanner from '@/components/trade/SampleBanner';
import PositionsPanel from '@/components/trade/PositionsPanel';
import { getCurrentUser } from '@/lib/auth';
import { catalogue, userPositions } from '@/lib/trade-data';

export const metadata = { title: 'Portfolio — Trade — ShopSphere' };
export const dynamic = 'force-dynamic';

export default async function PortfolioPage() {
  const user = await getCurrentUser();
  const [positions, stocks] = await Promise.all([user ? userPositions(user.id) : Promise.resolve([]), catalogue()]);
  const total = positions.reduce((sum, p) => sum + p.shares * p.price, 0);
  const totalGain = positions.reduce((sum, p) => sum + (p.price - p.avgCost) * p.shares, 0);
  return <main className="page page-wide">
    <div className="page-head"><div><div className="eyebrow">WORKSPACE</div><h1>Portfolio</h1><p>Your positions and performance. Prices come from the stock catalogue.</p></div></div>
    <SampleBanner />
    <div className="stat-grid" style={{ marginTop: 14 }}>
      <div className="card stat"><div className="hint">Market value</div><strong>S${total.toLocaleString('en-SG', { maximumFractionDigits: 0 })}</strong></div>
      <div className="card stat"><div className="hint">Unrealised gain</div><strong style={{ color: totalGain < 0 ? 'var(--danger)' : 'inherit' }}>S${totalGain.toLocaleString('en-SG', { maximumFractionDigits: 0 })}</strong></div>
    </div>
    <div style={{ marginTop: 14 }}>
      <PositionsPanel positions={positions} stocks={stocks.map((s) => ({ ticker: s.ticker, name: s.name }))} signedIn={!!user} />
    </div>
    <p className="hint" style={{ marginTop: 10 }}>Looking for a stock? <Link href="/trade/screener">Open the screener</Link>.</p>
  </main>;
}
