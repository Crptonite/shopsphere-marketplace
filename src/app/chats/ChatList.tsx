'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Archive, ChevronDown, Search, X } from 'lucide-react';
import type { Conversation, InboxFilter } from '@/lib/chats';

const FILTERS: Array<{ id: InboxFilter; label: string }> = [
  { id: 'inbox', label: 'Inbox' }, { id: 'selling', label: 'Selling' }, { id: 'buying', label: 'Buying' },
  { id: 'archived', label: 'Archived' }, { id: 'unread', label: 'Unreads' },
];

const stamp = (d: string) => {
  const date = new Date(d);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
};

/** Inbox with Selling / Buying / Archived / Unreads filters and search. */
export default function ChatList({ initial, activeId }: { initial: Conversation[]; activeId?: string }) {
  const [filter, setFilter] = useState<InboxFilter>('inbox');
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const c = new AbortController();
    const t = setTimeout(() => fetch(`/api/chats?filter=${filter}&q=${encodeURIComponent(q)}`, { signal: c.signal })
      .then((r) => r.json()).then((d) => setItems(d.conversations ?? [])).catch(() => {}), 200);
    return () => { clearTimeout(t); c.abort(); };
  }, [filter, q]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  async function archive(c: Conversation) {
    await fetch(`/api/chats/${c.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'archive', archived: !c.archived }) });
    setItems((list) => list.filter((x) => x.id !== c.id));
  }

  return <div className="inbox">
    <div className="inbox-head">
      <div className="inbox-filter" ref={menuRef}>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open}>{FILTERS.find((f) => f.id === filter)!.label} <ChevronDown size={16} /></button>
        {open && <div className="dropdown inbox-menu" role="menu">{FILTERS.map((f) => <button key={f.id} role="menuitemradio" aria-checked={f.id === filter} className={f.id === filter ? 'is-active' : ''} onClick={() => { setFilter(f.id); setOpen(false); }}>{f.label}</button>)}</div>}
      </div>
      <button className="header-icon" onClick={() => { setSearching((s) => !s); setQ(''); }} aria-label="Search chats">{searching ? <X size={18} /> : <Search size={18} />}</button>
    </div>
    {searching && <input className="input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or listing" style={{ marginBottom: 8 }} />}
    {items.length === 0 ? <div className="empty"><h3>No conversations</h3><p>{filter === 'inbox' ? 'Open a listing and tap “Chat with seller”.' : 'Nothing matches this filter.'}</p></div>
      : <div className="chat-list">{items.map((c) => <div key={c.id} className={`chat-item ${c.id === activeId ? 'active' : ''}`}>
        <Link href={`/chats/${c.id}`} className="chat-link">
          <span className="avatar">{c.otherName[0]?.toUpperCase()}</span>
          <span className="chat-copy">
            <span className="chat-top"><strong>{c.otherName}</strong><time>{stamp(c.lastMessageAt)}</time></span>
            <b>{c.productTitle ?? 'General'}</b>
            <small>{c.lastMessage ?? 'No messages yet'}</small>
          </span>
          {c.productImage && <img src={c.productImage} alt="" />}
          {c.unread && <span className="unread-dot" aria-label="Unread" />}
        </Link>
        <button className="chat-archive" onClick={() => archive(c)} title={c.archived ? 'Unarchive' : 'Archive'} aria-label={c.archived ? 'Unarchive' : 'Archive'}><Archive size={14} /></button>
      </div>)}</div>}
  </div>;
}
