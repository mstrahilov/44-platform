'use client';

import { useEffect } from 'react';
import { AchievementIconGlyph } from '@/components/AchievementIconGlyph';

export interface AchievementToastData {
  id: string;
  title: string;
  description?: string | null;
  achievementCode?: string | null;
}

export function AchievementToast({
  toast,
  onDone,
}: {
  toast: AchievementToastData | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(onDone, 4200);
    return () => window.clearTimeout(timeout);
  }, [toast, onDone]);

  if (!toast) return null;

  return (
    <div className="achievement-toast" role="status" aria-live="polite">
      <div className="achievement-toast-icon" aria-hidden="true">
        <AchievementIconGlyph code={toast.achievementCode} label={toast.title} />
      </div>
      <div className="achievement-toast-copy">
        <div className="achievement-toast-eyebrow">Achievement Unlocked</div>
        <strong>{toast.title}</strong>
        {toast.description && <p>{toast.description}</p>}
      </div>
    </div>
  );
}
