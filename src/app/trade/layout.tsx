import type { ReactNode } from 'react';
import TradeNav from '@/components/TradeNav';

/** Trade section layout: secondary navigation beside each trade page. */
export default function TradeLayout({ children }: { children: ReactNode }) {
  return <div className="trade-shell">
    <TradeNav />
    <div className="trade-body">{children}</div>
  </div>;
}
