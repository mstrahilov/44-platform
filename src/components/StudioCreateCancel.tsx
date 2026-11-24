'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTopbarLeadingAction } from '@/components/TopbarContext';
import { clearStudioFormRecovery } from '@/lib/studioFormRecovery';

function CloseGlyph() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>;
}

type StudioCreateCancelProps = {
  dirty: boolean;
  recoveryKey?: string;
  href: string;
  onDiscard?: () => void;
};

/** Shared X/discard behavior for new Studio forms. */
export function StudioCreateCancel({ dirty, recoveryKey = '', href, onDiscard }: StudioCreateCancelProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const discard = useCallback(() => {
    clearStudioFormRecovery(recoveryKey);
    onDiscard?.();
    router.replace(href);
  }, [href, onDiscard, recoveryKey, router]);

  const requestCancel = useCallback(() => {
    if (dirty) setConfirmOpen(true);
    else discard();
  }, [dirty, discard]);

  const action = useMemo(() => (
    <button type="button" className="ui44-symbol-button ui44-symbol-button-back os-topbar-back" aria-label="Cancel" title="Cancel" onClick={requestCancel}>
      <CloseGlyph />
    </button>
  ), [requestCancel]);
  useTopbarLeadingAction(action);

  return (
    <ConfirmDialog
      open={confirmOpen}
      title="Discard changes?"
      description="Your unsaved changes will be lost."
      confirmLabel="Discard Changes"
      cancelLabel="Cancel"
      destructive
      variant="studio-discard"
      onCancel={() => setConfirmOpen(false)}
      onConfirm={() => { setConfirmOpen(false); discard(); }}
    />
  );
}
