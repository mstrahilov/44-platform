'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function FilterPopover({
  label,
  active = false,
  hideTrigger = false,
  popoverClassName = '',
  children,
}: {
  label: string;
  active?: boolean;
  hideTrigger?: boolean;
  popoverClassName?: string;
  children: (controls: { close: () => void }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideInteraction(event: MouseEvent) {
      if ((event.target as Element | null)?.closest('[data-filter-popover-trigger="true"]')) return;
      if (rootRef.current?.contains(event.target as Node) || popoverRef.current?.contains(event.target as Node)) return;
      setOpen(false);
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

  useEffect(() => {
    function toggleFromToolbar(event: Event) {
      const detail = (event as CustomEvent<{ label?: string }>).detail;
      if (detail?.label === label) setOpen(current => !current);
    }
    window.addEventListener('44:toggle-filter-popover', toggleFromToolbar);
    return () => window.removeEventListener('44:toggle-filter-popover', toggleFromToolbar);
  }, [label]);

  return (
    <div ref={rootRef} className={`${open ? 'page-filter-menu page-filter-menu-open' : 'page-filter-menu'}${hideTrigger ? ' page-filter-menu-external-trigger' : ''}`}>
      {!hideTrigger ? <button
        ref={triggerRef}
        type="button"
        className={`ui44-symbol-button ui44-symbol-button-filter page-filter-button${active ? ' ui44-symbol-button-active page-filter-button-active' : ''}`}
        aria-label={label}
        title={label}
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <span className="page-filter-icon" aria-hidden="true"><i /><i /><i /></span>
      </button> : null}
      {open ? (() => {
        const popover = <div ref={popoverRef} className={`ui44-paper-menu page-filter-popover ${popoverClassName}`.trim()}>{children({ close: () => setOpen(false) })}</div>;
        return hideTrigger && typeof document !== 'undefined' ? createPortal(popover, document.body) : popover;
      })() : null}
    </div>
  );
}
