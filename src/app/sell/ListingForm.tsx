'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

type Initial = {
  id: string; title: string; brand: string; model: string; category: string; price: number; condition: string | null;
  location: string; description: string; listingType: string; stockQty: number; images: string[]; image: string; status: string;
  property: Record<string, unknown> | null;
} | null;

const PROPERTY_TYPES = ['HDB', 'Condo', 'Landed', 'Commercial', 'Room'];

export default function ListingForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [listingType, setListingType] = useState(initial?.listingType ?? 'goods');
  const [images, setImages] = useState<string[]>(initial?.images.length ? initial.images : initial?.image ? [initial.image] : []);
  const [urlDraft, setUrlDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const property = listingType === 'property_sale' || listingType === 'property_rent';
  const p = (initial?.property ?? {}) as Record<string, string | number | undefined>;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError('');
    for (const file of Array.from(files).slice(0, 8 - images.length)) {
      const body = new FormData();
      body.set('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? 'Upload failed.'); return; }
      setImages((curr) => [...curr, data.url]);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const val = (k: string) => { const v = f.get(k); return v === null || v === '' ? undefined : String(v); };
    const payload = {
      title: val('title'), brand: val('brand') ?? (property ? 'Property' : ''), model: val('model') ?? (property ? val('propertyType') : ''),
      category: property ? 'Property' : val('category'), price: Number(f.get('price')), condition: property ? null : val('condition'),
      location: val('location') ?? 'Singapore', description: val('description') ?? '', listingType,
      stockQty: property ? 1 : Number(f.get('stockQty') ?? 1), images, status: f.get('publish') ? 'active' : 'draft',
      property: property ? {
        propertyType: val('propertyType'), bedrooms: val('bedrooms'), bathrooms: val('bathrooms'), floorAreaSqft: val('floorAreaSqft'),
        tenure: val('tenure'), district: val('district'), furnishing: val('furnishing'), availableFrom: val('availableFrom'),
      } : null,
    };
    setBusy(true);
    setError('');
    const res = await fetch(initial ? `/api/products/${initial.id}` : '/api/products', {
      method: initial ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? 'Could not save the listing.');
    router.push(`/products/${data.id}`);
    router.refresh();
  }

  return <form className="form" onSubmit={submit}>
    <label>Listing type
      <select value={listingType} onChange={(e) => setListingType(e.target.value)}>
        <option value="goods">Item for sale</option><option value="trade_in">Item — open to trade-in / swap</option>
        <option value="property_sale">Property for sale</option><option value="property_rent">Property for rent</option>
      </select>
    </label>
    <label>Title<input name="title" required minLength={3} maxLength={140} defaultValue={initial?.title} placeholder={property ? 'e.g. 4-room HDB near Tampines MRT' : 'e.g. iPhone 17 Pro Max 256GB'} /></label>
    {property ? <>
      <div className="form-row">
        <label>Property type<select name="propertyType" defaultValue={String(p.propertyType ?? 'HDB')}>{PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>Bedrooms<input name="bedrooms" type="number" min={0} max={20} defaultValue={p.bedrooms} /></label>
        <label>Bathrooms<input name="bathrooms" type="number" min={0} max={20} defaultValue={p.bathrooms} /></label>
      </div>
      <div className="form-row">
        <label>Floor area (sqft)<input name="floorAreaSqft" type="number" min={1} defaultValue={p.floorAreaSqft} /></label>
        <label>Tenure<input name="tenure" maxLength={40} defaultValue={p.tenure} placeholder="99-year / Freehold" /></label>
        <label>District<input name="district" maxLength={80} defaultValue={p.district} placeholder="D18 Tampines" /></label>
      </div>
      <div className="form-row">
        <label>Furnishing<select name="furnishing" defaultValue={String(p.furnishing ?? '')}><option value="">—</option><option>Unfurnished</option><option>Partially furnished</option><option>Fully furnished</option></select></label>
        <label>Available from<input name="availableFrom" type="date" defaultValue={p.availableFrom} /></label>
      </div>
    </> : <>
      <div className="form-row">
        <label>Brand<input name="brand" required maxLength={60} defaultValue={initial?.brand} placeholder="Apple" /></label>
        <label>Model<input name="model" required maxLength={80} defaultValue={initial?.model} placeholder="iPhone 17 Pro Max" /></label>
      </div>
      <div className="form-row">
        <label>Category<select name="category" defaultValue={initial?.category ?? 'Phones'}><option>Phones</option><option>Tablets</option><option>Laptops</option><option>Accessories</option><option>Fashion</option><option>Home &amp; living</option><option>Other</option></select></label>
        <label>Condition<select name="condition" defaultValue={initial?.condition ?? 'Like new'}><option>New</option><option>Like new</option><option>Good</option><option>Fair</option></select></label>
        <label>Quantity<input name="stockQty" type="number" min={1} max={10000} defaultValue={initial?.stockQty ?? 1} /></label>
      </div>
    </>}
    <div className="form-row">
      <label>{listingType === 'property_rent' ? 'Monthly rent (SGD)' : 'Price (SGD)'}<input name="price" type="number" min={1} step="0.01" required defaultValue={initial?.price} /></label>
      <label>Location<input name="location" maxLength={80} defaultValue={initial?.location ?? ''} placeholder="Tampines" /></label>
    </div>
    <label>Description<textarea name="description" rows={4} maxLength={5000} defaultValue={initial?.description} placeholder={listingType === 'trade_in' ? 'What would you accept in exchange? Include condition and accessories.' : 'Condition, what is included, pickup or delivery details.'} /></label>

    <div className="field">Photos ({images.length}/8)
      <div className="thumbs" style={{ flexWrap: 'wrap' }}>
        {images.map((src) => <span key={src} style={{ position: 'relative' }}><img src={src} alt="" /><button type="button" className="heart-button" style={{ top: -6, right: -6, width: 22, height: 22 }} onClick={() => setImages((c) => c.filter((x) => x !== src))} aria-label="Remove photo"><X size={12} /></button></span>)}
        {images.length < 8 && <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}><ImagePlus size={15} /> Upload<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} /></label>}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="input" value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder="…or paste an https:// image URL" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (/^https:\/\//.test(urlDraft) && images.length < 8) { setImages((c) => [...c, urlDraft]); setUrlDraft(''); } }}>Add</button>
      </div>
    </div>

    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" name="publish" defaultChecked={initial ? initial.status !== 'draft' : true} style={{ width: 'auto' }} /> Publish now (untick to save as draft)</label>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create listing'}</button>
  </form>;
}
