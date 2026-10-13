'use client';

import Link from 'next/link';
import { useState } from 'react';
import { X } from 'lucide-react';

/** Dismissable tip under the profile stats. */
export default function TipBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return <div className="tip-banner" role="note">
    <span>📢 Listings with clear photos get more views. <Link href="/sell">Add photos ›</Link></span>
    <button type="button" className="icon-button" aria-label="Dismiss tip" onClick={() => setOpen(false)}><X size={14} /></button>
  </div>;
}
