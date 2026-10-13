import AiChat from '@/components/trade/AiChat';

export const metadata = { title: 'OpenRouter — Trade — ShopSphere' };

export default function AiChatPage() {
  return <main className="page page-wide">
    <div className="page-head"><div><div className="eyebrow">DISCOVER</div><h1>OpenRouter</h1><p>Ask the Trade assistant about stocks and investing basics. Sign in to use it.</p></div></div>
    <AiChat />
  </main>;
}
