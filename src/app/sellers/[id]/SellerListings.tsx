'use client';

import ProductCard, { type CardItem } from '@/components/ProductCard';
import { useLikes } from '@/components/useLikes';

/** Active listings for one seller, with the same save (like) behaviour as the marketplace. */
export default function SellerListings({ items }: { items: CardItem[] }) {
  const { ids: liked, toggle } = useLikes();
  if (!items.length) return <div className="empty-results"><h3>No active listings right now</h3><p>Check back later.</p></div>;
  return <div className="product-grid">
    {items.map((p) => <ProductCard key={p.id} product={p} saved={liked.includes(p.id)} onSave={toggle} />)}
  </div>;
}
