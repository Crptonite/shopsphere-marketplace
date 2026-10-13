'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

type AdminUser = { id: string; email: string; displayName: string; isAdmin: boolean; createdAt: string; suspendedAt: string | null; deletedAt: string | null; listings: number };

const statusOf = (u: AdminUser) => (u.deletedAt ? 'Deleted' : u.suspendedAt ? 'Suspended' : u.isAdmin ? 'Admin' : 'Active');
const pillFor = (status: string) => (status === 'Active' ? 'pill-green' : status === 'Admin' ? '' : 'pill-red');

export default function UsersAdmin() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<AdminUser[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    const t = setTimeout(() => fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, { signal: c.signal })
      .then((r) => r.json()).then((d) => setItems(d.items ?? [])).catch(() => {}), 250);
    return () => { clearTimeout(t); c.abort(); };
  }, [q, reload]);

  async function act(user: AdminUser, action: 'suspend' | 'unsuspend' | 'delete') {
    if (action === 'delete' && !window.confirm(`Delete ${user.email}? Their listings are removed and their login is deleted. This cannot be undone.`)) return;
    setBusyId(user.id);
    setMessage(null);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) return setMessage({ kind: 'error', text: data.error ?? 'Action failed.' });
    const done = action === 'delete' ? 'deleted' : action === 'suspend' ? 'suspended' : 'unsuspended';
    setMessage({ kind: 'ok', text: `${user.email} ${done}.${action === 'delete' && data.loginRemoved === false ? ' Login could not be removed; check SUPABASE_SERVICE_ROLE_KEY.' : ''}` });
    setReload((r) => r + 1);
  }

  return <div className="card">
    <label className="search-field" style={{ maxWidth: 420, marginBottom: 14 }}>
      <Search size={16} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email, name or user id" aria-label="Search users" />
    </label>
    {message && <div className={`alert ${message.kind === 'ok' ? 'alert-ok' : 'alert-error'}`} role="status">{message.text}</div>}
    {items === null ? <p className="hint">Loading…</p> : items.length === 0 ? <p className="hint">No users match.</p> : <div className="table-wrap"><table className="table">
      <thead><tr><th>Name</th><th>Email</th><th>Listings</th><th>Status</th><th>Joined</th><th></th></tr></thead>
      <tbody>{items.map((u) => {
        const status = statusOf(u);
        const locked = u.isAdmin || Boolean(u.deletedAt);
        return <tr key={u.id}>
          <td>{u.displayName}</td>
          <td>{u.email}</td>
          <td className="num">{u.listings}</td>
          <td><span className={`pill ${pillFor(status)}`}>{status}</span></td>
          <td>{new Date(u.createdAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
          <td className="num" style={{ whiteSpace: 'nowrap' }}>
            {!locked && (u.suspendedAt
              ? <button className="btn btn-ghost btn-sm" disabled={busyId === u.id} onClick={() => act(u, 'unsuspend')}>Unsuspend</button>
              : <button className="btn btn-ghost btn-sm" disabled={busyId === u.id} onClick={() => act(u, 'suspend')}>Suspend</button>)}{' '}
            {!locked && <button className="btn btn-danger btn-sm" disabled={busyId === u.id} onClick={() => act(u, 'delete')}>Delete</button>}
          </td>
        </tr>;
      })}</tbody>
    </table></div>}
  </div>;
}
