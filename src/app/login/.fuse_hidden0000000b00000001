'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/client';

export default function LoginForm({ url, publishableKey, appUrl, next }: { url: string; publishableKey: string; appUrl: string; next: string }) {
  const supabase = useMemo(() => createSupabaseBrowser(url, publishableKey), [url, publishableKey]);
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const callback = `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  async function oauth(provider: 'google' | 'github') {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: callback } });
    if (error) { setBusy(false); setMessage({ kind: 'error', text: error.message }); }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    setBusy(true);
    setMessage(null);
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMessage({ kind: 'error', text: error.message });
      router.replace(next);
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callback, data: { full_name: String(form.get('name') || '') } } });
      setBusy(false);
      if (error) return setMessage({ kind: 'error', text: error.message });
      if (data.session) { router.replace(next); router.refresh(); }
      else setMessage({ kind: 'ok', text: 'Check your email to confirm your account, then sign in.' });
    }
  }

  return <div className="form">
    <button className="btn btn-ghost btn-block" disabled={busy} onClick={() => oauth('google')}>Continue with Google</button>
    <button className="btn btn-ghost btn-block" disabled={busy} onClick={() => oauth('github')}>Continue with GitHub</button>
    <div className="divider">or with email</div>
    <form className="form" onSubmit={submit}>
      {mode === 'signup' && <label>Display name<input name="name" maxLength={80} autoComplete="nickname" /></label>}
      <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      <label>Password<input name="password" type="password" required minLength={8} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></label>
      {message && <div className={`alert ${message.kind === 'ok' ? 'alert-ok' : 'alert-error'}`} role="status">{message.text}</div>}
      <button className="btn btn-block" disabled={busy} type="submit">{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
    </form>
    <p className="hint" style={{ textAlign: 'center' }}>
      {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
      <button className="linklike" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(null); }}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</button>
    </p>
  </div>;
}
