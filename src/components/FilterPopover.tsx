'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function FilterPopover({
  label,
  active = false,
  children,
}: {
  label: string;
  active?: boolean;
  children: (controls: { close: () => void }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideInteraction(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
    document.addEventListener('mousedown', closeOnOutsideInteraction);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideInteraction);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={open ? 'page-filter-menu page-filter-menu-open' : 'page-filter-menu'}>
      <button
        ref={triggerRef}
        type="button"
        className={`ui44-symbol-button ui44-symbol-button-filter page-filter-button${active ? ' ui44-symbol-button-active page-filter-button-active' : ''}`}
        aria-label={label}
        title={label}
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <span className="page-filter-icon" aria-hidden="true"><i /><i /><i /></span>
      </button>
      {open && <div className="ui44-paper-menu page-filter-popover">{children({ close: () => setOpen(false) })}</div>}
    </div>
  );
}
