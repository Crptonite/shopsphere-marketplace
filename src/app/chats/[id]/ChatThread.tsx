'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Calendar, FileText, Paperclip, Repeat, Send, Trash2 } from 'lucide-react';
import { ATTACHMENT_ACCEPT, isImageUrl } from '@/lib/files';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import type { ChatMessage, Conversation } from '@/lib/chats';

const time = (d: string) => new Intl.DateTimeFormat('en-SG', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d));

/** Polls for new messages every 2 seconds (Supabase Realtime can replace this later). */
export default function ChatThread({ conversation: c, initialMessages, me }: { conversation: Conversation; initialMessages: ChatMessage[]; me: string }) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState('');
  const [panel, setPanel] = useState<'none' | 'offer' | 'viewing'>('none');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = messages.filter((m) => m.id > 0).at(-1)?.id ?? 0;
  const isProperty = c.productType === 'property_sale' || c.productType === 'property_rent';

  const refresh = useCallback(async (full = false) => {
    const res = await fetch(`/api/chats/${c.id}?after=${full ? 0 : lastId}`);
    if (!res.ok) return;
    const { messages: fresh } = (await res.json()) as { messages: ChatMessage[] };
    if (full) setMessages(fresh);
    else if (fresh.length) setMessages((m) => {
      // Replace rows that changed (for example a deleted message) and append new ones.
      const byId = new Map(fresh.map((f) => [f.id, f]));
      const updated = m.map((x) => byId.get(x.id) ?? x);
      const added = fresh.filter((f) => !m.some((x) => x.id === f.id));
      return [...updated, ...added];
    });
  }, [c.id, lastId]);

  // Instant updates: the server broadcasts a signal after every change, and this window re-fetches.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    const supabase = createSupabaseBrowser(url, key);
    const channel = supabase.channel(`chat:${c.id}`).on('broadcast', { event: 'changed' }, () => { refreshRef.current(false); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [c.id]);
  // Slow fallback in case the live connection drops.
  useEffect(() => {
    const t = setInterval(() => refreshRef.current(false), 15000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  /** Shows the message at once, then replaces it with the saved one; restores the text if sending fails. */
  async function sendText(body: string) {
    const tempId = -Date.now();
    setMessages((m) => [...m, { id: tempId, senderId: me, kind: 'text', body, createdAt: new Date().toISOString(), meta: {} } as unknown as ChatMessage]);
    setText('');
    const res = await fetch(`/api/chats/${c.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'text', body }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setText(body);
      setError(data.error ?? 'Could not send.');
      return;
    }
    setMessages((m) => m.filter((x) => x.id !== tempId));
    await refresh(false);
  }

  /** Uploads each picked file, then sends it as its own message (up to 4 at a time). */
  async function attach(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files).slice(0, 4)) {
      setError('');
      const form = new FormData();
      form.append('file', file);
      const up = await fetch('/api/uploads', { method: 'POST', body: form });
      const data = await up.json().catch(() => ({}));
      if (!up.ok) { setError(data.error ?? `Could not upload ${file.name}.`); return; }
      await send({ type: 'file', url: data.url, name: file.name });
    }
  }

  async function deleteMessage(id: number) {
    const res = await fetch(`/api/chats/${c.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'delete', messageId: id }) });
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? 'Could not delete the message.'); return; }
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, kind: 'system', body: 'Message deleted', meta: null } : x)));
  }

  async function copyMessage(id: number, body: string) {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError('Could not copy the message.');
    }
  }

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
      <div>{c.role === 'buyer' ? <Link href={`/sellers/${c.sellerId}`}><strong>{c.otherName}</strong></Link> : <strong>{c.otherName}</strong>}<div className="hint">{c.productId ? <Link href={`/products/${c.productId}`}>{c.productTitle}</Link> : 'General'} · you are the {c.role}</div></div>
    </div>

    <div className="messages" aria-live="polite">
      {messages.length === 0 && <p className="hint" style={{ textAlign: 'center' }}>Say hello and ask about the listing.</p>}
      {messages.map((m) => {
        const mine = m.senderId === me;
        if (m.kind === 'system') return <div key={m.id} className="bubble system">{m.body}</div>;
        const meta = (m.meta ?? {}) as { offerId?: string; viewingId?: string; status?: string };
        const pending = meta.status === 'pending' || meta.status === 'requested';
        const target = meta.offerId ? 'offer' : meta.viewingId ? 'viewing' : null;
        const fileMeta = m.kind === 'file' ? (m.meta as { url?: string; name?: string } | null) : null;
        return <div key={m.id} className={`bubble ${mine ? 'mine' : ''} ${target ? 'special' : ''}`}>
          {target === 'offer' && <Repeat size={13} />} {target === 'viewing' && <Calendar size={13} />} {fileMeta?.url ? (isImageUrl(fileMeta.url) ? <img src={fileMeta.url} alt={fileMeta.name ?? ''} className="chat-image" /> : <a href={fileMeta.url} target="_blank" rel="noreferrer" className="chat-file"><FileText size={14} /> {fileMeta.name}</a>) : m.body}
          {target && <div style={{ marginTop: 6 }}><span className={`pill ${meta.status === 'accepted' || meta.status === 'confirmed' ? 'pill-green' : meta.status === 'declined' ? 'pill-red' : 'pill-warn'}`}>{meta.status}</span></div>}
          {target && pending && c.role === 'seller' && !mine && <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button className="btn btn-sm" disabled={busy} onClick={() => send({ type: 'respond', target, targetId: meta.offerId ?? meta.viewingId, accept: true }, true)}>Accept</button>
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => send({ type: 'respond', target, targetId: meta.offerId ?? meta.viewingId, accept: false }, true)}>Decline</button>
          </div>}
          <small>{time(m.createdAt)}</small>
          {m.id > 0 && <button type="button" className="copy-msg" onClick={() => copyMessage(m.id, m.body)}>{copied === m.id ? 'Copied' : 'Copy'}</button>}
          {m.id > 0 && mine && m.kind === 'text' && <button type="button" className="copy-msg copy-msg-icon" aria-label="Delete message" title="Delete message" onClick={() => deleteMessage(m.id)}><Trash2 size={13} /></button>}
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
    <form className="composer" onSubmit={(e) => { e.preventDefault(); if (text.trim()) sendText(text.trim()); }}>
      {c.role === 'buyer' && c.productId && !isProperty && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel('offer')} title="Trade-in offer"><Repeat size={15} /></button>}
      {c.role === 'buyer' && isProperty && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel('viewing')} title="Request viewing"><Calendar size={15} /></button>}
      <label className="btn btn-ghost btn-sm chat-attach" title="Attach files (PDF, CSV, JSON, TXT, PNG, WebP)" aria-label="Attach files"><Paperclip size={15} /><input type="file" multiple accept={ATTACHMENT_ACCEPT} hidden onChange={(e) => { attach(e.target.files); e.target.value = ''; }} /></label>
      <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" maxLength={5000} aria-label="Message" />
      <button className="btn" disabled={busy || !text.trim()} aria-label="Send"><Send size={16} /></button>
    </form>
  </div>;
}
