import type { NextConfig } from 'next';

// Canonical URL map. Sections with an existing page redirect to it; the rest have their own pages.
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/selling/listings', destination: '/sell/listings', permanent: false },
      { source: '/selling/growth/promote-listings', destination: '/sell/listings?tab=active', permanent: false },
      { source: '/selling/growth/promo-calendar', destination: '/promos', permanent: false },
      { source: '/buying/purchases', destination: '/orders', permanent: false },
      { source: '/buying/likes', destination: '/likes', permanent: false },
      { source: '/buying/saved-searches', destination: '/saved-searches', permanent: false },
      { source: '/buying/promos', destination: '/promos', permanent: false },
      { source: '/services/certified', destination: '/certified', permanent: false },
      { source: '/finance/spending', destination: '/spending', permanent: false },
    ];
  },
};
export default nextConfig;
