import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import AppSidebar from '@/components/AppSidebar';
import './globals.css';
import './app.css';

export const metadata: Metadata = {
  title: 'ShopSphere — Singapore Marketplace',
  description: 'Discover, buy and sell tech, everyday finds and property in Singapore.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-SG"><body>
    <SiteHeader />
    <div className="app-shell">
      <AppSidebar />
      <div className="app-content">{children}</div>
    </div>
    <SiteFooter />
  </body></html>;
}
