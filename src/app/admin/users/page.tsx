import { requireAdmin } from '@/lib/auth';
import UsersAdmin from './UsersAdmin';

export const metadata = { title: 'Users — ShopSphere admin' };

export default async function AdminUsersPage() {
  await requireAdmin();
  return <main className="page">
    <div className="page-head"><div><div className="eyebrow">ADMIN</div><h1>Users</h1>
      <p>Suspend an account to block it from buying, selling and chatting. Delete removes its listings and login.</p></div></div>
    <UsersAdmin />
  </main>;
}
