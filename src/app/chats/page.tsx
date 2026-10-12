import { MessageCircle } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { hasDb } from '@/lib/db';
import { listConversations } from '@/lib/chats';
import AdSlot from '@/components/AdSlot';
import ChatList from './ChatList';

export const metadata = { title: 'Chats — ShopSphere' };

export default async function ChatsPage() {
  const user = await requireUser('/chats');
  if (!hasDb()) return <main className="page"><div className="alert alert-warn">Database not configured.</div></main>;
  const conversations = await listConversations(user.id);
  return <main className="page page-wide">
    <div className="chat-layout">
      <div className="card chat-list-col"><ChatList initial={conversations} /></div>
      <div className="card chat-empty"><MessageCircle size={30} /><h3>Select a conversation</h3><p className="hint">Make trade-in offers and book property viewings right from the chat.</p></div>
      <AdSlot excludeSellerId={user.id} />
    </div>
  </main>;
}
