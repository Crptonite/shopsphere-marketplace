import Link from 'next/link';
import { Bell, Heart, ListOrdered, MessageCircle, Package, PieChart, Palette, SlidersHorizontal, Tag, User, Wallet, Banknote } from 'lucide-react';

const SECTIONS = [
  { title: '', links: [{ href: '/account', label: 'My account', icon: User }] },
  { title: 'Selling', links: [{ href: '/sell/listings', label: 'My listings', icon: ListOrdered }, { href: '/orders?view=sales', label: 'My sales', icon: Tag }, { href: '/sell/payouts', label: 'Payouts', icon: Banknote }] },
  { title: 'Buying', links: [{ href: '/orders', label: 'My purchases', icon: Package }, { href: '/likes', label: 'My likes', icon: Heart }, { href: '/chats', label: 'Chats', icon: MessageCircle }] },
  { title: 'Create', links: [{ href: '/design', label: 'Design', icon: Palette }, { href: '/customize', label: 'Customize', icon: SlidersHorizontal }] },
  { title: 'Money', links: [{ href: '/finance', label: 'Balance & finance', icon: Wallet }, { href: '/spending', label: 'Spending', icon: PieChart }] },
  { title: 'More', links: [{ href: '/notifications', label: 'Notifications', icon: Bell }] },
];

/** Left-hand account navigation, Carousell-style. */
export default function AccountShell({ active, children }: { active: string; children: React.ReactNode }) {
  return <main className="page page-wide">
    <div className="account-layout">
      <nav className="account-nav card" aria-label="Account">
        {SECTIONS.map((s) => <div key={s.title || 'top'} style={{ display: 'contents' }}>
          {s.title && <h5>{s.title}</h5>}
          {s.links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={href === active ? 'page' : undefined}><Icon size={17} /> {label}</Link>)}
        </div>)}
      </nav>
      <div>{children}</div>
    </div>
  </main>;
}
