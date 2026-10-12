import NotificationsList from './NotificationsList';

export const metadata = { title: 'Notifications — ShopSphere' };

export default function NotificationsPage() {
  return <main className="page page-narrow">
    <div className="page-head"><div><div className="eyebrow">UPDATES</div><h1>Notifications</h1><p>Messages, orders, payments, offers and viewings.</p></div></div>
    <NotificationsList />
  </main>;
}
