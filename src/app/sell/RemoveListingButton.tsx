'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RemoveListingButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirm('Remove this listing? Buyers will no longer see it.')) return;
    setBusy(true);
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    setBusy(false);
    router.refresh();
  }
  return <button className="btn btn-danger btn-sm" onClick={remove} disabled={busy}>Remove</button>;
}
