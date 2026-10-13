'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, Heart, LayoutGrid, LocateFixed, MapPin, MessageCircle, Search, ShoppingBag, ShoppingCart, Wallet, ListOrdered, Tag, Package, PieChart, User, LogOut, Compass } from 'lucide-react';
import { CATEGORIES, categoryHref } from '@/lib/categories';
import SidePanel, { type PanelKind } from '@/components/SidePanel';

type HeaderUser = { displayName: string; avatarUrl: string; isAdmin: boolean } | null;

export default function HeaderBar({ user, cartCount }: { user: HeaderUser; cartCount: number }) {
  const [panel, setPanel] = useState<PanelKind | null>(null);
  const [menu, setMenu] = useState(false);
  const [counts, setCounts] = useState({ unread: 0, chats: 0 });
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setPanel(null); setMenu(false); }, [pathname]);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = () => fetch('/api/notifications').then((r) => (r.ok ? r.json() : null)).then((d) => { if (alive && d) setCounts({ unread: d.unread ?? 0, chats: d.chats ?? 0 }); }).catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, [user]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggle = (kind: PanelKind) => setPanel((p) => (p === kind ? null : kind));
  const icon = (kind: PanelKind, label: string, Icon: typeof Heart, badge = 0) =>
    <button className={`header-icon ${panel === kind ? 'is-active' : ''}`} onClick={() => toggle(kind)} aria-label={label} aria-expanded={panel === kind}>
      <Icon size={20} />{badge > 0 && <span className="dot">{badge > 99 ? '99+' : badge}</span>}
    </button>;

  return <header className="app-header">
    <div className="nav-row">
      <Link href="/" className="brand-mark"><span className="brand-icon"><ShoppingBag size={20} /></span><span>shop<span className="brand-accent">sphere</span></span></Link>
      <nav className="nav-cats" aria-label="Categories">
        {CATEGORIES.filter((c) => c.nav).slice(0, 5).map((c) => <Link key={c.slug} href={categoryHref(c)}>{c.label.replace(' & Gadgets', '')}</Link>)}
      </nav>
      <button className={`nav-all ${panel === 'categories' ? 'is-active' : ''}`} onClick={() => toggle('categories')}><LayoutGrid size={17} /> All Categories</button>
      <div className="nav-actions">
        {user ? <div className="account-menu" ref={menuRef}>
          <button className="account-trigger" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span className="avatar">{user.displayName[0]?.toUpperCase()}</span>}
            <span className="account-name">{user.displayName}</span><ChevronDown size={14} />
          </button>
          {menu && <div className="dropdown" role="menu">
            <Link href="/account" role="menuitem"><User size={16} /> My account</Link>
            <div className="dropdown-label">Selling</div>
            <Link href="/sell/listings" role="menuitem"><ListOrdered size={16} /> My listings</Link>
            <Link href="/orders?view=sales" role="menuitem"><Tag size={16} /> My sales</Link>
            <Link href="/sell/payouts" role="menuitem"><Wallet size={16} /> Payouts</Link>
            <div className="dropdown-label">Buying</div>
            <Link href="/orders" role="menuitem"><Package size={16} /> My purchases</Link>
            <Link href="/likes" role="menuitem"><Heart size={16} /> My likes</Link>
            <div className="dropdown-label">Money</div>
            <Link href="/finance" role="menuitem"><Wallet size={16} /> Finance dashboard</Link>
            <Link href="/spending" role="menuitem"><PieChart size={16} /> Spending</Link>
            {user.isAdmin && <><div className="dropdown-label">Admin</div><Link href="/admin/discovery" role="menuitem"><Compass size={16} /> Product discovery</Link></>}
            <hr />
            <form action="/auth/signout" method="post"><button type="submit" role="menuitem"><LogOut size={16} /> Log out</button></form>
          </div>}
        </div> : <Link className="nav-signin" href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link>}
        {icon('likes', 'Likes', Heart)}
        {icon('cart', `Cart, ${cartCount} items`, ShoppingCart, cartCount)}
        {user && icon('updates', 'Updates', Bell, counts.unread)}
        {user && icon('chats', 'Chats', MessageCircle, counts.chats)}
        <Link className="sell-cta" href="/sell">Sell</Link>
      </div>
    </div>
    <Suspense fallback={<div className="search-row" />}><SearchRow /></Suspense>
    <SidePanel kind={panel} onClose={() => setPanel(null)} onKind={setPanel} signedIn={Boolean(user)} />
  </header>;
}

type Place = { name: string; source: string };

function SearchRow() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [location, setLocation] = useState(params.get('location') ?? '');
  const [places, setPlaces] = useState<Place[]>([]);
  const [showPlaces, setShowPlaces] = useState(false);
  const [locating, setLocating] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(params.get('q') ?? ''); setLocation(params.get('location') ?? ''); }, [params]);
  useEffect(() => {
    if (!showPlaces) return;
    const c = new AbortController();
    const t = setTimeout(() => fetch(`/api/locations?q=${encodeURIComponent(location)}`, { signal: c.signal }).then((r) => r.json()).then((d) => setPlaces(d.items ?? [])).catch(() => {}), 200);
    return () => { clearTimeout(t); c.abort(); };
  }, [location, showPlaces]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setShowPlaces(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function go(nextLocation = location) {
    const p = new URLSearchParams(params.toString());
    if (q.trim()) p.set('q', q.trim()); else p.delete('q');
    if (nextLocation.trim()) p.set('location', nextLocation.trim()); else p.delete('location');
    setShowPlaces(false);
    router.push(`/search?${p}`);
  }

  function nearMe() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const res = await fetch(`/api/locations?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`).then((r) => r.json()).catch(() => null);
      setLocating(false);
      if (res?.nearest) { setLocation(res.nearest); go(res.nearest); } else setPlaces([{ name: 'You appear to be outside Singapore', source: 'none' }]);
    }, () => setLocating(false), { timeout: 8000 });
  }

  return <form className="search-row" onSubmit={(e) => { e.preventDefault(); go(); }} role="search">
    <label className="search-field"><Search size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for an item" aria-label="Search for an item" /></label>
    <div className="search-field location-field" ref={boxRef}>
      <MapPin size={18} />
      <input value={location} onFocus={() => setShowPlaces(true)} onChange={(e) => { setLocation(e.target.value); setShowPlaces(true); }} placeholder="All of Singapore" aria-label="Location" />
      {showPlaces && <div className="place-list">
        <button type="button" onClick={nearMe} disabled={locating}><LocateFixed size={15} /> {locating ? 'Locating…' : 'Use my current location'}</button>
        <button type="button" onClick={() => { setLocation(''); go(''); }}><MapPin size={15} /> All of Singapore</button>
        {places.map((p) => <button type="button" key={p.name} disabled={p.source === 'none'} onClick={() => { setLocation(p.name); go(p.name); }}>{p.name}{p.source === 'serpapi' && <small> · SerpApi</small>}</button>)}
      </div>}
    </div>
    <button className="btn search-go" type="submit">Search</button>
  </form>;
}
