import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Pencil, Store } from 'lucide-react';
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

  const images = item.images.length ? item.images : item.image ? [item.image] : [];
  const mine = Boolean(user && item.sellerId === user.id);
  if (item.status === 'draft' && !mine) notFound();
  const property = isProperty(item.listingType);
  const available = item.status === 'active' && item.stockQty > 0;
  const p = item.property;

  return <main className="page">
    <p className="hint"><Link href="/">← Back to search</Link></p>
    <div className="detail" style={{ marginTop: 12 }}>
      <div>
        <div className="gallery-main">{images[0] ? <img src={images[0]} alt={item.title} /> : null}</div>
        {images.length > 1 && <div className="thumbs">{images.slice(1).map((src) => <img key={src} src={src} alt="" />)}</div>}
      </div>
      <div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="pill">{listingTypeLabel[item.listingType]}</span>
          {item.isSample && <span className="pill pill-warn">Sample listing · not a live offer</span>}
          {item.status === 'sold' && <span className="pill pill-red">Sold</span>}
          {item.status === 'draft' && <span className="pill">Draft</span>}
        </div>
        <h1>{item.title}</h1>
        <div className="price">{money(item.price)}{item.listingType === 'property_rent' && <small style={{ fontSize: 14 }}> / month</small>}</div>
        <dl className="spec">
          <dt>Brand</dt><dd>{item.brand}</dd>
          <dt>Model</dt><dd>{item.model}</dd>
          <dt>Category</dt><dd>{item.category}</dd>
          {item.condition && <><dt>Condition</dt><dd>{item.condition}</dd></>}
          {!property && <><dt>In stock</dt><dd>{item.stockQty}</dd></>}
          {p && <>
            <dt>Property type</dt><dd>{p.propertyType}</dd>
            {p.bedrooms !== undefined && <><dt>Bedrooms</dt><dd>{p.bedrooms}</dd></>}
            {p.bathrooms !== undefined && <><dt>Bathrooms</dt><dd>{p.bathrooms}</dd></>}
            {p.floorAreaSqft && <><dt>Floor area</dt><dd>{p.floorAreaSqft.toLocaleString('en-SG')} sqft</dd></>}
            {p.tenure && <><dt>Tenure</dt><dd>{p.tenure}</dd></>}
            {p.district && <><dt>District</dt><dd>{p.district}</dd></>}
            {p.furnishing && <><dt>Furnishing</dt><dd>{p.furnishing}</dd></>}
            {p.availableFrom && <><dt>Available from</dt><dd>{p.availableFrom}</dd></>}
          </>}
          <dt>Location</dt><dd><MapPin size={12} /> {item.location}</dd>
          <dt>Seller</dt><dd><Store size={12} /> {item.seller}</dd>
          <dt>Listed</dt><dd>{dateOnly(item.createdAt)}</dd>
        </dl>
        <div style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
          {mine ? <Link className="btn" href={`/sell?edit=${item.id}`}><Pencil size={15} /> Edit listing</Link> : <>
            {!property && available && <AddToCartButton productId={item.id} className="btn btn-block" />}
            {!item.isSample && <ChatWithSeller productId={item.id} signedIn={Boolean(user)} className="btn btn-ghost btn-block"
              label={property ? 'Enquire & book a viewing' : item.listingType === 'trade_in' ? 'Offer a trade-in' : 'Chat with seller'} />}
          </>}
        </div>
        {property && <p className="hint" style={{ marginTop: 12 }}>Property deposits, rent and purchases involve contracts and are not paid through cart checkout. Arrange viewings and next steps with the lister in chat.</p>}
        {item.description && <div className="card" style={{ marginTop: 20 }}><h3>Description</h3><p style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{item.description}</p></div>}
      </div>
    </div>
  </main>;
}
