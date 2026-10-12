import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { hasDb } from '@/lib/db';
import { features } from '@/lib/env';
import { getListing, listingsBySeller } from '@/lib/products';
import { listingTypeLabel, money } from '@/lib/format';
import ListingForm from './ListingForm';
import RemoveListingButton from './RemoveListingButton';

export const metadata = { title: 'Sell — ShopSphere' };

export default async function SellPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const user = await requireUser('/sell');
  if (!hasDb()) return <main className="page page-narrow"><div className="alert alert-warn">Selling needs the database. Set DATABASE_URL and run <code>npm run db:migrate</code>.</div></main>;
  const { edit } = await searchParams;
  const editing = edit ? await getListing(edit) : null;
  const editable = editing && editing.sellerId === user.id ? editing : null;
  const mine = await listingsBySeller(user.id);

  return <main className="page">
    <div className="page-head">
      <div><div className="eyebrow">SELL ON SHOPSPHERE</div><h1>{editable ? 'Edit listing' : 'List something'}</h1><p>Sell items, offer trade-ins, or list a property for sale or rent.</p></div>
      <Link className="btn btn-ghost" href="/sell/payouts"><Wallet size={16} /> Payout settings</Link>
    </div>
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div className="card">
        {!features.storage && <div className="alert alert-warn">Image uploads need SUPABASE_SERVICE_ROLE_KEY. You can paste image URLs instead.</div>}
        <ListingForm key={editable?.id ?? 'new'} initial={editable} />
      </div>
      <div className="card">
        <h2>Your listings ({mine.length})</h2>
        {mine.length === 0 ? <p className="hint">Nothing listed yet.</p> : <div className="table-wrap"><table className="table"><tbody>
          {mine.map((l) => <tr key={l.id}>
            <td><Link href={`/products/${l.id}`}><strong>{l.title}</strong></Link><br /><span className="hint">{listingTypeLabel[l.listingType]} · stock {l.stockQty}</span></td>
            <td><span className={`pill ${l.status === 'active' ? 'pill-green' : l.status === 'sold' ? 'pill-red' : ''}`}>{l.status}</span></td>
            <td className="num">{money(l.price)}</td>
            <td className="num"><Link className="btn btn-ghost btn-sm" href={`/sell?edit=${l.id}`}>Edit</Link> <RemoveListingButton id={l.id} /></td>
          </tr>)}
        </tbody></table></div>}
      </div>
    </div>
  </main>;
}
