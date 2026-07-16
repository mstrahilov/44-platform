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
    <div className="achievement-toast ui44-achievement-toast" role="status" aria-live="polite">
      <div className="achievement-toast-icon ui44-achievement-toast-icon" aria-hidden="true">
        <AchievementIconGlyph code={toast.achievementCode} label={toast.title} />
      </div>
      <div className="achievement-toast-copy ui44-achievement-toast-copy">
        <div className="achievement-toast-eyebrow ui44-achievement-toast-eyebrow">Achievement Unlocked</div>
        <strong className="ui44-achievement-toast-title">{toast.title}</strong>
        {toast.description && <p className="ui44-achievement-toast-body">{toast.description}</p>}
      </div>
    </div>
  );
}
