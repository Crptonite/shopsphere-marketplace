'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { CATEGORIES, categoryHref } from '@/lib/categories';
import { NAV_GROUPS } from '@/lib/nav';
import { TRADE_NAV } from '@/lib/trade-nav';

/** Persistent left navigation shown beside every page on desktop, with a search box over all pages. */
export default function AppSidebar() {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  const everything: [string, string][] = [
    ...NAV_GROUPS.flatMap((g) => g.links),
    ...TRADE_NAV.flatMap((g) => g.links),
    ...CATEGORIES.map((c) => [categoryHref(c), c.label] as [string, string]),
  ];
  const q = query.trim().toLowerCase();
  const results = q ? everything.filter(([href, label]) => `${label} ${href}`.toLowerCase().includes(q)) : [];

  return <aside className="app-sidebar" aria-label="Site navigation">
    <input className="sidebar-search" type="search" placeholder="Find a page…" aria-label="Find a page" value={query} onChange={(e) => setQuery(e.target.value)} />
    {q ? <nav aria-label="Search results">
      {results.length === 0 && <p className="hint">No pages match “{query}”.</p>}
      {results.map(([href, label]) => <Link key={href} href={href} onClick={() => setQuery('')}>{label}</Link>)}
    </nav> : <nav>
      <Link href="/" className={`app-sidebar-home${pathname === '/' ? ' is-active' : ''}`}>Home</Link>
      {NAV_GROUPS.map((g) => <div key={g.title} className="app-sidebar-group">
        <div className="app-sidebar-title">{g.title}</div>
        {g.links.map(([href, label]) => <Link key={href} href={href} className={isActive(href) ? 'is-active' : undefined} aria-current={isActive(href) ? 'page' : undefined}>{label}</Link>)}
      </div>)}
    </nav>}
  </aside>;
}
