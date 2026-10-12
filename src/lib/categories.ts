/** Browse categories shared by the navbar, side panel and /categories page. */
export type BrowseCategory = { slug: string; label: string; detail: string; params: Record<string, string>; tone: string; nav?: boolean };

export const CATEGORIES: BrowseCategory[] = [
  { slug: 'phones', label: 'Mobile Phones & Gadgets', detail: 'iPhone, Galaxy, Pixel and more', params: { category: 'Phones' }, tone: 'cat-lavender', nav: true },
  { slug: 'tablets', label: 'Tablets', detail: 'iPad, Galaxy Tab', params: { category: 'Tablets' }, tone: 'cat-blue' },
  { slug: 'laptops', label: 'Laptops', detail: 'MacBook, gaming, work', params: { category: 'Laptops' }, tone: 'cat-sage', nav: true },
  { slug: 'accessories', label: 'Accessories', detail: 'Cases, chargers, audio', params: { category: 'Accessories' }, tone: 'cat-peach' },
  { slug: 'trade-in', label: 'Trade-in Deals', detail: 'Swap up and top up the difference', params: { listingType: 'trade_in' }, tone: 'cat-peach', nav: true },
  { slug: 'fashion', label: 'Fashion & Luxury', detail: 'Wear it your way', params: { category: 'Fashion' }, tone: 'cat-lavender', nav: true },
  { slug: 'home', label: 'Home & Living', detail: 'Make space feel like you', params: { category: 'Home & living' }, tone: 'cat-sage' },
  { slug: 'property', label: 'Property for Sale', detail: 'HDB, condo and landed', params: { listingType: 'property_sale' }, tone: 'cat-sage', nav: true },
  { slug: 'rentals', label: 'Rentals', detail: 'Rooms and whole units', params: { listingType: 'property_rent' }, tone: 'cat-blue', nav: true },
  { slug: 'other', label: 'Everything Else', detail: 'Hobbies, toys, collectibles', params: { category: 'Other' }, tone: 'cat-blue' },
];

export const categoryHref = (c: BrowseCategory) => `/search?${new URLSearchParams(c.params)}`;
