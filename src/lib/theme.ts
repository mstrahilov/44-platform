// 44OS theme controller.
// Two independent axes: MODE (light/dark, or system) and ACCENT (the glass /
// ambient color). Everything is driven by body classes that swap --os-* tokens:
//   body.theme-light | body.theme-dark      -> readability (ink/paper/glass)
//   body.accent-* -> --os-color-accent (+ ambient glow)

export type ThemeMode = 'system' | 'light' | 'dark';
export type ThemeAccent = 'amber' | 'sage' | 'ocean' | 'violet';

export const ACCENTS: { id: ThemeAccent; label: string; swatch: string }[] = [
  { id: 'amber', label: 'Amber', swatch: '#f59e0b' },
  { id: 'sage', label: 'Sage', swatch: '#7cff4f' },
  { id: 'ocean', label: 'Ocean', swatch: '#60a5fa' },
  { id: 'violet', label: 'Violet', swatch: '#b56cff' },
];

export const MODES: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export const DEFAULT_THEME_MODE: ThemeMode = 'dark';
export const DEFAULT_THEME_ACCENT: ThemeAccent = 'ocean';

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function isThemeAccent(value: unknown): value is ThemeAccent {
  return ACCENTS.some(accent => accent.id === value);
}

export function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }
  return mode;
}

export function applyTheme(mode: ThemeMode, accent: ThemeAccent) {
  if (typeof document === 'undefined') return;
  const body = document.body;
  const resolved = resolveMode(mode);

  body.classList.remove('theme-light', 'theme-dark');
  body.classList.add(`theme-${resolved}`);

  body.classList.remove('accent-amber', 'accent-sage', 'accent-ocean', 'accent-violet', 'accent-red', 'accent-cyan');
  body.classList.add(`accent-${accent}`);
}
