/** Navigation groups shared by the persistent sidebar and the hamburger menu. */
export const NAV_GROUPS: { title: string; links: [string, string][] }[] = [
  { title: 'My account', links: [['/account', 'My account']] },
  { title: 'Selling', links: [['/selling/listings', 'My listings'], ['/selling/sales', 'My sales'], ['/selling/manage', 'Manage'], ['/selling/growth/promote-listings', 'Promote listings'], ['/selling/growth/promo-calendar', 'Promo calendar']] },
  { title: 'Buying', links: [['/buying/purchases', 'My purchases'], ['/buying/likes', 'My likes'], ['/buying/saved-searches', 'Saved searches'], ['/buying/promos', 'My promos'], ['/services/certified', 'Certified services']] },
  { title: 'Trade', links: [['/trade', 'Trade']] },
  { title: 'More', links: [['/settings', 'Settings'], ['/finance', 'Finance dashboard'], ['/finance/spending', 'Spending']] },
];
