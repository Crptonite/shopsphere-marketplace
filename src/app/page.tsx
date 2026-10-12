import { Suspense } from 'react';
import Marketplace from '@/components/Marketplace';

export default function HomePage() {
  return <Suspense><Marketplace variant="home" /></Suspense>;
}
