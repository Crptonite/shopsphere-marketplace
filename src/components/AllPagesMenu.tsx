'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';

const PAGE_GROUPS: { title: string; links: [string, string][] }[] = [
  { title: 'My account', links: [['/account', 'My account']] },
  { title: 'Selling', links: [['/selling/listings', 'My listings'], ['/selling/sales', 'My sales'], ['/selling/manage', 'Manage'], ['/selling/growth/promote-listings', 'Promote listings'], ['/selling/growth/promo-calendar', 'Promo calendar']] },
  { title: 'Buying', links: [['/buying/purchases', 'My purchases'], ['/buying/likes', 'My likes'], ['/buying/saved-searches', 'Saved searches'], ['/buying/promos', 'My promos'], ['/services/certified', 'Certified services']] },
  { title: 'Trade', links: [['/trade', 'Trade']] },
  { title: 'More', links: [['/settings', 'Settings'], ['/finance', 'Finance dashboard'], ['/finance/spending', 'Spending']] },
];

/** Hamburger menu listing every page, with a Log out button that is always available. */
export default function AllPagesMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return <div className="all-pages">
    <button type="button" className="all-pages-toggle" aria-expanded={open} aria-controls="all-pages-panel" onClick={() => setOpen((v) => !v)}>
      {open ? <X size={18} /> : <Menu size={18} />} <span>All pages</span>
    </button>
    {open && <div id="all-pages-panel" className="all-pages-panel" role="navigation" aria-label="All pages">
      <div className="all-pages-grid">
        {PAGE_GROUPS.map((g) => <div key={g.title}>
          <div className="all-pages-title">{g.title}</div>
          {g.links.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
        </div>)}
      </div>
      <form action="/auth/logout" method="post" className="all-pages-logout">
        <button type="submit" className="btn btn-danger btn-sm"><LogOut size={15} /> Log out</button>
      </form>
    </div>}
  </div>;
}
