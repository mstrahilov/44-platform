export type ReleaseFeatureBadge = {
  id: string;
  label: string;
};

export function buildReleaseFeatureBadges({
  achievementCount,
  assetTypes,
}: {
  achievementCount: number;
  assetTypes: string[];
}): ReleaseFeatureBadge[] {
  const types = new Set(assetTypes);
  const badges: ReleaseFeatureBadge[] = [];

  if (achievementCount > 0) badges.push({ id: 'achievements', label: 'Achievements' });
  if (types.has('bonus_content') || types.has('bonus_achievement')) badges.push({ id: 'bonus_content', label: 'Bonus Content' });
  if (types.has('commentary_audio')) badges.push({ id: 'commentary_audio', label: 'Commentary Mode' });
  if (types.has('behind_the_scenes')) badges.push({ id: 'behind_the_scenes', label: 'Behind the Scenes' });

  return badges;
}

export function ReleaseFeatureBadges({ badges }: { badges: ReleaseFeatureBadge[] }) {
  if (badges.length === 0) return null;

  return (
    <div className="app-tag-row">
      {badges.map(badge => (
        <span key={badge.id} className="os-pill os-type-pill">{badge.label}</span>
      ))}
    </div>
  );
}
