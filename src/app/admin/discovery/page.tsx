import { requireAdmin } from '@/lib/auth';
import { features } from '@/lib/env';
import DiscoveryPanel from './DiscoveryPanel';

export const metadata = { title: 'Product discovery — ShopSphere admin' };

export default async function DiscoveryPage() {
  await requireAdmin();
  return <main className="page">
    <div className="page-head"><div><div className="eyebrow">ADMIN</div><h1>Product discovery</h1>
      <p>Pull Google Shopping results for Singapore via SerpApi. Results are stored as <strong>external, unverified</strong> discovery data with source URL and retrieval time — never as marketplace stock.</p></div></div>
    {!features.serp && <div className="alert alert-warn">Set SERP_API_KEY to run discovery.</div>}
    <DiscoveryPanel />
  </main>;
}
