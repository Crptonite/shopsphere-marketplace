import { isDocumentUrl, isImageUrl, urlExtension } from '@/lib/files';
import { BadgeCheck, FileText, MapPin, Pencil, ShieldAlert, Star, Store } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getListing, type Listing } from '@/lib/products';
import { catalog } from '@/lib/catalog';
import { dateOnly, isProperty, listingTypeLabel, money } from '@/lib/format';
import AddToCartButton from '@/components/AddToCartButton';
import ChatWithSeller from '@/components/ChatWithSeller';

async function load(id: string): Promise<Listing | null> {
  if (hasDb()) return getListing(id);
  const demo = catalog.find((p) => p.id === id);
  return demo ? { ...demo, images: [], sellerId: null, status: 'active', listingType: 'goods', stockQty: 1, property: null } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const item = await load((await params).id).catch(() => null);
  return { title: item ? `${item.title} — ShopSphere` : 'Listing — ShopSphere' };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, user] = await Promise.all([load(id), getCurrentUser().catch(() => null)]);
  if (!item || item.status === 'removed') notFound();

  const photos = item.images.filter(isImageUrl);
  const documents = item.images.filter(isDocumentUrl);
  const images = photos.length ? photos : item.image ? [item.image] : [];
  const mine = Boolean(user && item.sellerId === user.id);
  if (item.status === 'draft' && !mine) notFound();
  const property = isProperty(item.listingType);
  const available = item.status === 'active' && item.stockQty > 0;
  const p = item.property;
  const sellerName = item.seller || 'Seller';
  const handle = sellerName.startsWith('@') ? sellerName : `@${sellerName.replace(/\s+/g, '_').toLowerCase()}`;

  const specs: [string, string][] = [
    ['Condition', item.condition ?? '—'],
    ['Brand', item.brand || '—'],
    ['Model', item.model || '—'],
    ['Category', item.category || '—'],
    ['Listed', `${dateOnly(item.createdAt)} by ${handle}`],
  ];
  if (!property) specs.push(['In stock', String(item.stockQty)]);
  if (p) {
    specs.push(['Property type', p.propertyType]);
    if (p.bedrooms !== undefined) specs.push(['Bedrooms', String(p.bedrooms)]);
    if (p.bathrooms !== undefined) specs.push(['Bathrooms', String(p.bathrooms)]);
    if (p.floorAreaSqft) specs.push(['Floor area', `${p.floorAreaSqft.toLocaleString('en-SG')} sqft`]);
    if (p.tenure) specs.push(['Tenure', p.tenure]);
    if (p.district) specs.push(['District', p.district]);
    if (p.furnishing) specs.push(['Furnishing', p.furnishing]);
    if (p.availableFrom) specs.push(['Available from', p.availableFrom]);
  }

  return <main className="page">
    <p className="hint"><Link href="/">← Back to search</Link></p>
    <div className="pd-layout">
      <div className="pd-main">
        <div className="pd-card pd-head">
          <div className="pd-gallery">
            <div className="gallery-main">{images[0] ? <img src={images[0]} alt={item.title} /> : null}</div>
            {images.length > 1 && <div className="thumbs">{images.slice(1).map((src) => <img key={src} src={src} alt="" />)}</div>}
            {documents.length > 0 && <div className="doc-list">{documents.map((url) => <a key={url} className="doc-chip" href={url} target="_blank" rel="noreferrer"><FileText size={14} /> {urlExtension(url).toUpperCase()} document</a>)}</div>}
          </div>
          <div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="pill">{listingTypeLabel[item.listingType]}</span>
              {item.isSample && <span className="pill pill-warn">Sample listing · not a live offer</span>}
              {item.status === 'sold' && <span className="pill pill-red">Sold</span>}
              {item.status === 'draft' && <span className="pill">Draft</span>}
            </div>
            <h1 className="pd-title">{item.title}</h1>
            <div className="pd-price">{money(item.price)}{item.listingType === 'property_rent' && <small> / month</small>}</div>
          </div>
        </div>

        <div className="pd-card">
          <h3>Details</h3>
          <dl className="pd-specs">
            {specs.map(([k, v]) => <div key={k} className="pd-spec"><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </div>

        <div className="pd-card">
          <h3>Deal method</h3>
          <p className="pd-row"><Store size={15} /> <strong>Meet-up</strong></p>
          <p className="pd-row"><MapPin size={15} /> <a href={`https://www.google.com/maps/search/${encodeURIComponent(item.location)}`} target="_blank" rel="noreferrer">{item.location}</a></p>
        </div>

        {property && <p className="hint">Property deposits, rent and purchases involve contracts and are not paid through cart checkout. Arrange viewings and next steps with the lister in chat.</p>}
        {item.description && <div className="pd-card"><h3>Description</h3><p className="pd-desc">{item.description}</p></div>}

        <div className="pd-card" id="meet-the-seller">
          <h3>Meet the seller</h3>
          <div className="pd-seller-row">
            <span className="pd-avatar">{sellerName.replace('@', '').slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{handle}</strong> <BadgeCheck size={14} className="pd-verified" aria-label="Verified" />
              <div className="pd-muted">Listed on ShopSphere</div>
            </div>
          </div>
          <div className="pd-reviews-head"><Star size={14} /> No reviews yet</div>
        </div>
      </div>

      <aside className="pd-side">
        <div className="pd-card">
          <div className="pd-seller-row">
            <span className="pd-avatar">{sellerName.replace('@', '').slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{handle}</strong> <BadgeCheck size={14} className="pd-verified" aria-label="Verified" />
              <div className="pd-muted">No reviews yet</div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
            {mine ? <Link className="btn btn-block" href={`/sell?edit=${item.id}`}><Pencil size={15} /> Edit listing</Link> : <>
              {!item.isSample && <ChatWithSeller productId={item.id} signedIn={Boolean(user)} className="btn btn-chat btn-block"
                label={property ? 'Enquire & book a viewing' : item.listingType === 'trade_in' ? 'Offer a trade-in' : 'View Chat'} />}
              {!property && available && <AddToCartButton productId={item.id} className="btn btn-ghost btn-block" />}
            </>}
          </div>

          {!mine && !property && <div className="pd-offer">
            <div className="pd-offer-input">
              <span>S$</span>
              <input type="number" defaultValue={item.price} min={1} aria-label="Your offer in SGD" disabled />
            </div>
            <button className="btn btn-ghost" disabled title="Offers are not available yet">Make Offer</button>
          </div>}
        </div>

        <div className="pd-card pd-policy">
          <p><strong>Returns and refunds</strong><br />Depends on the seller&apos;s decision. Not covered by Buyer Protection.</p>
          <p><ShieldAlert size={14} /> <strong>Safety policy</strong><br />Pay only at the meet-up. Transferring money directly to strangers puts you at risk of e-commerce scams.</p>
        </div>
      </aside>
    </div>
  </main>;
}
