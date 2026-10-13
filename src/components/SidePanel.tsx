'use client';

import { coverImage } from '@/lib/files';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Bell, Heart, LayoutGrid, MessageCircle, ShoppingCart, X } from 'lucide-react';
import { CATEGORIES, categoryHref } from '@/lib/categories';
import { money2 } from '@/lib/format';

export type PanelKind = 'cart' | 'likes' | 'chats' | 'updates' | 'categories';

const META: Record<PanelKind, { title: string; href: string; icon: typeof Heart }> = {
  cart: { title: 'Cart', href: '/cart', icon: ShoppingCart },
  likes: { title: 'Likes', href: '/likes', icon: Heart },
  chats: { title: 'Chats', href: '/chats', icon: MessageCircle },
  updates: { title: 'Updates', href: '/notifications', icon: Bell },
  categories: { title: 'All Categories', href: '/categories', icon: LayoutGrid },
};

type Row = { key: string; href: string; image?: string | null; title: string; sub?: string; right?: string; unread?: boolean };

const ago = (d: string) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  return m < 60 ? `${Math.max(m, 1)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

/** Slide-in panel toggled from the navbar. Every panel links to its full-page view. */
export default function SidePanel({ kind, onClose, onKind, signedIn }: { kind: PanelKind | null; onClose: () => void; onKind: (k: PanelKind) => void; signedIn: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [footer, setFooter] = useState('');

  useEffect(() => {
    if (!kind) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [kind, onClose]);

  useEffect(() => {
    if (!kind || kind === 'categories') return;
    setRows(null);
    setFooter('');
    if (!signedIn && kind !== 'cart') { setRows([]); setFooter('signin'); return; }
    const load = async () => {
      if (kind === 'cart') {
        const d = await fetch('/api/cart').then((r) => r.json());
        setFooter(d.items?.length ? `Subtotal ${money2(d.subtotal)}` : '');
        return (d.items ?? []).map((l: { productId: string; title: string; image: string; price: number; quantity: number }) =>
          ({ key: l.productId, href: `/products/${l.productId}`, image: l.image, title: l.title, sub: `Qty ${l.quantity}`, right: money2(l.price * l.quantity) }));
      }
      if (kind === 'likes') {
        const d = await fetch('/api/likes').then((r) => r.json());
        return (d.items ?? []).map((p: { id: string; title: string; image: string; images: string[]; price: number; status: string }) =>
          ({ key: p.id, href: `/products/${p.id}`, image: coverImage(p.images, p.image), title: p.title, sub: p.status === 'sold' ? 'Sold' : undefined, right: money2(p.price) }));
      }
      if (kind === 'chats') {
        const d = await fetch('/api/chats').then((r) => r.json());
        return (d.conversations ?? []).map((c: { id: string; otherName: string; productTitle: string | null; productImage: string | null; lastMessage: string | null; lastMessageAt: string; unread: boolean }) =>
          ({ key: c.id, href: `/chats/${c.id}`, image: c.productImage, title: c.otherName, sub: c.lastMessage ?? c.productTitle ?? '', right: ago(c.lastMessageAt), unread: c.unread }));
      }
      const d = await fetch('/api/notifications?list=1').then((r) => r.json());
      return (d.items ?? []).map((n: { id: number; title: string; body: string; link: string | null; readAt: string | null; createdAt: string }) =>
        ({ key: String(n.id), href: n.link ?? '/notifications', title: n.title, sub: n.body, right: ago(n.createdAt), unread: !n.readAt }));
    };
    load().then(setRows).catch(() => setRows([]));
  }, [kind, signedIn]);

  if (!kind) return null;
  const meta = META[kind];
  const Icon = meta.icon;

  return <>
    <div className="panel-scrim" onClick={onClose} />
    <aside className="side-panel" role="dialog" aria-label={meta.title}>
      <div className="panel-head">
        <h2><Icon size={18} /> {meta.title}</h2>
        <Link className="panel-full" href={meta.href}>Open full page <ArrowRight size={14} /></Link>
        <button className="icon-button" onClick={onClose} aria-label="Close panel"><X size={18} /></button>
      </div>
      <nav className="panel-tabs">{(Object.keys(META) as PanelKind[]).map((k) => <button key={k} className={k === kind ? 'is-active' : ''} onClick={() => onKind(k)}>{META[k].title.replace('All ', '')}</button>)}</nav>
      <div className="panel-body">
        {kind === 'categories' ? <div className="panel-cats">
          {CATEGORIES.map((c) => <Link key={c.slug} href={categoryHref(c)} className={`panel-cat ${c.tone}`}><strong>{c.label}</strong><small>{c.detail}</small></Link>)}
        </div> : footer === 'signin' ? <div className="empty"><h3>Sign in to see your {meta.title.toLowerCase()}</h3><Link className="btn" href="/login">Sign in</Link></div>
          : rows === null ? <p className="hint" style={{ padding: 16 }}>Loading…</p>
            : rows.length === 0 ? <div className="empty"><Icon size={26} /><h3>Nothing here yet</h3></div>
              : rows.map((r) => <Link key={r.key} href={r.href} className={`panel-row ${r.unread ? 'is-unread' : ''}`}>
                {r.image ? <img src={r.image} alt="" /> : <span className="panel-dot"><Icon size={16} /></span>}
                <span className="panel-copy"><strong>{r.title}</strong>{r.sub && <small>{r.sub}</small>}</span>
                <span className="panel-right">{r.right}{r.unread && <i className="unread-dot" />}</span>
              </Link>)}
      </div>
      {kind === 'cart' && footer && <div className="panel-foot"><span>{footer}</span><button className="btn" onClick={() => router.push('/cart')}>Checkout</button></div>}
    </aside>
  </>;
}
