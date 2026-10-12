import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CATEGORIES, categoryHref } from '@/lib/categories';

export const metadata = { title: 'All categories — ShopSphere' };

export default function CategoriesPage() {
  return <main className="page">
    <div className="page-head"><div><div className="eyebrow">BROWSE</div><h1>All categories</h1><p>Gadgets, fashion, trade-ins, homes for sale and rentals across Singapore.</p></div></div>
    <div className="category-grid">
      {CATEGORIES.map((c, i) => <Link key={c.slug} href={categoryHref(c)} className={`category-tile ${c.tone}`}>
        <span className="category-number">{String(i + 1).padStart(2, '0')}</span><span className="category-title">{c.label}</span><span className="category-detail">{c.detail}</span><span className="category-arrow"><ArrowRight size={17} /></span>
      </Link>)}
    </div>
  </main>;
}
