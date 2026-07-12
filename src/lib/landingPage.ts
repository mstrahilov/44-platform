export type LandingPageId =
  | 'home'
  | 'music'
  | 'books'
  | 'assets'
  | 'radio'
  | 'merch'
  | 'shop'
  | 'community'
  | 'notifications'
  | 'studio'
  | 'account'
  | 'settings'
  | 'store'
  | 'library';

export const LANDING_PAGE_STORAGE_KEY = '44-setting-landing-page';
export const DEFAULT_LANDING_PAGE: LandingPageId = 'store';

export const LANDING_PAGES: Array<{ id: LandingPageId; label: string; href: string }> = [
  { id: 'store', label: 'Store', href: '/store' },
  { id: 'library', label: 'Library', href: '/library' },
  { id: 'radio', label: 'Radio', href: '/radio' },
  { id: 'community', label: 'Community', href: '/community' },
];

const LEGACY_LANDING_PAGE_HREFS: Partial<Record<LandingPageId | 'dashboard', string>> = {
  shop: '/store/merch',
  home: '/',
  dashboard: '/studio',
  studio: '/studio',
};

export function isLandingPageId(value: string | null): value is LandingPageId {
  return LANDING_PAGES.some(page => page.id === value) || value === 'store' || value === 'library';
}

export function getLandingPageId(): LandingPageId {
  if (typeof window === 'undefined') return DEFAULT_LANDING_PAGE;
  const stored = window.localStorage.getItem(LANDING_PAGE_STORAGE_KEY);
  if (stored === 'shop') return 'store';
  if (stored === 'home') return 'store';
  if (stored === 'friends' || stored === 'inbox') return 'community';
  if (stored === 'account') return 'settings';
  if (stored === 'dashboard') return 'studio';
  return isLandingPageId(stored) ? stored : DEFAULT_LANDING_PAGE;
}

export function setLandingPageId(id: LandingPageId) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANDING_PAGE_STORAGE_KEY, id);
}

export function getLandingPageHref() {
  const id = getLandingPageId();
  return LANDING_PAGES.find(page => page.id === id)?.href ?? LEGACY_LANDING_PAGE_HREFS[id] ?? '/';
}
