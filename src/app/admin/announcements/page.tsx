import { requireAdmin } from '@/lib/auth';
import AnnouncementForm from './AnnouncementForm';

export const metadata = { title: 'Announcements — ShopSphere admin' };

export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  return <main className="page page-narrow">
    <div className="page-head"><div><div className="eyebrow">ADMIN</div><h1>Announcements</h1>
      <p>Send an event or promo message to every active account. It appears in their Updates panel with the unread badge.</p></div></div>
    <AnnouncementForm />
  </main>;
}
