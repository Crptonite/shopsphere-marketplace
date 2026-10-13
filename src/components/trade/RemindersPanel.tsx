'use client';

import { useEffect, useState } from 'react';
import { Bell, Trash2 } from 'lucide-react';

type Reminder = { id: number; ticker: string | null; title: string; body: string; frequency: string; nextAt: string };

const FREQ_LABEL: Record<string, string> = { once: 'Once', weekly: 'Weekly', monthly: 'Monthly' };

/** Creates and lists investing reminders. Sends happen via the 15-minute cron job (in-app, email, and SMS if opted in). */
export default function RemindersPanel({ ticker }: { ticker?: string }) {
  const [items, setItems] = useState<Reminder[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/trade/reminders');
    if (res.status === 401) { setItems([]); return; }
    const data = await res.json().catch(() => ({ reminders: [] }));
    setItems(data.reminders ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    const res = await fetch('/api/trade/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: f.get('title'),
        body: f.get('body') ?? '',
        ticker: ticker ?? (String(f.get('ticker') ?? '').trim() || null),
        frequency: f.get('frequency'),
        firstAt: new Date(String(f.get('firstAt'))).toISOString(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error ?? 'Could not save the reminder.'); return; }
    e.currentTarget.reset();
    load();
  }

  async function remove(id: number) {
    await fetch(`/api/trade/reminders/${id}`, { method: 'DELETE' });
    load();
  }

  return <div className="card" style={{ padding: 16 }}>
    <h3 style={{ margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}><Bell size={16} /> Reminders</h3>
    <form onSubmit={create} className="form" style={{ display: 'grid', gap: 8 }}>
      <label>Title<input name="title" required minLength={3} maxLength={120} defaultValue={ticker ? `Review ${ticker}` : ''} placeholder="Monthly DCA into SMP01" /></label>
      {!ticker && <label>Ticker (optional)<input name="ticker" maxLength={10} placeholder="SMP01" /></label>}
      <label>Note (optional)<input name="body" maxLength={500} placeholder="Invest S$500 this month" /></label>
      <div className="grid-2" style={{ gap: 8 }}>
        <label>Repeat<select name="frequency" defaultValue="monthly"><option value="once">Once</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
        <label>First reminder<input name="firstAt" type="datetime-local" required /></label>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <button className="btn btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Set reminder'}</button>
    </form>
    <div style={{ marginTop: 14 }}>
      {items === null && <p className="hint">Loading reminders…</p>}
      {items?.length === 0 && <p className="hint">No active reminders. Sign in to set one.</p>}
      {items?.map((r) => <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)', gap: 8 }}>
        <div><strong>{r.title}</strong>{r.ticker && <span className="hint"> · {r.ticker}</span>}
          <div className="hint">{FREQ_LABEL[r.frequency]} · next {new Date(r.nextAt).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })}</div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" aria-label={`Delete reminder ${r.title}`} title="Delete reminder" onClick={() => remove(r.id)}><Trash2 size={14} /></button>
      </div>)}
    </div>
  </div>;
}
