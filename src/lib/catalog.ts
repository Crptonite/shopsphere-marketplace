export type Product = {
  id: string;
  title: string;
  brand: string;
  model: string;
  category: string;
  price: number;
  condition: 'New' | 'Like new' | 'Good';
  location: string;
  createdAt: string;
  image: string;
  seller: string;
  description: string;
  isSample: true;
};

export const catalog: Product[] = [
  { id:'demo-iphone-18-pro-max', title:'iPhone 18 Pro Max 256GB', brand:'Apple', model:'iPhone 18 Pro Max', category:'Phones', price:2199, condition:'New', location:'Orchard', createdAt:'2026-10-12T09:00:00+08:00', image:'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=85', seller:'Demo Mobile Store', description:'Illustrative demo offer. Confirm model, stock and seller details before purchase.', isSample:true },
  { id:'demo-iphone-18-pro', title:'iPhone 18 Pro 256GB', brand:'Apple', model:'iPhone 18 Pro', category:'Phones', price:1899, condition:'New', location:'Bugis', createdAt:'2026-10-11T15:30:00+08:00', image:'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=85', seller:'Demo Tech Hub', description:'Illustrative demo offer. Not a verified live listing.', isSample:true },
  { id:'demo-iphone-17-pro-max', title:'iPhone 17 Pro Max 256GB', brand:'Apple', model:'iPhone 17 Pro Max', category:'Phones', price:1599, condition:'Like new', location:'Tampines', createdAt:'2026-10-12T12:20:00+08:00', image:'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=85', seller:'Sample Seller A', description:'Sample resale listing with illustrative price and condition.', isSample:true },
  { id:'demo-iphone-air', title:'iPhone Air 256GB', brand:'Apple', model:'iPhone Air', category:'Phones', price:1749, condition:'New', location:'Jurong East', createdAt:'2026-10-10T11:10:00+08:00', image:'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=85', seller:'Demo Mobile Store', description:'Illustrative demo offer. Not verified stock.', isSample:true },
  { id:'demo-galaxy-s26-ultra', title:'Samsung Galaxy S26 Ultra 256GB', brand:'Samsung', model:'Galaxy S26 Ultra', category:'Phones', price:1798, condition:'New', location:'City Hall', createdAt:'2026-10-12T08:10:00+08:00', image:'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85', seller:'Sample Galaxy Store', description:'Illustrative demo offer. Check official specifications and availability.', isSample:true },
  { id:'demo-galaxy-z-fold8', title:'Samsung Galaxy Z Fold8 512GB', brand:'Samsung', model:'Galaxy Z Fold8', category:'Phones', price:2498, condition:'New', location:'Woodlands', createdAt:'2026-10-09T13:00:00+08:00', image:'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85', seller:'Sample Galaxy Store', description:'Illustrative demo offer. Not a verified live listing.', isSample:true },
  { id:'demo-iphone-case', title:'MagSafe-compatible phone case', brand:'Accessories', model:'Phone case', category:'Accessories', price:19, condition:'New', location:'Queenstown', createdAt:'2026-10-12T14:10:00+08:00', image:'https://images.unsplash.com/photo-1603313011101-320f26a4f6f6?auto=format&fit=crop&w=900&q=85', seller:'Sample Accessories', description:'Generic sample accessory listing; compatibility must be confirmed.', isSample:true },
];

export const modelGroups = [
  { brand:'Apple', label:'iPhone 18 family', models:['iPhone 18','iPhone 18 Pro','iPhone 18 Pro Max','iPhone Duo'], category:'Phones', note:'Model suggestions; check official availability' },
  { brand:'Apple', label:'iPhone 17 family', models:['iPhone 17','iPhone 17 Pro','iPhone 17 Pro Max','iPhone 17e'], category:'Phones', note:'Browse the generation' },
  { brand:'Apple', label:'Other Apple phones', models:['iPhone Air','iPhone 16'], category:'Phones', note:'Related models' },
  { brand:'Samsung', label:'Galaxy S family', models:['Galaxy S26','Galaxy S26+','Galaxy S26 Ultra','Galaxy S26 FE'], category:'Phones', note:'Samsung flagship models' },
  { brand:'Samsung', label:'Galaxy Z family', models:['Galaxy Z Fold8','Galaxy Z Fold8 Ultra','Galaxy Z Flip8'], category:'Phones', note:'Foldable models' },
  { brand:'Samsung', label:'Galaxy A family', models:['Galaxy A series'], category:'Phones', note:'Everyday phones' },
];

export function rankProducts(query: string, sort: string, products = catalog): Product[] {
  const q = query.toLowerCase().trim();
  const terms = q.split(/\s+/).filter(Boolean);
  const ranked = products.map((p) => {
    const haystack = `${p.title} ${p.brand} ${p.model} ${p.category} ${p.description}`.toLowerCase();
    let score = 0;
    if (q && p.title.toLowerCase() === q) score += 100;
    if (q && p.model.toLowerCase() === q) score += 95;
    if (q && p.title.toLowerCase().startsWith(q)) score += 40;
    if (q && haystack.includes(q)) score += 25;
    for (const term of terms) if (haystack.includes(term)) score += 8;
    if (/^18$/.test(q) && /iphone 18/.test(haystack)) score += 30;
    if (/^17$/.test(q) && /iphone 17/.test(haystack)) score += 30;
    return { p, score };
  }).filter(({ p, score }) => !q || score > 0 || p.category.toLowerCase().includes(q));
  if (sort === 'recent') ranked.sort((a,b) => new Date(b.p.createdAt).getTime() - new Date(a.p.createdAt).getTime());
  else ranked.sort((a,b) => b.score - a.score || new Date(b.p.createdAt).getTime() - new Date(a.p.createdAt).getTime());
  return ranked.map(({p}) => p);
}
