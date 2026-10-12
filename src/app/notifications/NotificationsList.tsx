'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

type Item = { id: number; type: string; title: string; body: string; link: string | null; readAt: string | null; createdAt: string };

export default function NotificationsList() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => { fetch('/api/notifications?list=1').then((r) => r.json()).then((d) => setItems(d.items ?? [])).catch(() => setItems([])); }, []);

  async function mark(body: { ids?: number[]; all?: boolean }) {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setItems((curr) => curr?.map((i) => (body.all || body.ids?.includes(i.id) ? { ...i, readAt: new Date().toISOString() } : i)) ?? null);
    router.refresh();
  }

  if (!items) return <p className="hint">Loading…</p>;
  if (!items.length) return <div className="empty"><Bell size={28} /><h3>You&apos;re all caught up</h3></div>;
  return <div className="card">
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn btn-ghost btn-sm" onClick={() => mark({ all: true })}>Mark all as read</button></div>
    <div className="table-wrap"><table className="table"><tbody>
      {items.map((n) => <tr key={n.id} style={{ opacity: n.readAt ? 0.6 : 1 }}>
        <td><span className="pill">{n.type}</span></td>
        <td>{n.link ? <Link href={n.link} onClick={() => !n.readAt && mark({ ids: [n.id] })}><strong>{n.title}</strong></Link> : <strong>{n.title}</strong>}<div className="hint">{n.body}</div></td>
        <td className="num hint">{new Date(n.createdAt).toLocaleString('en-SG', { dateStyle: 'short', timeStyle: 'short' })}</td>
      </tr>)}
    </tbody></table></div>
  </div>;
}
