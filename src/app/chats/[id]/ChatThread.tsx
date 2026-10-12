'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Calendar, Repeat, Send } from 'lucide-react';
import type { ChatMessage, Conversation } from '@/lib/chats';

const time = (d: string) => new Intl.DateTimeFormat('en-SG', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d));

/** Polls for new messages every 4 seconds (Supabase Realtime can replace this later). */
export default function ChatThread({ conversation: c, initialMessages, me }: { conversation: Conversation; initialMessages: ChatMessage[]; me: string }) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState('');
  const [panel, setPanel] = useState<'none' | 'offer' | 'viewing'>('none');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = messages.at(-1)?.id ?? 0;
  const isProperty = c.productType === 'property_sale' || c.productType === 'property_rent';

  const refresh = useCallback(async (full = false) => {
    const res = await fetch(`/api/chats/${c.id}?after=${full ? 0 : lastId}`);
    if (!res.ok) return;
    const { messages: fresh } = (await res.json()) as { messages: ChatMessage[] };
    if (full) setMessages(fresh);
    else if (fresh.length) setMessages((m) => [...m, ...fresh.filter((f) => !m.some((x) => x.id === f.id))]);
  }, [c.id, lastId]);

  useEffect(() => {
    const t = setInterval(() => refresh(), 4000);
    return () => clearInterval(t);
  }, [refresh]);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [messages.length]);

  async function send(payload: Record<string, unknown>, full = false) {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/chats/${c.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error ?? 'Could not send.'); return false; }
    await refresh(full);
    return true;
  }

  return <div className="thread">
    <div className="thread-head">
      <Link href="/chats" className="header-icon" aria-label="Back to chats"><ArrowLeft size={18} /></Link>
      {c.productImage && <img src={c.productImage} alt="" />}
      <div><strong>{c.otherName}</strong><div className="hint">{c.productId ? <Link href={`/products/${c.productId}`}>{c.productTitle}</Link> : 'General'} · you are the {c.role}</div></div>
    </div>

    <div className="messages" aria-live="polite">
      {messages.length === 0 && <p className="hint" style={{ textAlign: 'center' }}>Say hello and ask about the listing.</p>}
      {messages.map((m) => {
        const mine = m.senderId === me;
        if (m.kind === 'system') return <div key={m.id} className="bubble system">{m.body}</div>;
        const meta = (m.meta ?? {}) as { offerId?: string; viewingId?: string; status?: string };
        const pending = meta.status === 'pending' || meta.status === 'requested';
        const target = meta.offerId ? 'offer' : meta.viewingId ? 'viewing' : null;
        return <div key={m.id} className={`bubble ${mine ? 'mine' : ''} ${target ? 'special' : ''}`}>
          {target === 'offer' && <Repeat size={13} />} {target === 'viewing' && <Calendar size={13} />} {m.body}
          {target && <div style={{ marginTop: 6 }}><span className={`pill ${meta.status === 'accepted' || meta.status === 'confirmed' ? 'pill-green' : meta.status === 'declined' ? 'pill-red' : 'pill-warn'}`}>{meta.status}</span></div>}
          {target && pending && c.role === 'seller' && !mine && <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button className="btn btn-sm" disabled={busy} onClick={() => send({ type: 'respond', target, targetId: meta.offerId ?? meta.viewingId, accept: true }, true)}>Accept</button>
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => send({ type: 'respond', target, targetId: meta.offerId ?? meta.viewingId, accept: false }, true)}>Decline</button>
          </div>}
          <small>{time(m.createdAt)}</small>
        </div>;
      })}
      <div ref={endRef} />
    </div>

    {panel === 'offer' && <form className="form card" style={{ padding: 12, marginBottom: 8 }} onSubmit={async (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      if (await send({ type: 'offer', tradeItem: f.get('tradeItem'), cashDiff: Number(f.get('cashDiff') || 0) })) setPanel('none');
    }}>
      <label>What will you trade?<input name="tradeItem" required minLength={2} maxLength={300} placeholder="iPhone 15 Pro 128GB, good condition" /></label>
      <label>Cash top-up from you (SGD; negative if the seller pays you)<input name="cashDiff" type="number" step="1" defaultValue={0} /></label>
      <div style={{ display: 'flex', gap: 6 }}><button className="btn btn-sm" disabled={busy}>Send offer</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel('none')}>Cancel</button></div>
    </form>}
    {panel === 'viewing' && <form className="form card" style={{ padding: 12, marginBottom: 8 }} onSubmit={async (e) => {
      e.preventDefault();
      const slot = String(new FormData(e.currentTarget).get('slot'));
      if (await send({ type: 'viewing', slot: new Date(slot).toISOString() })) setPanel('none');
    }}>
      <label>Preferred viewing time<input name="slot" type="datetime-local" required /></label>
      <div style={{ display: 'flex', gap: 6 }}><button className="btn btn-sm" disabled={busy}>Request viewing</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel('none')}>Cancel</button></div>
    </form>}

    {error && <div className="alert alert-error" role="alert">{error}</div>}
    <form className="composer" onSubmit={async (e) => { e.preventDefault(); if (text.trim() && await send({ type: 'text', body: text.trim() })) setText(''); }}>
      {c.role === 'buyer' && c.productId && !isProperty && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel('offer')} title="Trade-in offer"><Repeat size={15} /></button>}
      {c.role === 'buyer' && isProperty && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel('viewing')} title="Request viewing"><Calendar size={15} /></button>}
      <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" maxLength={5000} aria-label="Message" />
      <button className="btn" disabled={busy || !text.trim()} aria-label="Send"><Send size={16} /></button>
    </form>
  </div>;
}
