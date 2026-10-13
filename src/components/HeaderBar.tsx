'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, Heart, LayoutGrid, LocateFixed, MapPin, MessageCircle, Search, ShoppingBag, ShoppingCart, Wallet, ListOrdered, Tag, Package, PieChart, User, LogOut, Compass, Megaphone, Users, Settings, Ticket, BadgeCheck, ListChecks, ChartColumn } from 'lucide-react';
import { CATEGORIES, categoryHref } from '@/lib/categories';
import SidePanel, { type PanelKind } from '@/components/SidePanel';
import MegaMenu from '@/components/MegaMenu';
import { COLLECTIBLES_MENU, FASHION_LUXURY_MENU, HOME_SERVICES_MENU } from '@/lib/mega-menu';
import { money } from '@/lib/format';

type HeaderUser = { displayName: string; avatarUrl: string; isAdmin: boolean } | null;

export default function HeaderBar({ user, cartCount }: { user: HeaderUser; cartCount: number }) {
  const [panel, setPanel] = useState<PanelKind | null>(null);
  const [menu, setMenu] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
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
      <MegaMenu label="Home & Services" id="mega-home-services" columns={HOME_SERVICES_MENU} />
      <MegaMenu label="Collectibles" id="mega-collectibles" columns={COLLECTIBLES_MENU} />
      <MegaMenu label="Fashion & Luxury" id="mega-fashion" columns={FASHION_LUXURY_MENU} />
      <button className={`nav-all ${panel === 'categories' ? 'is-active' : ''}`} onClick={() => toggle('categories')}><LayoutGrid size={17} /> All Categories</button>
      <div className="nav-actions">
        {user ? <div className="account-menu" ref={menuRef}>
          <button className="account-trigger" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span className="avatar">{user.displayName[0]?.toUpperCase()}</span>}
            <span className="account-name">{user.displayName}</span><ChevronDown size={14} />
          </button>
          {menu && <div className="dropdown account-dropdown" role="menu">
            <Link href="/account" role="menuitem"><User size={16} /> My account</Link>
            <div className="dropdown-label">Selling</div>
            <Link href="/sell/listings" role="menuitem"><ListOrdered size={16} /> My listings</Link>
            <Link href="/orders?view=sales" role="menuitem"><Tag size={16} /> My sales</Link>
            <MenuGroup id="manage" label="Manage" icon={ListChecks} open={group === 'manage'} onToggle={setGroup} links={[
              { href: '/sell/listings?tab=active', label: 'Active listings' },
              { href: '/sell/listings?tab=inactive', label: 'Inactive listings' },
              { href: '/sell/listings?tab=others', label: 'Sold & removed' },
              { href: '/sell/payouts', label: 'Payouts' },
            ]} />
            <MenuGroup id="growth" label="Growth & Marketing" icon={Megaphone} open={group === 'growth'} onToggle={setGroup} links={[
              { href: '/sell/listings?tab=active', label: 'Promote listings' },
              { href: '/promos', label: 'Promo calendar' },
            ]} />
            <div className="dropdown-label">Buying</div>
            <Link href="/orders" role="menuitem"><Package size={16} /> My purchases</Link>
            <Link href="/likes" role="menuitem"><Heart size={16} /> My likes</Link>
            <Link href="/saved-searches" role="menuitem"><Search size={16} /> Saved searches</Link>
            <Link href="/promos" role="menuitem"><Ticket size={16} /> My promos</Link>
            <Link href="/certified" role="menuitem"><BadgeCheck size={16} /> Certified services</Link>
            <Link href="/trade" role="menuitem"><ChartColumn size={16} /> Trade</Link>
            <div className="dropdown-label">More</div>
            <Link href="/settings" role="menuitem"><Settings size={16} /> Settings</Link>
            <Link href="/finance" role="menuitem"><Wallet size={16} /> Finance dashboard</Link>
            <Link href="/spending" role="menuitem"><PieChart size={16} /> Spending</Link>
            {user.isAdmin && <><div className="dropdown-label">Admin</div><Link href="/admin/discovery" role="menuitem"><Compass size={16} /> Product discovery</Link><Link href="/admin/users" role="menuitem"><Users size={16} /> Users</Link><Link href="/admin/announcements" role="menuitem"><Megaphone size={16} /> Announcements</Link></>}
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

/** Collapsible group inside the account dropdown. */
function MenuGroup({ id, label, icon: Icon, open, onToggle, links }: {
  id: string; label: string; icon: typeof Heart; open: boolean; onToggle: (id: string | null) => void;
  links: Array<{ href: string; label: string }>;
}) {
  return <>
    <button type="button" role="menuitem" className="menu-group" aria-expanded={open} onClick={() => onToggle(open ? null : id)}>
      <Icon size={16} /> {label} <ChevronDown size={14} />
    </button>
    {open && <div className="menu-sub">{links.map((l) => <Link key={l.href + l.label} href={l.href} role="menuitem">{l.label}</Link>)}</div>}
  </>;
}

type Place = { name: string; source: string };
type Suggest = { products: Array<{ id: string; title: string; price: number }>; groups: Array<{ label: string }> };
const SUGGEST_BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'OPPO'];

function SearchRow() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [location, setLocation] = useState(params.get('location') ?? '');
  const [places, setPlaces] = useState<Place[]>([]);
  const [showPlaces, setShowPlaces] = useState(false);
  const [locating, setLocating] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);
  const [suggest, setSuggest] = useState<Suggest | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (!showSuggest || term.length < 2) return;
    const c = new AbortController();
    const t = setTimeout(() => fetch(`/api/search/autocomplete?q=${encodeURIComponent(term)}`, { signal: c.signal })
      .then((r) => r.json()).then((d: Suggest) => setSuggest(d)).catch(() => {}), 200);
    return () => { clearTimeout(t); c.abort(); };
  }, [q, showSuggest]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!suggestRef.current?.contains(e.target as Node)) setShowSuggest(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

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
    <div className="search-field" ref={suggestRef}>
      <Search size={18} />
      <input value={q} autoComplete="off" onFocus={() => setShowSuggest(true)}
        onChange={(e) => { setQ(e.target.value); setShowSuggest(true); }}
        onKeyDown={(e) => e.key === 'Escape' && setShowSuggest(false)}
        placeholder="Search for an item" aria-label="Search for an item" />
      {showSuggest && q.trim() && <div className="place-list suggest-list">
        <button type="button" onClick={() => { setShowSuggest(false); go(); }}><Search size={15} /> Search for &ldquo;{q.trim()}&rdquo;</button>
        {suggest?.groups.map((g) => <button key={g.label} type="button" onClick={() => { setShowSuggest(false); router.push(`/search?q=${encodeURIComponent(g.label)}`); }}>{g.label}</button>)}
        <div className="suggest-brands"><span>{q.trim()} in</span>
          {SUGGEST_BRANDS.map((b) => <button key={b} type="button" onClick={() => { setShowSuggest(false); router.push(`/search?${new URLSearchParams({ q: q.trim(), brand: b })}`); }}>{b}</button>)}
        </div>
        {suggest?.products.map((p) => <button key={p.id} type="button" onClick={() => { setShowSuggest(false); router.push(`/products/${p.id}`); }}>{p.title} <small>{money(p.price)}</small></button>)}
      </div>}
    </div>
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
