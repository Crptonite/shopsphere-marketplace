'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, SlidersHorizontal, type LucideIcon } from 'lucide-react';

/** One settings row, e.g. "Status: Active >". Expands inline to show its options. */
export type FilterOption = { id: string; label: string; options: string[] };
export type FilterEntry = FilterOption | 'divider';

/**
 * Reusable filter / sort popover. The parent owns `values` (keyed by option id)
 * so several popovers can share one settings object.
 */
export default function FilterPopover({
  items, values, onChange, icon: Icon = SlidersHorizontal, label = 'Filter & sort',
}: {
  items: FilterEntry[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  icon?: LucideIcon;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return <div className="filter-pop" ref={ref}>
    <button className={`icon-button ${open ? 'is-active' : ''}`} aria-label={label} aria-haspopup="menu" aria-expanded={open}
      onClick={() => { setOpen((o) => !o); setExpanded(null); }}>
      <Icon size={17} />
    </button>
    {open && <div className="dropdown filter-menu" role="menu">
      {items.map((item, i) => item === 'divider'
        ? <hr key={`divider-${i}`} />
        : <div key={item.id}>
          <button role="menuitem" className="filter-row" aria-expanded={expanded === item.id} onClick={() => setExpanded((e) => (e === item.id ? null : item.id))}>
            <span>{item.label}</span>
            <span className="filter-value">{values[item.id]} <ChevronRight size={14} /></span>
          </button>
          {expanded === item.id && <div className="filter-options" role="group" aria-label={item.label}>
            {item.options.map((opt) => <button key={opt} role="menuitemradio" aria-checked={values[item.id] === opt}
              className={values[item.id] === opt ? 'is-checked' : ''}
              onClick={() => { onChange(item.id, opt); setExpanded(null); }}>
              {opt}{values[item.id] === opt && <Check size={14} />}
            </button>)}
          </div>}
        </div>)}
    </div>}
  </div>;
}
