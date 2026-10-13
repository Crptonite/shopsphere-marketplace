import Link from 'next/link';
import { FLASH_DEAL } from '@/lib/mega-menu';

/** Home-services flash deal banner. Hides itself after the deal ends. */
export default function FlashDeal() {
  if (Date.now() >= new Date(FLASH_DEAL.endsAt).getTime()) return null;
  return <section className="flash-deal" aria-label="Flash deal">
    <div className="flash-copy">
      <span className="flash-tag">10.10 Home Services Flash Deal</span>
      <h2>{FLASH_DEAL.name}</h2>
      <p>Running 10–14 Oct · Limited slots</p>
      <Link className="btn btn-sm" href={`/search?q=${encodeURIComponent(FLASH_DEAL.name)}`}>Book now</Link>
    </div>
    <div className="flash-prices">
      {FLASH_DEAL.prices.map((p) => <div key={p.size}>
        <small>{p.size}</small>
        <strong>${p.price}</strong>
        <s>U.P. ${p.was}</s>
      </div>)}
    </div>
  </section>;
}
