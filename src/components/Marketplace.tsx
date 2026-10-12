'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowDownUp, ArrowRight, Check, ChevronDown, ExternalLink, Search, SlidersHorizontal, Sparkles, Store } from 'lucide-react';
import ProductCard, { type CardItem } from '@/components/ProductCard';
import { useLikes } from '@/components/useLikes';
import { CATEGORIES, categoryHref } from '@/lib/categories';

type External = { id: number; title: string; priceText: string | null; thumbnail: string | null; merchant: string | null; sourceUrl: string; retrievedAt: string };
type SearchResponse = { mode: string; items: CardItem[]; external?: External[]; semanticSearchEnabled?: boolean; message?: string; error?: string };

const FILTER_KEYS = ['listingType', 'brand', 'category', 'condition', 'location', 'minPrice', 'maxPrice', 'model'] as const;

/**
 * Listing grid driven entirely by the URL (?q, ?location, filters, ?sort), so the navbar
 * search, category links and this page's filters all stay in sync and are shareable.
 */
export default function Marketplace({ variant }: { variant: 'home' | 'results' }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { ids: liked, toggle } = useLikes();
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [smartBusy, setSmartBusy] = useState(false);
  const [smartNote, setSmartNote] = useState('');

  const q = params.get('q') ?? '';
  const sort = params.get('sort') === 'recent' ? 'recent' : 'best_match';
  const key = params.toString();

  useEffect(() => {
    const controller = new AbortController();
    const p = new URLSearchParams(key);
    p.set('limit', '48');
    setLoading(true);
    fetch(`/api/search?${p}`, { signal: controller.signal })
      .then((r) => r.json()).then((d: SearchResponse) => { setData(d); setLoading(false); })
      .catch((e) => { if (e.name !== 'AbortError') { setData({ mode: 'error', items: [], error: 'Search is unavailable.' }); setLoading(false); } });
    return () => controller.abort();
  }, [key]);

  function update(changes: Record<string, string | undefined>) {
    const p = new URLSearchParams(key);
    for (const [k, v] of Object.entries(changes)) { if (v) p.set(k, v); else p.delete(k); }
    const target = variant === 'home' && (p.get('q') || FILTER_KEYS.some((k) => p.get(k))) ? '/search' : pathname;
    router.replace(`${target}?${p}`, { scroll: false });
  }

  async function smartSearch() {
    if (!q) return;
    setSmartBusy(true);
    try {
      const { filters, ai } = await fetch(`/api/search/parse?q=${encodeURIComponent(q)}`).then((r) => r.json());
      const { q: rest, ...structured } = filters ?? {};
      update({ q: rest ?? q, ...Object.fromEntries(Object.entries(structured).map(([k, v]) => [k, String(v)])) });
      const parts = Object.entries(structured).map(([k, v]) => `${k}: ${v}`);
      setSmartNote(ai ? (parts.length ? `Understood → ${parts.join(' · ')}` : 'No extra filters found; searching by keywords.') : 'Smart search needs GROQ_API_KEY.');
    } finally {
      setSmartBusy(false);
    }
  }

  const val = (k: string) => params.get(k) ?? '';
  const hasFilters = FILTER_KEYS.some((k) => params.get(k));
  const items = data?.items ?? [];
  const isDemo = data?.mode === 'demo';
  const heading = q ? `Results for “${q}”` : CATEGORIES.find((c) => Object.entries(c.params).every(([k, v]) => params.get(k) === v))?.label
    ?? (variant === 'home' ? 'Finds worth finding.' : 'All listings');

  return <main>
    {variant === 'home' && <>
      <section className="hero" id="discover" style={{ marginTop: 20 }}>
        <div className="hero-content">
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT GREAT FIND IS HERE</div>
          <h1>Good things find<br />a <em>second life.</em></h1>
          <p>Buy what you love. Sell what you don&apos;t.<br className="desktop-break" /> Swap gadgets, find a home, or rent a room across Singapore.</p>
          <div className="hero-trust"><span><Check size={15} /> Local sellers</span><span><Check size={15} /> Verified payments</span><span><Check size={15} /> SGD pricing</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-card art-card-back"><img src="https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=500&q=85" alt="" /></div>
          <div className="art-card art-card-front"><img src="https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=500&q=85" alt="" /><div className="art-label"><span>THE TECH EDIT</span><strong>Find your next upgrade.</strong></div></div>
          <div className="floating-pill pill-top"><Sparkles size={15} /> Smart search</div><div className="floating-pill pill-bottom"><span className="green-dot" /> Singapore sellers</div>
        </div>
      </section>
      <section className="category-section" id="categories">
        <div className="section-top"><div><div className="eyebrow">BROWSE YOUR WAY</div><h2>Explore categories</h2></div><Link href="/categories" className="text-link">All categories <ArrowRight size={16} /></Link></div>
        <div className="category-grid">
          {CATEGORIES.filter((c) => c.nav).slice(0, 4).map((c, i) => <Link className={`category-tile ${c.tone}`} key={c.slug} href={categoryHref(c)}>
            <span className="category-number">{String(i + 1).padStart(2, '0')}</span><span className="category-title">{c.label}</span><span className="category-detail">{c.detail}</span><span className="category-arrow"><ArrowRight size={17} /></span>
          </Link>)}
        </div>
      </section>
    </>}

    <section className="listings-section" id="listings" style={variant === 'results' ? { marginTop: 28 } : undefined}>
      <div className="section-top listings-top">
        <div><div className="eyebrow">{variant === 'home' ? 'HANDPICKED FOR YOU' : 'SEARCH'}</div><h2>{heading}</h2>
          <p>{loading ? 'Searching…' : `${items.length} ${items.length === 1 ? 'listing' : 'listings'}`}{val('location') ? ` near ${val('location')}` : ' · All of Singapore'}{data?.semanticSearchEnabled ? ' · AI-ranked' : ''}{isDemo ? ' · Demo catalogue' : ''}</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          {q && <button className="btn btn-ghost btn-sm" onClick={smartSearch} disabled={smartBusy} title="Understand price, location and model from your words"><Sparkles size={15} /> {smartBusy ? 'Thinking…' : 'Smart filters'}</button>}
          <div className="sort-control"><ArrowDownUp size={16} /><select aria-label="Sort listings" value={sort} onChange={(e) => update({ sort: e.target.value === 'recent' ? 'recent' : undefined })}><option value="best_match">Best match</option><option value="recent">Most recent</option></select><ChevronDown size={15} /></div>
        </div>
      </div>
      {smartNote && <p className="hint">{smartNote}</p>}
      <div className="filters-row">
        <div className="filter-label"><SlidersHorizontal size={15} /> Filter by</div>
        <select value={val('listingType')} onChange={(e) => update({ listingType: e.target.value })} aria-label="Listing type"><option value="">All types</option><option value="goods">For sale</option><option value="trade_in">Trade-in / swap</option><option value="property_sale">Property for sale</option><option value="property_rent">Property for rent</option></select>
        <select value={val('brand')} onChange={(e) => update({ brand: e.target.value })} aria-label="Brand"><option value="">All brands</option><option>Apple</option><option>Samsung</option><option>Google</option><option>Sony</option><option>Accessories</option></select>
        <select value={val('condition')} onChange={(e) => update({ condition: e.target.value })} aria-label="Condition"><option value="">All conditions</option><option>New</option><option>Like new</option><option>Good</option><option>Fair</option></select>
        <input type="number" min={0} defaultValue={val('minPrice')} key={`min-${val('minPrice')}`} onBlur={(e) => update({ minPrice: e.target.value })} placeholder="Min S$" aria-label="Minimum price" />
        <input type="number" min={0} defaultValue={val('maxPrice')} key={`max-${val('maxPrice')}`} onBlur={(e) => update({ maxPrice: e.target.value })} placeholder="Max S$" aria-label="Maximum price" />
        {hasFilters && <button className="reset-filter" onClick={() => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])))}>Reset</button>}
      </div>
      {data?.error && <div className="alert alert-error">{data.error}</div>}
      {items.length > 0
        ? <div className="product-grid">{items.map((p) => <ProductCard key={p.id} product={p} saved={liked.includes(p.id)} onSave={toggle} />)}</div>
        : !loading && <div className="empty-results"><Search size={28} /><h3>No listings match that search yet</h3><p>Try iPhone, Samsung, 17, 18 — or clear the filters and location.</p><Link className="search-submit" href="/search">Clear search</Link></div>}

      {(data?.external?.length ?? 0) > 0 && <div className="external-rail">
        <div className="eyebrow">ELSEWHERE ONLINE · EXTERNAL · UNVERIFIED</div>
        <p className="hint">Discovery results from Google Shopping (Singapore). Not ShopSphere stock — prices and availability may have changed since retrieval.</p>
        <div className="external-grid">{data!.external!.map((x) => <a key={x.id} className="external-card" href={x.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
          {x.thumbnail && <img src={x.thumbnail} alt="" />}<span><strong>{x.title}</strong><br />{x.priceText ?? 'Price n/a'} · {x.merchant ?? 'Unknown merchant'}<br /><small>Retrieved {new Date(x.retrievedAt).toLocaleDateString('en-SG')} <ExternalLink size={10} /></small></span></a>)}</div>
      </div>}

      {isDemo && <div className="catalog-note"><Sparkles size={16} /><span><strong>Demo catalogue:</strong> Without a database these are illustrative sample listings, not live offers. Configure DATABASE_URL and run the migrations to enable the full marketplace.</span></div>}
    </section>

    {variant === 'home' && <section className="sell-banner" id="how-it-works"><div className="sell-banner-icon"><Store size={27} /></div><div><div className="eyebrow">GIVE YOUR GOOD STUFF A NEW HOME</div><h2>Something to sell, swap or rent?</h2><p>List an item or property and chat with buyers directly.</p></div><Link className="sell-banner-button" href="/sell">Start selling <ArrowRight size={17} /></Link></section>}
  </main>;
}
