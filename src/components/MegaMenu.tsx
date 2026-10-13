'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { MegaColumn } from '@/lib/mega-menu';

/** Navbar tab that opens a category panel. One column renders as a compact dropdown. */
export default function MegaMenu({ label, id, columns }: { label: string; id: string; columns: MegaColumn[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return <div className="mega" ref={ref}>
    <button className={`nav-tab ${open ? 'is-active' : ''}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
      {label} <ChevronDown size={14} />
    </button>
    {open && <div id={id} className="mega-panel">
      <div className={`mega-inner ${columns.length === 1 ? 'is-narrow' : ''}`}>
        {columns.map((col) => <section key={col.title}>
          <h3>{col.title}</h3>
          <ul>{col.links.map((item) => <li key={item}>
            <Link href={`/search?q=${encodeURIComponent(item)}`} onClick={() => setOpen(false)}>{item}</Link>
          </li>)}</ul>
        </section>)}
      </div>
    </div>}
  </div>;
}
