'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TRADE_NAV } from '@/lib/trade-nav';

/** Secondary navigation for the Trade section (shown inside /trade pages). */
export default function TradeNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/trade' ? pathname === '/trade' : pathname === href || pathname.startsWith(`${href}/`));
  return <nav className="trade-nav" aria-label="Trade navigation">
    {TRADE_NAV.map((g) => <div key={g.title} className="trade-nav-group">
      <div className="trade-nav-title">{g.title}</div>
      {g.links.map(([href, label]) => <Link key={href} href={href} className={isActive(href) ? 'is-active' : undefined} aria-current={isActive(href) ? 'page' : undefined}>{label}</Link>)}
    </div>)}
  </nav>;
}
