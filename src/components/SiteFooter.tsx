import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { CATEGORIES, categoryHref } from '@/lib/categories';

const byLabel = (label: string) => CATEGORIES.find((c) => c.label === label)!;
const cat = (label: string) => ({ label, href: categoryHref(byLabel(label)) });

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  { title: 'Electronics & Mobiles', links: [cat('Mobile Phones & Gadgets'), cat('Tablets'), cat('Laptops'), cat('Accessories'), { label: 'iPhone', href: '/search?q=iPhone' }, { label: 'Samsung Galaxy', href: '/search?q=Samsung' }] },
  { title: 'Property', links: [cat('Property for Sale'), cat('Rentals'), { label: 'HDB', href: '/search?q=HDB' }, { label: 'Condo', href: '/search?q=Condo' }] },
  { title: 'Lifestyle', links: [cat('Fashion & Luxury'), cat('Home & Living'), cat('Trade-in Deals'), cat('Everything Else')] },
  { title: 'Selling', links: [{ label: 'List an item', href: '/sell' }, { label: 'My listings', href: '/sell/listings' }, { label: 'My sales', href: '/orders?view=sales' }, { label: 'Payouts', href: '/sell/payouts' }] },
  { title: 'Buying', links: [{ label: 'Cart', href: '/cart' }, { label: 'My purchases', href: '/orders' }, { label: 'My likes', href: '/likes' }, { label: 'Chats', href: '/chats' }] },
  { title: 'Your money', links: [{ label: 'Finance dashboard', href: '/finance' }, { label: 'Spending', href: '/spending' }, { label: 'My account', href: '/account' }, { label: 'All categories', href: '/categories' }] },
];

export default function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-cols">
      {COLUMNS.map((col) => <div key={col.title}>
        <h4>{col.title}</h4>
        <ul>{col.links.map((l) => <li key={l.label}><Link href={l.href}>{l.label}</Link></li>)}</ul>
      </div>)}
    </div>
    <div className="footer-bottom">
      <Link href="/" className="brand-mark footer-brand"><span className="brand-icon"><ShoppingBag size={16} /></span><span>shop<span className="brand-accent">sphere</span></span></Link>
      <span>© {new Date().getFullYear()} ShopSphere · Singapore · SGD</span>
      <span className="footer-note">Payments run in Stripe test mode — no real money is charged. Finance figures are for personal tracking, not financial advice.</span>
    </div>
  </footer>;
}
