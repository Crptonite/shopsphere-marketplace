'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/client';

type Message = { kind: 'ok' | 'error'; text: string } | null;

/** Display-name and password forms on the account page. */
export default function ProfileSettings({ displayName, email, url, publishableKey }: { displayName: string; email: string; url: string; publishableKey: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowser(url, publishableKey), [url, publishableKey]);
  const [name, setName] = useState(displayName);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState<Message>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<Message>(null);

  async function saveName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNameBusy(true);
    setNameMsg(null);
    const res = await fetch('/api/account/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: name }) });
    const data = await res.json().catch(() => ({}));
    setNameBusy(false);
    if (!res.ok) return setNameMsg({ kind: 'error', text: data.error ?? 'Could not save your name.' });
    setName(data.displayName);
    setNameMsg({ kind: 'ok', text: 'Name updated.' });
    router.refresh();
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const current = String(f.get('current') ?? '');
    const next = String(f.get('next') ?? '');
    const confirm = String(f.get('confirm') ?? '');
    if (next.length < 8) return setPwMsg({ kind: 'error', text: 'New password must be at least 8 characters.' });
    if (next !== confirm) return setPwMsg({ kind: 'error', text: 'The new passwords do not match.' });
    if (next === current) return setPwMsg({ kind: 'error', text: 'Choose a password different from your current one.' });

    setPwBusy(true);
    setPwMsg(null);
    // Re-check the current password before changing it, so someone with an open session cannot change it.
    const { error: checkError } = await supabase.auth.signInWithPassword({ email, password: current });
    if (checkError) { setPwBusy(false); return setPwMsg({ kind: 'error', text: 'Your current password is incorrect.' }); }
    const { error } = await supabase.auth.updateUser({ password: next });
    setPwBusy(false);
    if (error) return setPwMsg({ kind: 'error', text: error.message });
    form.reset();
    setPwMsg({ kind: 'ok', text: 'Password changed.' });
  }

  return <div className="grid-2" style={{ marginTop: 16 }}>
    <form className="card form" onSubmit={saveName}>
      <h2>Display name</h2>
      {nameMsg && <div className={`alert ${nameMsg.kind === 'ok' ? 'alert-ok' : 'alert-error'}`} role="status">{nameMsg.text}</div>}
      <label>Name shown to buyers and sellers<input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={80} required /></label>
      <button className="btn" disabled={nameBusy || name.trim() === displayName} type="submit">{nameBusy ? 'Saving…' : 'Save name'}</button>
    </form>

    <form className="card form" onSubmit={changePassword}>
      <h2>Change password</h2>
      {pwMsg && <div className={`alert ${pwMsg.kind === 'ok' ? 'alert-ok' : 'alert-error'}`} role="status">{pwMsg.text}</div>}
      <label>Current password<input name="current" type="password" required autoComplete="current-password" /></label>
      <label>New password<input name="next" type="password" required minLength={8} autoComplete="new-password" /></label>
      <label>Confirm new password<input name="confirm" type="password" required minLength={8} autoComplete="new-password" /></label>
      <button className="btn" disabled={pwBusy} type="submit">{pwBusy ? 'Updating…' : 'Update password'}</button>
    </form>
  </div>;
}
