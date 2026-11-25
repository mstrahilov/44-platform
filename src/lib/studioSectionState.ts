/**
 * Optional Studio sections are only meaningful when they have content behind
 * them. Keep the persisted toggle separate from the content itself, but never
 * let an empty section remain enabled after a load or save.
 */
export function hasConfiguredAchievements(achievements: Array<{ code: string; enabled: boolean }>) {
  // Trophy is a derived roll-up and is not, by itself, creator-authored
  // achievement content.
  return achievements.some(achievement => achievement.code !== 'overachiever' && achievement.enabled);
}

export function normalizeStudioSectionEnabled(input: {
  requested: boolean;
  hasContent: boolean;
}) {
  return Boolean(input.requested && input.hasContent);
}

