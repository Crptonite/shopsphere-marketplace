import { Suspense } from 'react';
import Marketplace from '@/components/Marketplace';

export const metadata = { title: 'Search — ShopSphere' };

export default function SearchPage() {
  return <Suspense><Marketplace variant="results" /></Suspense>;
}
