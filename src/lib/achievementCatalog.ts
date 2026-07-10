export const V1_ACHIEVEMENT_CODES = [
  'front_to_back',
  'no_skips',
  'nightbird',
  'heavy_rotation',
  'joined_the_orbit',
  'left_your_mark',
  'signal_boost',
  'overachiever',
] as const;

const V1_ACHIEVEMENT_CODE_SET = new Set<string>(V1_ACHIEVEMENT_CODES);

export function isV1AchievementCode(code: string | null | undefined) {
  return Boolean(code && V1_ACHIEVEMENT_CODE_SET.has(code));
}
