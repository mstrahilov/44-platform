'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useUi44DialogFocus } from '@/components/ui44/Dialog';

export function InformationDialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useUi44DialogFocus<HTMLElement>({ active: open, onDismiss: onClose });
  if (!open) return null;

  return createPortal(
    <div className="ui44-dialog-overlay information-dialog-overlay" role="presentation">
      <button type="button" className="ui44-dialog-scrim" aria-label="Close information" onClick={onClose} />
      <section
        ref={dialogRef}
        className="ui44-dialog-surface ui44-panel ui44-panel-glass information-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="information-dialog-title"
      >
        <header className="information-dialog-header">
          <h2 id="information-dialog-title">{title}</h2>
          <button type="button" className="information-dialog-close" aria-label="Close" onClick={onClose}>×</button>
        </header>
        <div className="information-dialog-body">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
