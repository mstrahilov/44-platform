/**
 * 44OS App Registry
 *
 * The single source of truth for every app in the 44OS shell. The Dock,
 * Settings Appearance/Dock controls, Home quick-launch, and (later) context menus and the
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
  | 'community'
  | 'calendar'
  | 'profile'
  | 'friends'
  | 'notifications'
  | 'account'
  | 'inbox'
  | 'library'
  | 'store'
  | 'studio'
  | 'admin'
  | 'settings'
  | 'support';

export type OSAppGroup = 'media' | 'community' | 'studio' | 'account' | 'system' | 'legacy';

export type OSAppChild = {
  id: string;
  label: string;
  href: string;
  iconClass?: string;
};

export type OSApp = {
  id: OSAppId;
  label: string;
  description: string;
  href: string;
  iconClass: string;
  children?: OSAppChild[];
  /** Dock cluster: media, community, studio, account, system, or hidden legacy. */
  group: OSAppGroup;
  /** Only rendered for signed-in users. */
  requiresAuth?: boolean;
  /** Only rendered for creator/admin profiles. */
  requiresCreator?: boolean;
  /** Only rendered for administrator profiles. */
  requiresAdmin?: boolean;
  /** Registered but not shipped yet — never rendered. */
  hidden?: boolean;
  /** Cannot be hidden from the Dock via Settings. */
  locked?: boolean;
};

export const OS_APPS: OSApp[] = [
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'Creator events and upcoming releases across 44OS.',
    href: '/calendar',
    iconClass: 'os-icon-calendar',
    group: 'community',
    hidden: true,
  },
  {
    id: 'library',
    label: 'Library',
    description: 'Everything you have saved, added, or purchased.',
    href: '/library',
    iconClass: 'os-icon-library',
    group: 'media',
    requiresAuth: true,
  },
  {
    id: 'search',
    label: 'Search',
    description: 'Find items, creators, posts, questions, and collaborations.',
    href: '/search',
    iconClass: 'os-icon-search',
    group: 'media',
  },
  {
    id: 'store',
    label: 'Store',
    description: 'Find releases, books, sample packs, and merch from independent creators.',
    href: '/',
    iconClass: 'os-icon-store',
    group: 'media',
    children: [
      { id: 'music', label: 'Music', href: '/store/music', iconClass: 'os-icon-music' },
      { id: 'books', label: 'Books', href: '/store/books', iconClass: 'os-icon-books' },
      { id: 'merch', label: 'Merch', href: '/store/merch', iconClass: 'os-icon-merch' },
      { id: 'assets', label: 'Sample Packs', href: '/store/sample-packs', iconClass: 'os-icon-assets' },
    ],
  },
  {
    id: 'music',
    label: 'Music',
    description: 'New releases from independent creators.',
    href: '/store/music',
    iconClass: 'os-icon-music',
    group: 'legacy',
    hidden: true,
  },
  {
    id: 'books',
    label: 'Books',
    description: 'Digital books and artbooks from independent creators.',
    href: '/store/books',
    iconClass: 'os-icon-books',
    group: 'legacy',
    hidden: true,
  },
  {
    id: 'assets',
    label: 'Sample Packs',
    description: 'Downloadable sample packs from independent creators.',
    href: '/store/sample-packs',
    iconClass: 'os-icon-assets',
    group: 'legacy',
    hidden: true,
  },
  {
    id: 'merch',
    label: 'Merch',
    description: 'Physical goods from creators: apparel, merch, and shipped items.',
    href: '/store/merch',
    iconClass: 'os-icon-merch',
    group: 'legacy',
    hidden: true,
  },
  {
    id: 'radio',
    label: 'Radio',
    description: 'Live mixes, creator stations, and listening rooms.',
    href: '/radio',
    iconClass: 'os-icon-radio-classic',
    group: 'media',
  },
  {
    id: 'community',
    label: 'Community',
    description: 'Posts, questions, and collaboration threads from creators and fans.',
    href: '/community',
    iconClass: 'os-icon-community',
    group: 'community',
    children: [
      { id: 'calendar', label: 'Calendar', href: '/calendar', iconClass: 'os-icon-calendar' },
      { id: 'questions', label: 'Questions', href: '/community/questions', iconClass: 'os-icon-questions' },
      { id: 'collaboration', label: 'Collaboration', href: '/community/collaboration', iconClass: 'os-icon-collaboration' },
    ],
  },
  {
    id: 'inbox',
    label: 'Inbox',
    description: 'Direct messages and project communication.',
    href: '/inbox',
    iconClass: 'os-icon-inbox',
    group: 'community',
    requiresAuth: true,
    hidden: true,
  },
  {
    id: 'profile',
    label: 'Profile',
    description: 'Your public creator/member profile.',
    href: '/profile',
    iconClass: 'os-icon-user',
    group: 'account',
    requiresAuth: true,
    hidden: true,
  },
  {
    id: 'friends',
    label: 'Friends',
    description: 'Manage private friendships and requests.',
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
    href: '/settings#account',
    iconClass: 'os-icon-account',
    group: 'legacy',
    requiresAuth: true,
    hidden: true,
  },
  {
    id: 'support',
    label: 'Support',
    description: 'Help with your account, library, orders, and publishing tools.',
    href: '/support',
    iconClass: 'os-icon-support',
    group: 'system',
  },
  {
    id: 'studio',
    label: 'Studio',
    description: 'Your creator workspace for publishing catalog items and tracking earnings.',
    href: '/studio',
    iconClass: 'os-icon-dashboard',
    group: 'studio',
    requiresAuth: true,
    requiresCreator: true,
    children: [
      { id: 'overview', label: 'Overview', href: '/studio', iconClass: 'os-icon-dashboard' },
      { id: 'music', label: 'Music', href: '/studio#music', iconClass: 'os-icon-music' },
      { id: 'books', label: 'Books', href: '/studio#books', iconClass: 'os-icon-books' },
      { id: 'assets', label: 'Sample Packs', href: '/studio#sample-packs', iconClass: 'os-icon-assets' },
      { id: 'merch', label: 'Merch', href: '/studio#merch', iconClass: 'os-icon-merch' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'People, content review, and operational health controls.',
    href: '/admin',
    iconClass: 'os-icon-dashboard',
    group: 'system',
    requiresAuth: true,
    requiresAdmin: true,
    children: [
      { id: 'overview', label: 'Overview', href: '/admin', iconClass: 'os-icon-dashboard' },
      { id: 'people', label: 'People', href: '/admin/people', iconClass: 'os-icon-user' },
      { id: 'content', label: 'Content', href: '/admin/content', iconClass: 'os-icon-store' },
      { id: 'errors', label: 'Errors', href: '/admin/errors', iconClass: 'os-icon-support' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Account, region, appearance, and Dock controls.',
    href: '/settings',
    iconClass: 'os-icon-settings',
    group: 'system',
    requiresAuth: true,
    locked: true,
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

export const DOCK_APP_IDS: OSAppId[] = ['library', 'store', 'radio', 'community', 'admin', 'support', 'settings'];

export function getOSApp(id: OSAppId): OSApp | undefined {
  return OS_APPS.find(app => app.id === id);
}

/**
 * Which app owns the current route. Every route in the shell maps to
 * exactly one Dock app so the active state is always coherent.
 */
export function getActiveOSAppId(pathname: string): OSAppId | '' {
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
    pathname.startsWith('/sample-packs') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/merch') ||
    pathname.startsWith('/shop')
  ) return 'store';
  if (pathname.startsWith('/radio')) return 'radio';
  if (pathname.startsWith('/friends')) return 'community';
  if (pathname.startsWith('/calendar')) return 'community';
  if (pathname.startsWith('/community')) return 'community';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/inbox')) return 'inbox';
  if (pathname.startsWith('/notifications')) return 'notifications';
  if (pathname.startsWith('/account')) return 'settings';
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/studio')) return 'studio';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/support')) return 'support';
  return '';
}

/** Apps the Dock can offer to a given user, before Dock preferences apply. */
export function getAvailableDockApps(options: {
  signedIn: boolean;
  isCreator: boolean;
  isAdmin?: boolean;
}): OSApp[] {
  return OS_APPS.filter(app => {
    if (!DOCK_APP_IDS.includes(app.id)) return false;
    if (app.hidden) return false;
    if (app.requiresAuth && !options.signedIn) return false;
    if (app.requiresCreator && !options.isCreator) return false;
    if (app.requiresAdmin && !options.isAdmin) return false;
    return true;
  }).sort((a, b) => DOCK_APP_IDS.indexOf(a.id) - DOCK_APP_IDS.indexOf(b.id));
}
