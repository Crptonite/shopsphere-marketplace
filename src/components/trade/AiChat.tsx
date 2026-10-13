'use client';

import { useState } from 'react';

type Turn = { role: 'user' | 'assistant'; content: string };

/** Chat with the Trade assistant (OpenRouter). The conversation lives in this page only. */
export default function AiChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content }];
    setTurns(next);
    setText('');
    setBusy(true);
    setError('');
    const res = await fetch('/api/trade/ai-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error ?? 'The assistant is unavailable right now.'); return; }
    setTurns((t) => [...t, { role: 'assistant', content: data.reply }]);
  }

  return <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ minHeight: 260, display: 'flex', flexDirection: 'column', gap: 8 }} aria-live="polite">
      {turns.length === 0 && <p className="hint">Ask about ratios, the screener, DCA or how a signal works. Not personal financial advice.</p>}
      {turns.map((t, i) => <div key={i} className={`bubble ${t.role === 'user' ? 'mine' : ''}`}>{t.content}</div>)}
      {busy && <p className="hint">Thinking…</p>}
    </div>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    <form onSubmit={send} className="composer">
      <input className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Ask about a stock concept…" aria-label="Message the assistant" />
      <button className="btn btn-sm" disabled={busy || !text.trim()}>Send</button>
    </form>
  </div>;
}
