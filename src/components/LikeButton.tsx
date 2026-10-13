'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useLikes } from '@/components/useLikes';

/** Heart button that saves a listing to likes. When saved, it links to the full likes list. */
export default function LikeButton({ productId }: { productId: string }) {
  const { ids, toggle } = useLikes();
  const liked = ids.includes(productId);
  return <div className="like-row">
    <button
      type="button"
      className={`btn btn-ghost btn-sm like-btn${liked ? ' is-liked' : ''}`}
      aria-pressed={liked}
      aria-label={liked ? 'Remove from my likes' : 'Save to my likes'}
      title={liked ? 'Remove from my likes' : 'Save to my likes'}
      onClick={() => toggle(productId)}
    >
      <Heart size={16} fill={liked ? 'currentColor' : 'none'} /> {liked ? 'SAVED' : 'Save'}
    </button>
    {liked && <Link className="like-link" href="/buying/likes">My likes · Show all liked products</Link>}
  </div>;
}
