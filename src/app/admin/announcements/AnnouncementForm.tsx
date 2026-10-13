'use client';

import { useState } from 'react';

export default function AnnouncementForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/admin/announcements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: f.get('title'), body: f.get('body'), link: f.get('link') }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMessage({ kind: 'error', text: data.error ?? 'Could not send.' });
    setMessage({ kind: 'ok', text: `Sent to ${data.sent} accounts.` });
    form.reset();
  }

  return <form className="card form" onSubmit={submit}>
    {message && <div className={`alert ${message.kind === 'ok' ? 'alert-ok' : 'alert-error'}`} role="status">{message.text}</div>}
    <label>Title<input name="title" required minLength={3} maxLength={120} placeholder="10.10 Home Services Flash Deal" /></label>
    <label>Message<textarea name="body" rows={4} maxLength={500} placeholder="Mattress deep cleaning from $50 until 14 Oct." /></label>
    <label>Link (optional)<input name="link" maxLength={200} placeholder="/search?q=Mattress%20Deep%20Cleaning" /></label>
    <p className="hint">In-app only: no email or SMS is sent, so this won&apos;t flood inboxes.</p>
    <button className="btn btn-block" disabled={busy} type="submit">{busy ? 'Sending…' : 'Send to all active accounts'}</button>
  </form>;
}
