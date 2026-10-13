import { Suspense } from 'react';
import Marketplace from '@/components/Marketplace';
import FlashDeal from '@/components/FlashDeal';
import HomeRecommendations from '@/components/HomeRecommendations';

export default function HomePage() {
  return <main className="page page-wide home-page">
    <FlashDeal />
    <Suspense fallback={null}><HomeRecommendations /></Suspense>
    <Suspense><Marketplace variant="home" /></Suspense>
  </main>;
}
