export const money = (n: number | string, digits = 0) =>
  new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(n));

export const money2 = (n: number | string) => money(n, 2);

export const dateTime = (d: string | Date) =>
  new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore' }).format(new Date(d));

export const dateOnly = (d: string | Date) =>
  new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeZone: 'Asia/Singapore' }).format(new Date(d));

export const listingTypeLabel: Record<string, string> = {
  goods: 'For sale',
  trade_in: 'Trade-in / swap',
  property_sale: 'Property for sale',
  property_rent: 'Property for rent',
};

export const isProperty = (type: string) => type === 'property_sale' || type === 'property_rent';
