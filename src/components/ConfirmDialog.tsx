'use client';

import { useUi44DialogFocus } from '@/components/ui44/Dialog';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useUi44DialogFocus<HTMLDivElement>({ active: open, onDismiss: onCancel });
  if (!open) return null;

  return (
    <div
      className="os-modal-backdrop ui44-dialog-overlay"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="os-modal ui44-dialog-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="os-modal-body">
          <h2 id="confirm-dialog-title" className="os-modal-title ui44-type ui44-type-subsection-title">
            {title}
          </h2>
          <p className="os-modal-copy">{description}</p>
        </div>
        <div className="os-modal-actions ui44-dialog-actions">
          <button type="button" className="os-button os-button-secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={destructive ? 'os-button os-button-danger' : 'os-button os-button-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
