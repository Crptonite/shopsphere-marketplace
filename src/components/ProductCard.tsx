'use client';

import Link from 'next/link';
import { Heart, Store } from 'lucide-react';
import AddToCartButton from '@/components/AddToCartButton';
import { isProperty, listingTypeLabel, money } from '@/lib/format';

export type CardItem = {
  id: string;
  title: string;
  brand: string;
  condition: string | null;
  price: number;
  image: string;
  images?: string[];
  seller: string;
  location: string;
  isSample: boolean;
  listingType?: string;
  stockQty?: number;
};

export default function ProductCard({ product, saved, onSave }: { product: CardItem; saved: boolean; onSave: (id: string) => void }) {
  const type = product.listingType ?? 'goods';
  const image = product.images?.[0] || product.image;
  return <article className="product-card">
    <div className="product-image-wrap">
      <Link className="cover" href={`/products/${product.id}`} aria-label={product.title}>
        {image ? <img className="product-image" src={image} alt={product.title} /> : <div className="product-image" />}
      </Link>
      {product.isSample ? <span className="sample-tag">SAMPLE LISTING</span> : type !== 'goods' && <span className="sample-tag">{listingTypeLabel[type].toUpperCase()}</span>}
      <button className={`heart-button ${saved ? 'is-saved' : ''}`} aria-label="Save item" onClick={() => onSave(product.id)}><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button>
    </div>
    <div className="product-info">
      <div className="product-meta"><span>{product.brand}</span>{product.condition && <><span>·</span><span>{product.condition}</span></>}</div>
      <h3><Link href={`/products/${product.id}`}>{product.title}</Link></h3>
      <p className="product-price">{money(product.price)}{type === 'property_rent' && <small style={{ fontSize: 11, fontWeight: 600 }}> /mo</small>}</p>
      <p className="seller-line"><Store size={13} /> {product.seller} <span>· {product.location}</span></p>
      {isProperty(type)
        ? <Link className="add-cart" href={`/products/${product.id}`}>View &amp; enquire</Link>
        : <AddToCartButton productId={product.id} className="add-cart" />}
    </div>
  </article>;
}
