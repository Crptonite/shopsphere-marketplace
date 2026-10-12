import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getConversation, getMessages, listConversations, markRead } from '@/lib/chats';
import AdSlot from '@/components/AdSlot';
import ChatList from '../ChatList';
import ChatThread from './ChatThread';

export const metadata = { title: 'Chat — ShopSphere' };

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/chats/${id}`);
  const conversation = await getConversation(id, user.id);
  if (!conversation) notFound();
  const [messages, conversations] = await Promise.all([getMessages(id), listConversations(user.id)]);
  await markRead(conversation);

  return <main className="page page-wide">
    <div className="chat-layout has-thread">
      <div className="card chat-list-col"><ChatList initial={conversations} activeId={id} /></div>
      <div className="card"><ChatThread conversation={conversation} initialMessages={messages} me={user.id} /></div>
      <AdSlot excludeSellerId={user.id} />
    </div>
  </main>;
}
