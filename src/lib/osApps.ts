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
  | 'search'
  | 'music'
  | 'books'
  | 'assets'
  | 'radio'
  | 'merch'
  | 'shop'
  | 'services'
  | 'resources'
  | 'community'
  | 'profile'
  | 'friends'
  | 'notifications'
  | 'account'
  | 'inbox'
  | 'library'
  | 'store'
  | 'dashboard'
  | 'settings'
  | 'support'
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
    id: 'library',
    label: 'Library',
    description: 'Everything you have added or purchased on 44.',
    href: '/library',
    iconClass: 'os-icon-library',
    group: 'media',
    requiresAuth: true,
  },
  {
    id: 'search',
    label: 'Search',
    description: 'Find items, creators, and posts across 44OS.',
    href: '/search',
    iconClass: 'os-icon-search',
    group: 'media',
    // Search stays a real app (topbar search opens /search); it is just
    // not a Dock destination anymore.
    hidden: true,
  },
  {
    id: 'store',
    label: 'Store',
    description: 'Browse music, books, assets, and merch from creators on 44.',
    href: '/store',
    iconClass: 'os-icon-store',
    group: 'media',
  },
  {
    id: 'music',
    label: 'Music',
    description: 'New releases from creators on 44.',
    href: '/store/music',
    iconClass: 'os-icon-music',
    group: 'legacy',
    hidden: true,
  },
  {
    id: 'books',
    label: 'Books',
    description: 'Digital books and artbooks from creators on 44.',
    href: '/store/books',
    iconClass: 'os-icon-books',
    group: 'legacy',
    hidden: true,
  },
  {
    id: 'assets',
    label: 'Assets',
    description: 'Samples, templates, presets, and creative tools for your work.',
    href: '/store/assets',
    iconClass: 'os-icon-assets',
    group: 'legacy',
    hidden: true,
  },
  {
    id: 'merch',
    label: 'Merch',
    description: 'Physical goods from 44 and creators: apparel, merch, and shipped items.',
    href: '/store/merch',
    iconClass: 'os-icon-merch',
    group: 'legacy',
    hidden: true,
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
    description: 'Posts from creators and the 44 community.',
    href: '/community',
    iconClass: 'os-icon-community',
    group: 'community',
  },
  {
    id: 'inbox',
    label: 'Inbox',
    description: 'Direct messages and project communication.',
    href: '/inbox',
    iconClass: 'os-icon-inbox',
    group: 'legacy',
    requiresAuth: true,
    hidden: true,
  },
  {
    id: 'profile',
    label: 'Profile',
    description: 'Your public creator/member profile.',
    href: '/profile',
    iconClass: 'os-icon-user',
    group: 'legacy',
    requiresAuth: true,
    hidden: true,
  },
  {
    id: 'resources',
    label: 'Resources',
    description: 'Guides, templates, and useful references for creatives.',
    href: '/resources',
    iconClass: 'os-icon-resources',
    group: 'media',
  },
  {
    id: 'services',
    label: 'Services',
    description: 'Professional creative services, produced and delivered through 44.',
    href: '/services',
    iconClass: 'os-icon-services',
    group: 'media',
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
    description: 'Legacy account route. Account controls now live in Settings.',
    href: '/settings?tab=account',
    iconClass: 'os-icon-account',
    group: 'legacy',
    requiresAuth: true,
    hidden: true,
  },
  {
    id: 'support',
    label: 'Support',
    description: 'Help with your account, library, and orders on 44.',
    href: '/support',
    iconClass: 'os-icon-support',
    // Renders in the Dock's bottom cluster, directly above the system divider.
    group: 'account',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Your creator workspace — publish music, books, assets, and track earnings.',
    href: '/dashboard',
    iconClass: 'os-icon-dashboard',
    group: 'studio',
    requiresAuth: true,
    requiresCreator: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'System, Dock, region, and account controls.',
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
    id: 'shop',
    label: 'Shop',
    description: 'Legacy shop route.',
    href: '/store/merch',
    iconClass: 'os-icon-shop',
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
  if (pathname.startsWith('/search')) return 'search';
  if (
    pathname.startsWith('/library') ||
    pathname.startsWith('/collection') ||
    pathname.startsWith('/music/library') ||
    pathname.startsWith('/books/library') ||
    pathname.startsWith('/assets/library')
  ) return 'library';
  if (
    pathname === '/' ||
    pathname.startsWith('/store') ||
    pathname.startsWith('/product') ||
    pathname.startsWith('/browse') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/music') ||
    pathname.startsWith('/books') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/merch') ||
    pathname.startsWith('/shop')
  ) return 'store';
  if (pathname.startsWith('/radio')) return 'radio';
  if (pathname.startsWith('/services') || pathname.startsWith('/service')) return 'services';
  if (pathname.startsWith('/resources')) return 'resources';
  if (pathname.startsWith('/friends')) return 'community';
  if (pathname.startsWith('/community') || pathname.startsWith('/profile') || pathname.startsWith('/inbox')) return 'community';
  if (pathname.startsWith('/notifications')) return 'notifications';
  if (pathname.startsWith('/account')) return 'settings';
  if (pathname.startsWith('/projects')) return 'services';
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/studio')) return 'dashboard';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/support')) return 'support';
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
