export type LandingPageId =
  | 'home'
  | 'music'
  | 'books'
  | 'assets'
  | 'radio'
  | 'merch'
  | 'shop'
  | 'resources'
  | 'services'
  | 'community'
  | 'notifications'
  | 'dashboard'
  | 'account'
  | 'settings'
  | 'store'
  | 'library';

export const LANDING_PAGE_STORAGE_KEY = '44-setting-landing-page';
export const DEFAULT_LANDING_PAGE: LandingPageId = 'store';

export const LANDING_PAGES: Array<{ id: LandingPageId; label: string; href: string }> = [
  { id: 'home', label: 'Home', href: '/home' },
  { id: 'store', label: 'Store', href: '/store' },
  { id: 'library', label: 'Library', href: '/library' },
  { id: 'music', label: 'Music', href: '/store/music' },
  { id: 'books', label: 'Books', href: '/store/books' },
  { id: 'assets', label: 'Assets', href: '/store/assets' },
  { id: 'radio', label: 'Radio', href: '/radio' },
  { id: 'merch', label: 'Merch', href: '/store/merch' },
  { id: 'resources', label: 'Resources', href: '/resources' },
  { id: 'services', label: 'Services', href: '/services' },
  { id: 'community', label: 'Community', href: '/community' },
  { id: 'notifications', label: 'Notifications', href: '/notifications' },
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { id: 'account', label: 'Account', href: '/settings?tab=account' },
  { id: 'settings', label: 'Settings', href: '/settings' },
];

const LEGACY_LANDING_PAGE_HREFS: Partial<Record<LandingPageId, string>> = {
  shop: '/store/merch',
  home: '/store',
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
