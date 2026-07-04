/**
 * 44OS App Registry
 *
 * The single source of truth for every app in the 44OS shell. The Dock,
 * Settings > Dock, Home quick-launch, and (later) context menus and the
 * Electron app menu all render from this registry — never from local
 * nav arrays.
 *
 * An app's `label` and `description` are also the canonical app-header
 * copy: every app's first screen shows them in the upper left.
 */

export type OSAppId =
  | 'home'
  | 'music'
  | 'books'
  | 'assets'
  | 'radio'
  | 'merch'
  | 'shop'
  | 'services'
  | 'resources'
  | 'community'
  | 'friends'
  | 'notifications'
  | 'account'
  | 'inbox'
  | 'library'
  | 'store'
  | 'dashboard'
  | 'settings'
  | 'projects';

export type OSAppGroup = 'media' | 'community' | 'studio' | 'account' | 'system' | 'legacy';

export type OSApp = {
  id: OSAppId;
  label: string;
  description: string;
  href: string;
  iconClass: string;
  /** Dock cluster: media, community, studio, account, system, or hidden legacy. */
  group: OSAppGroup;
  /** Only rendered for signed-in users. */
  requiresAuth?: boolean;
  /** Only rendered for creator/admin profiles. */
  requiresCreator?: boolean;
  /** Registered but not shipped yet — never rendered. */
  hidden?: boolean;
  /** Cannot be hidden from the Dock via Settings. */
  locked?: boolean;
};

export const OS_APPS: OSApp[] = [
  {
    id: 'home',
    label: 'Home',
    description: 'Your 44OS home. Pick up where you left off.',
    href: '/home',
    iconClass: 'os-icon-home',
    group: 'legacy',
    requiresAuth: true,
    locked: true,
    hidden: true,
  },
  {
    id: 'music',
    label: 'Music',
    description: 'Your music library and new releases from creators on 44.',
    href: '/music',
    iconClass: 'os-icon-music',
    group: 'media',
  },
  {
    id: 'books',
    label: 'Books',
    description: 'Digital books and artbooks — read them right here.',
    href: '/books',
    iconClass: 'os-icon-books',
    group: 'media',
  },
  {
    id: 'assets',
    label: 'Assets',
    description: 'Samples, templates, presets, and creative tools for your work.',
    href: '/assets',
    iconClass: 'os-icon-assets',
    group: 'media',
  },
  {
    id: 'merch',
    label: 'Merch',
    description: 'Physical goods from 44 and creators: apparel, merch, and shipped items.',
    href: '/merch',
    iconClass: 'os-icon-merch',
    group: 'media',
  },
  {
    id: 'radio',
    label: 'Radio',
    description: 'Live mixes, creator stations, and listening rooms for 44.',
    href: '/radio',
    iconClass: 'os-icon-radio',
    group: 'legacy',
    hidden: true,
  },
  {
    id: 'community',
    label: 'Community',
    description: 'Connect with creatives, share work, and find collaborators.',
    href: '/community/feed',
    iconClass: 'os-icon-community',
    group: 'community',
  },
  {
    id: 'resources',
    label: 'Resources',
    description: 'Guides, templates, and useful references for creatives.',
    href: '/resources',
    iconClass: 'os-icon-resources',
    group: 'community',
  },
  {
    id: 'services',
    label: 'Services',
    description: 'Professional creative services, produced and delivered through 44.',
    href: '/services',
    iconClass: 'os-icon-services',
    group: 'community',
  },
  {
    id: 'friends',
    label: 'Friends',
    description: 'Manage private 44 friendships and requests.',
    href: '/community/friends',
    iconClass: 'os-icon-friends',
    group: 'legacy',
    requiresAuth: true,
    hidden: true,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Mentions, replies, achievements, and other account activity.',
    href: '/notifications',
    iconClass: 'os-icon-notifications',
    group: 'legacy',
    requiresAuth: true,
    hidden: true,
  },
  {
    id: 'account',
    label: 'Account',
    description: 'Your profile, identity, and account setup.',
    href: '/account',
    iconClass: 'os-icon-account',
    group: 'account',
    requiresAuth: true,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Your creator workspace — releases, resources, requests, and earnings.',
    href: '/dashboard',
    iconClass: 'os-icon-dashboard',
    group: 'studio',
    requiresAuth: true,
    requiresCreator: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'System settings — appearance, Dock, region, clock, accessibility, and advanced controls.',
    href: '/settings',
    iconClass: 'os-icon-settings',
    group: 'system',
    locked: true,
  },

  // ── Registered, not shipped yet ─────────────────────────────────────
  // These become visible as their phases land (see Other/44OS_FOUNDATION.md §4).
  {
    id: 'projects',
    label: 'Projects',
    description: 'Your creative projects with 44 — briefs, files, and progress.',
    href: '/projects',
    iconClass: 'os-icon-services',
    group: 'legacy',
    requiresAuth: true,
    hidden: true,
  },
  {
    id: 'inbox',
    label: 'Messages',
    description: 'Direct messages and project communication.',
    href: '/community/messages',
    iconClass: 'os-icon-inbox',
    group: 'legacy',
    requiresAuth: true,
    hidden: true,
  },
  {
    id: 'library',
    label: 'Library',
    description: 'Legacy aggregate library.',
    href: '/library',
    iconClass: 'os-icon-library',
    group: 'legacy',
    requiresAuth: true,
    hidden: true,
  },
  {
    id: 'shop',
    label: 'Shop',
    description: 'Legacy shop route.',
    href: '/shop',
    iconClass: 'os-icon-shop',
    group: 'legacy',
    hidden: true,
  },
  {
    id: 'store',
    label: 'Store',
    description: 'Legacy store route.',
    href: '/',
    iconClass: 'os-icon-store',
    group: 'legacy',
    hidden: true,
  },
];

export function getOSApp(id: OSAppId): OSApp | undefined {
  return OS_APPS.find(app => app.id === id);
}

/**
 * Which app owns the current route. Every route in the shell maps to
 * exactly one Dock app so the active state is always coherent.
 */
export function getActiveOSAppId(pathname: string): OSAppId | '' {
  if (pathname === '/home' || pathname.startsWith('/home/')) return 'home';
  if (pathname.startsWith('/music')) return 'music';
  if (pathname.startsWith('/books')) return 'books';
  if (pathname.startsWith('/assets')) return 'assets';
  if (pathname.startsWith('/radio')) return 'radio';
  if (pathname.startsWith('/merch') || pathname.startsWith('/shop')) return 'merch';
  if (
    pathname === '/' ||
    pathname.startsWith('/store') ||
    pathname.startsWith('/product') ||
    pathname.startsWith('/browse') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/checkout')
  ) return 'merch';
  if (pathname.startsWith('/services') || pathname.startsWith('/service')) return 'services';
  if (pathname.startsWith('/resources')) return 'resources';
  if (pathname.startsWith('/friends')) return 'community';
  if (pathname.startsWith('/community')) return 'community';
  if (pathname.startsWith('/notifications')) return 'notifications';
  if (pathname.startsWith('/account') || pathname.startsWith('/profile')) return 'account';
  if (pathname.startsWith('/library') || pathname.startsWith('/collection')) return 'music';
  if (pathname.startsWith('/projects')) return 'services';
  if (pathname.startsWith('/inbox')) return 'community';
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/studio')) return 'dashboard';
  if (pathname.startsWith('/settings')) return 'settings';
  return '';
}

/** Apps the Dock can offer to a given user, before Dock preferences apply. */
export function getAvailableDockApps(options: {
  signedIn: boolean;
  isCreator: boolean;
}): OSApp[] {
  return OS_APPS.filter(app => {
    if (app.hidden) return false;
    if (app.requiresAuth && !options.signedIn) return false;
    if (app.requiresCreator && !options.isCreator) return false;
    return true;
  });
}
