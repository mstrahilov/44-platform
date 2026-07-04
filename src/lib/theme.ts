// 44OS theme controller.
// Two independent axes: MODE (light/dark, or system) and ACCENT (the glass /
// ambient color). Everything is driven by body classes that swap --os-* tokens:
//   body.theme-light | body.theme-dark      -> readability (ink/paper/glass)
//   body.accent-amber | -sage | -ocean | -violet -> --os-color-accent (+ ambient glow)

export type ThemeMode = 'system' | 'light' | 'dark';
export type ThemeAccent = 'amber' | 'sage' | 'ocean' | 'violet';

export const ACCENTS: { id: ThemeAccent; label: string; swatch: string }[] = [
  { id: 'amber', label: 'Amber', swatch: '#f59e0b' },
  { id: 'sage', label: 'Sage', swatch: '#7cff4f' },
  { id: 'ocean', label: 'Ocean', swatch: '#60a5fa' },
  { id: 'violet', label: 'Violet', swatch: '#a78bfa' },
];

export const MODES: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

const MODE_KEY = '44-theme-mode';
const ACCENT_KEY = '44-theme-accent';
const DEFAULT_MODE: ThemeMode = 'light';
const DEFAULT_ACCENT: ThemeAccent = 'amber';

export function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  const v = window.localStorage.getItem(MODE_KEY);
  return v === 'system' || v === 'light' || v === 'dark' ? v : DEFAULT_MODE;
}

export function getStoredAccent(): ThemeAccent {
  if (typeof window === 'undefined') return DEFAULT_ACCENT;
  const v = window.localStorage.getItem(ACCENT_KEY);
  return v === 'amber' || v === 'sage' || v === 'ocean' || v === 'violet' ? v : DEFAULT_ACCENT;
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

  for (const a of ACCENTS) body.classList.remove(`accent-${a.id}`);
  body.classList.add(`accent-${accent}`);
}

export function setMode(mode: ThemeMode) {
  if (typeof window !== 'undefined') window.localStorage.setItem(MODE_KEY, mode);
  applyTheme(mode, getStoredAccent());
}

export function setAccent(accent: ThemeAccent) {
  if (typeof window !== 'undefined') window.localStorage.setItem(ACCENT_KEY, accent);
  applyTheme(getStoredMode(), accent);
}
