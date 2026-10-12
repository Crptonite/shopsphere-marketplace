import LikesGrid from './LikesGrid';

export const metadata = { title: 'My likes — ShopSphere' };

export default function LikesPage() {
  return <main className="page">
    <div className="page-head"><div><div className="eyebrow">SAVED</div><h1>My likes</h1><p>Listings you&apos;ve hearted. Sold items stay here so you can find similar ones.</p></div></div>
    <LikesGrid />
  </main>;
}
