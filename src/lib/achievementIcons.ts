export const ACHIEVEMENT_ICON_PATHS: Record<string, string> = {
  front_to_back: '/achivements/Front%20to%20Back.png',
  no_skips: '/achivements/No%20Skips.png',
  nightbird: '/achivements/Nightbird.png',
  heavy_rotation: '/achivements/Heavy%20Rotation.png',
  joined_the_orbit: '/achivements/Joined%20the%20Orbit.png',
  left_your_mark: '/achivements/Left%20Your%20Mark.png',
  signal_boost: '/achivements/Signal%20Boost.png',
  overachiever: '/achivements/Overachiever.png',
};

export function getAchievementIconPath(code: string | null | undefined) {
  return code ? ACHIEVEMENT_ICON_PATHS[code] ?? null : null;
}
