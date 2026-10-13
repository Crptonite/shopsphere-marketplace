/** Columns for the "Home & Services" mega menu. Each link searches for its label. */
export type MegaColumn = { title: string; links: string[] };

export const HOME_SERVICES_MENU: MegaColumn[] = [
  { title: 'Services', links: ['Renovations', 'Home Repairs', 'Movers & Delivery', 'Home Cleaning', 'Aircon Services'] },
  {
    title: 'Furniture & Home Living',
    links: ['Furniture', 'Outdoor Furniture', 'Lighting & Fans', 'Home Decor Accessories', 'Home Fragrance', 'Bedding & Towels',
      'Bathroom & Kitchen Accessories', 'Home Improvement & Organisation', 'Cleaning & Homecare Supplies', 'Kitchenware & Tableware',
      'Security & Locks', 'Gardening'],
  },
  {
    title: 'Appliances',
    links: ['TV & Entertainment', 'Kitchen Appliances', 'Portable Air Conditioners & Heaters', 'Washing Machines and Dryers',
      'Vacuum Cleaner & Housekeeping', 'Water Heater & Instant Showers', 'Air Purifiers & Dehumidifiers', 'Electrical, Adaptors & Sockets',
      'Irons & Steamers', 'Other Home Appliances'],
  },
];

/** Mattress Deep Cleaning flash deal, 10–14 Oct 2026 (Singapore time). */
export const FLASH_DEAL = {
  name: 'Mattress Deep Cleaning',
  endsAt: '2026-10-15T00:00:00+08:00',
  prices: [
    { size: 'Single / Super Single', price: 50, was: 77 },
    { size: 'Queen', price: 60, was: 87 },
    { size: 'King', price: 70, was: 97 },
  ],
};

export const KINDA_THING = ['iPhone', 'MacBook Neo', 'S26 Ultra'];

/** Single-column dropdown for the Collectibles tab. */
export const COLLECTIBLES_MENU: MegaColumn[] = [
  {
    title: 'Collectibles',
    links: ['Toys & Collectibles', 'Trading Cards', 'Figurines & Models', 'Toys', 'Fan Merchandise', 'Memorabilia & Antiques'],
  },
];

/** Two-column Fashion & Luxury menu from the design. */
export const FASHION_LUXURY_MENU: MegaColumn[] = [
  { title: 'Fashion', links: ["Women's Fashion", "Men's Fashion", 'Beauty & Personal Care'] },
  { title: 'Luxury', links: ['Bags & Wallets', 'Apparel', 'Accessories', 'Watches', 'Sneakers & Footwear'] },
];
