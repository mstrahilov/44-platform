'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function FilterPopover({
  label,
  children,
}: {
  label: string;
  children: (controls: { close: () => void }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideInteraction(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideInteraction);
    return () => document.removeEventListener('mousedown', closeOnOutsideInteraction);
  }, [open]);

  return (
    <div ref={rootRef} className={open ? 'page-filter-menu page-filter-menu-open' : 'page-filter-menu'}>
      <button
        type="button"
        className="page-filter-button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <span className="page-filter-icon" aria-hidden="true"><i /><i /><i /></span>
      </button>
      {open && <div className="page-filter-popover">{children({ close: () => setOpen(false) })}</div>}
    </div>
  );
}
