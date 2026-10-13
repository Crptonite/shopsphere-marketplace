import Link from 'next/link';
import SampleBanner from '@/components/trade/SampleBanner';
import SaveButton from '@/components/trade/SaveButton';
import { getCurrentUser } from '@/lib/auth';
import { catalogue, userSaves } from '@/lib/trade-data';

export const metadata = { title: 'Watchlist — Trade — ShopSphere' };
export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  const user = await getCurrentUser();
  const [stocks, saves] = await Promise.all([catalogue(), user ? userSaves(user.id) : Promise.resolve({ favourite: [], watchlist: [] })]);
  const watching = stocks.filter((s) => saves.watchlist.includes(s.ticker));
  const others = stocks.filter((s) => !saves.watchlist.includes(s.ticker));

  const Row = ({ s, onWatchlist }: { s: (typeof stocks)[number]; onWatchlist: boolean }) => <tr>
    <td><Link href={`/trade/${s.ticker}`}>{s.ticker}</Link></td>
    <td>{s.name}</td>
    <td className="num">S${s.price.toFixed(2)}</td>
    <td className="num" style={{ color: s.change < 0 ? 'var(--danger)' : 'inherit' }}>{s.change > 0 ? '+' : ''}{s.change.toFixed(1)}%</td>
    <td><SaveButton ticker={s.ticker} kind="favourite" initialSaved={saves.favourite.includes(s.ticker)} signedIn={!!user} /></td>
    <td><SaveButton ticker={s.ticker} kind="watchlist" initialSaved={onWatchlist} signedIn={!!user} /></td>
  </tr>;

  return <main className="page page-wide">
    <div className="page-head"><div><div className="eyebrow">WORKSPACE</div><h1>Watchlist</h1><p>Stocks you follow. Love a stock to keep it highlighted, or add it to the watchlist.</p></div></div>
    <SampleBanner />
    {!user && <p className="hint" style={{ marginTop: 10 }}>Sign in to build your own watchlist. <Link href="/login">Sign in</Link></p>}
    <h2 style={{ marginTop: 18 }}>My watchlist ({watching.length})</h2>
    {watching.length === 0 ? <p className="hint">Nothing here yet. Add stocks from the list below.</p> : <div className="table-wrap"><table className="table">
      <thead><tr><th>Ticker</th><th>Company</th><th className="num">Price</th><th className="num">Change</th><th>Loved</th><th>Watchlist</th></tr></thead>
      <tbody>{watching.map((s) => <Row key={s.ticker} s={s} onWatchlist />)}</tbody>
    </table></div>}
    <h2 style={{ marginTop: 24 }}>All stocks</h2>
    <div className="table-wrap"><table className="table">
      <thead><tr><th>Ticker</th><th>Company</th><th className="num">Price</th><th className="num">Change</th><th>Loved</th><th>Watchlist</th></tr></thead>
      <tbody>{others.map((s) => <Row key={s.ticker} s={s} onWatchlist={false} />)}</tbody>
    </table></div>
  </main>;
}
