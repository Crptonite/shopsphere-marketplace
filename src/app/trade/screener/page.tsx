import SampleBanner from '@/components/trade/SampleBanner';
import ScreenerTable from '@/components/trade/ScreenerTable';
import { getCurrentUser } from '@/lib/auth';
import { catalogue } from '@/lib/trade-data';

export const metadata = { title: 'Screener — Trade — ShopSphere' };
export const dynamic = 'force-dynamic';

export default async function ScreenerPage() {
  const [stocks, user] = await Promise.all([catalogue(), getCurrentUser()]);
  return <main className="page page-wide">
    <div className="page-head"><div><div className="eyebrow">DISCOVER</div><h1>Screener</h1><p>Filter stocks by the nine core criteria. Edit any threshold, then save the set to reuse it.</p></div></div>
    <SampleBanner />
    <ScreenerTable stocks={stocks} signedIn={!!user} />
  </main>;
}
