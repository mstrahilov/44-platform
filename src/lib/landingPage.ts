export type LandingPageId = 'store' | 'library' | 'community' | 'account';

export const LANDING_PAGE_STORAGE_KEY = '44-setting-landing-page';
export const DEFAULT_LANDING_PAGE: LandingPageId = 'store';

export const LANDING_PAGES: Array<{ id: LandingPageId; label: string; href: string }> = [
  { id: 'store', label: 'Store', href: '/' },
  { id: 'library', label: 'Library', href: '/library' },
  { id: 'community', label: 'Community', href: '/community' },
  { id: 'account', label: 'Account', href: '/account' },
];

export function isLandingPageId(value: string | null): value is LandingPageId {
  return LANDING_PAGES.some(page => page.id === value);
}

export function getLandingPageId(): LandingPageId {
  if (typeof window === 'undefined') return DEFAULT_LANDING_PAGE;
  const stored = window.localStorage.getItem(LANDING_PAGE_STORAGE_KEY);
  return isLandingPageId(stored) ? stored : DEFAULT_LANDING_PAGE;
}

export function setLandingPageId(id: LandingPageId) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANDING_PAGE_STORAGE_KEY, id);
}

export function getLandingPageHref() {
  return LANDING_PAGES.find(page => page.id === getLandingPageId())?.href ?? '/';
}
