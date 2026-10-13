import { redirect } from 'next/navigation';
import { env, features } from '@/lib/env';
import { getCurrentUser } from '@/lib/auth';
import LoginForm from './LoginForm';

export const metadata = { title: 'Sign in — ShopSphere' };

const safeNext = (next?: string) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/');

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; message?: string }> }) {
  const { next, error, message } = await searchParams;
  if (await getCurrentUser()) redirect(safeNext(next));
  return <main className="page"><div className="auth-box card">
    <div className="eyebrow">WELCOME TO SHOPSPHERE</div>
    <h1 style={{ font: "700 26px 'Manrope'", letterSpacing: '-1px', margin: '8px 0 6px' }}>Sign in to buy and sell</h1>
    <p className="hint" style={{ marginBottom: 18 }}>One account for buying, selling, chats and your finance dashboard.</p>
    {error && <div className="alert alert-error">{error === 'config' ? 'Sign-in is not configured on the server.' : `Sign-in failed. ${message ? message : 'Please try again.'}`}</div>}
    {features.auth
      ? <LoginForm url={env.SUPABASE_URL!} publishableKey={env.SUPABASE_PUBLISHABLE_KEY!} appUrl={env.APP_URL} next={safeNext(next)} />
      : <div className="alert alert-warn">Authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then enable the Email, Google and GitHub providers in Supabase Auth.</div>}
  </div></main>;
}
