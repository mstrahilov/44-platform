import type { CSSProperties } from 'react';

import { getAchievementIconPath } from '@/lib/achievementIcons';

type AchievementIconGlyphProps = {
  code?: string | null;
  label: string;
};

export function AchievementIconGlyph({ code, label }: AchievementIconGlyphProps) {
  const iconPath = getAchievementIconPath(code);

  if (!iconPath) {
    return <span className="achievement-icon-fallback ui44-achievement-glyph">{label.slice(0, 2).toUpperCase()}</span>;
  }

  return (
    <span
      className="achievement-icon-mask ui44-achievement-glyph"
      style={{ '--achievement-icon-url': `url("${iconPath}")` } as CSSProperties}
    />
  );
}
