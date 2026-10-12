import CartView from './CartView';

export const metadata = { title: 'Cart — ShopSphere' };

export default async function CartPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const { cancelled } = await searchParams;
  return <main className="page page-narrow">
    <div className="page-head"><div><div className="eyebrow">YOUR BAG</div><h1>Shopping cart</h1></div></div>
    {cancelled && <div className="alert alert-warn">Checkout was cancelled — you have not been charged. Your items are still here.</div>}
    <CartView />
  </main>;
}
