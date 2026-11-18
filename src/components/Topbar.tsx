'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import {
  ACHIEVEMENT_NOTIFICATIONS_UPDATED,
  loadAchievementNotifications,
  type AchievementNotification,
} from '@/lib/achievementNotifications';
import { notificationIsEnabled } from '@/lib/notificationPreferences';
import { usePathname, useRouter } from 'next/navigation';
import { useTopbar, type TopbarOverflowAction } from './TopbarContext';
import { useCart } from '@/lib/cart';
import { Ui44TextInput } from '@/components/ui44/Inputs';
import {
  loadNotificationReadState,
  NOTIFICATION_STATE_UPDATED,
  saveNotificationReadState,
} from '@/lib/notificationState';
import { getMobileTopbarState, getMobileTopbarTitle } from '@/lib/osApps';
import { MobileSearchOverlay } from '@/components/MobileSearchOverlay';
import { MobileToolbar } from '@/components/MobileToolbar';
import {
  deliverNewDesktopNotifications,
  primeDesktopNotificationRows,
} from '@/lib/deviceNotifications';

export type { TopbarTab } from './TopbarContext';

const IconBell = () => <span className="os-icon os-icon-notifications os-icon-sm" aria-hidden="true" />;
const IconCart = () => (
  <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 4h2.4l2.2 10.2a1.6 1.6 0 0 0 1.6 1.3h7.2a1.6 1.6 0 0 0 1.6-1.2L19.5 7H6.2" />
    <circle cx="9.2" cy="18.4" r="1.2" />
    <circle cx="16.8" cy="18.4" r="1.2" />
  </svg>
);

const IconCalendar = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17" />
  </svg>
);

const IconPlus = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconCompose = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13 5H5.5A2.5 2.5 0 0 0 3 7.5v11A2.5 2.5 0 0 0 5.5 21h11a2.5 2.5 0 0 0 2.5-2.5V11" />
    <path d="m10 14 1-4 8.8-8.8a1.8 1.8 0 0 1 2.5 2.5L13.5 12.5 10 14Z" />
  </svg>
);

const IconMore = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="19" cy="12" r="1.7" />
  </svg>
);

const IconSort = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 3v16m0 0-4-4m4 4 4-4M15 19V3m0 0 4 4m-4-4-4 4" />
  </svg>
);

const IconClose = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const IconCheck = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.2 4.2L19 7" />
  </svg>
);

const CURRENT_PATH_KEY = '44-current-path';
const PREVIOUS_PATH_KEY = '44-previous-path';
const SCROLL_PREFIX = '44-scroll:';
type NotificationState = {
  userId: string;
  rows: AchievementNotification[];
};

function labelForPath(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith('/library')) return 'Library';
  if (path.startsWith('/browse') || path.startsWith('/store') || path.startsWith('/product') || path.startsWith('/cart')) return 'Browse';
  if (path.startsWith('/community')) return 'Community';
  if (path.startsWith('/orders')) return 'Orders';
  if (path.startsWith('/studio') || path.startsWith('/dashboard')) return 'Studio';
  if (path.startsWith('/profile')) return 'Profile';
  if (path.startsWith('/music')) return 'Music';
  if (path.startsWith('/books')) return 'Books';
  if (path.startsWith('/sample-packs') || path.startsWith('/assets')) return 'Sample Packs';
  if (path.startsWith('/merch') || path.startsWith('/shop')) return 'Merch';
  if (path === '/') return 'Browse';
  return null;
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { tabs, back, overflowActions, toolbarTitle, mobileTrailingAction: registeredMobileTrailingAction } = useTopbar();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const { count: cartCount } = useCart();
  const [notificationState, setNotificationState] = useState<NotificationState | null>(null);
  const [notificationLoadError, setNotificationLoadError] = useState(false);
  const [notificationLoadAttempt, setNotificationLoadAttempt] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [hiddenNotificationIds, setHiddenNotificationIds] = useState<Set<string>>(new Set());
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [librarySortActive, setLibrarySortActive] = useState(false);
  const [notificationFilterActive, setNotificationFilterActive] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  const [searchKey, setSearchKey] = useState(() => (
    typeof window === 'undefined' ? '' : window.location.search.replace(/^\?/, '')
  ));
  const notifWrapRef = useRef<HTMLDivElement | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateSearchKey = () => setSearchKey(window.location.search.replace(/^\?/, ''));
    updateSearchKey();
    window.addEventListener('popstate', updateSearchKey);
    return () => window.removeEventListener('popstate', updateSearchKey);
  }, [pathname]);

  useEffect(() => {
    function updateLibrarySort(event: Event) {
      setLibrarySortActive(Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active));
    }
    window.addEventListener('44:library-sort-state', updateLibrarySort);
    return () => window.removeEventListener('44:library-sort-state', updateLibrarySort);
  }, []);

  useEffect(() => {
    function updateNotificationsFilter(event: Event) {
      setNotificationFilterActive(Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active));
    }
    window.addEventListener('44:notifications-filter-state', updateNotificationsFilter);
    return () => window.removeEventListener('44:notifications-filter-state', updateNotificationsFilter);
  }, []);

  useEffect(() => {
    if (!userId) {
      Promise.resolve().then(() => {
        setSeenIds(new Set());
        setHiddenNotificationIds(new Set());
      });
      return;
    }
    let alive = true;
    const activeUserId = userId;

    async function refreshReadState() {
      try {
        const state = await loadNotificationReadState(activeUserId);
        if (!alive) return;
        setSeenIds(state.seenIds);
        setHiddenNotificationIds(state.hiddenIds);
      } catch {
        // Keep the current badge state visible; the Notifications page offers
        // an explicit error when the cross-device read state cannot load.
      }
    }

    void refreshReadState();
    window.addEventListener(NOTIFICATION_STATE_UPDATED, refreshReadState);
    return () => {
      alive = false;
      window.removeEventListener(NOTIFICATION_STATE_UPDATED, refreshReadState);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const activeUserId = userId;
    loadAchievementNotifications(activeUserId).then(rows => {
      if (alive) {
        const visibleRows = rows.slice(0, 24);
        primeDesktopNotificationRows(activeUserId, visibleRows);
        setNotificationState({ userId: activeUserId, rows: visibleRows });
        setNotificationLoadError(false);
      }
    }).catch(() => { if (alive) setNotificationLoadError(true); });
    return () => { alive = false; };
  }, [notificationLoadAttempt, userId]);

  useEffect(() => {
    if (!userId) return;
    const activeUserId = userId;

    async function refreshNotifications() {
      try {
        const rows = await loadAchievementNotifications(activeUserId);
        const visibleRows = rows.slice(0, 24);
        void deliverNewDesktopNotifications(activeUserId, visibleRows);
        setNotificationState({ userId: activeUserId, rows: visibleRows });
        setNotificationLoadError(false);
      } catch {
        setNotificationLoadError(true);
      }
    }

    function onAchievementUpdate() {
      refreshNotifications();
    }

    window.addEventListener(ACHIEVEMENT_NOTIFICATIONS_UPDATED, onAchievementUpdate);
    const channel = supabase
      .channel(`topbar-notifications:${activeUserId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'achievement_events', filter: `user_id=eq.${activeUserId}`,
      }, onAchievementUpdate)
      .subscribe();
    return () => {
      window.removeEventListener(ACHIEVEMENT_NOTIFICATIONS_UPDATED, onAchievementUpdate);
      void supabase.removeChannel(channel);
    };
  }, [notificationLoadAttempt, userId]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setNotifMenuOpen(false);
      setSearchOpen(false);
      setMobileSearchOpen(false);
      if (pathname !== '/search') {
        setSearchDraft('');
        const mobileSearchInput = document.querySelector<HTMLInputElement>('.os-topbar-search-mobile-input');
        if (mobileSearchInput && mobileSearchInput === document.activeElement) mobileSearchInput.blur();
      }
    });
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathWithQuery = searchKey ? `${pathname}?${searchKey}` : pathname;
    const current = window.sessionStorage.getItem(CURRENT_PATH_KEY);
    let nextPreviousPath: string | null;
    if (current && current !== pathWithQuery) {
      window.sessionStorage.setItem(PREVIOUS_PATH_KEY, current);
      nextPreviousPath = current;
    } else {
      nextPreviousPath = window.sessionStorage.getItem(PREVIOUS_PATH_KEY);
    }
    window.sessionStorage.setItem(CURRENT_PATH_KEY, pathWithQuery);
    const frame = window.requestAnimationFrame(() => setPreviousPath(nextPreviousPath));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, searchKey]);

  useEffect(() => {
    if (pathname !== '/search' && !pathname.startsWith('/library')) return;
    const query = pathname === '/search' || pathname === '/library/search' ? new URLSearchParams(searchKey).get('q') ?? '' : '';
    Promise.resolve().then(() => setSearchDraft(query));
  }, [pathname, searchKey]);

  useEffect(() => {
    if (pathname !== '/search' || typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 768px)').matches) return;

    const query = searchDraft.trim();
    const currentQuery = new URLSearchParams(searchKey).get('q')?.trim() ?? '';
    if (query === currentQuery) return;

    const timer = window.setTimeout(() => {
      const nextSearchKey = query ? `q=${encodeURIComponent(query)}` : '';
      setSearchKey(nextSearchKey);
      router.replace(query ? `/search?${nextSearchKey}` : '/search', { scroll: false });
    }, 240);

    return () => window.clearTimeout(timer);
  }, [pathname, router, searchDraft, searchKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathWithQuery = searchKey ? `${pathname}?${searchKey}` : pathname;
    const storageKey = `${SCROLL_PREFIX}${pathWithQuery}`;
    const scrollerElement = document.querySelector<HTMLElement>('.app-main-content');
    if (!scrollerElement) return;
    const scroller: HTMLElement = scrollerElement;

    const saved = window.sessionStorage.getItem(storageKey);
    const target = saved === null ? 0 : Number(saved);
    let restoreFrame = 0;
    let saveFrame = 0;
    let restoring = Number.isFinite(target) && target > 0;
    const restoreDeadline = window.performance.now() + 3_000;

    // Store lists load asynchronously. Retry until their content is tall enough
    // to accept the saved offset, while yielding immediately if the user starts
    // interacting with the returned page.
    function restoreScroll() {
      if (!restoring) return;
      scroller.scrollTo({ top: target, left: 0, behavior: 'auto' });
      if (Math.abs(scroller.scrollTop - target) <= 1 || window.performance.now() >= restoreDeadline) {
        restoring = false;
        return;
      }
      restoreFrame = window.requestAnimationFrame(restoreScroll);
    }

    function cancelRestore() {
      restoring = false;
      window.cancelAnimationFrame(restoreFrame);
    }

    function persistScroll() {
      window.sessionStorage.setItem(storageKey, String(scroller.scrollTop));
    }

    function schedulePersist() {
      if (restoring) return;
      window.cancelAnimationFrame(saveFrame);
      saveFrame = window.requestAnimationFrame(persistScroll);
    }

    // Capture the position before a link/button can start a route transition.
    // Next may reset the shared scroller before this effect's cleanup runs.
    function handleInteraction() {
      cancelRestore();
      persistScroll();
    }

    if (restoring) restoreFrame = window.requestAnimationFrame(restoreScroll);
    else scroller.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    scroller.addEventListener('scroll', schedulePersist, { passive: true });
    scroller.addEventListener('pointerdown', handleInteraction, { passive: true });
    scroller.addEventListener('touchstart', handleInteraction, { passive: true });
    scroller.addEventListener('wheel', handleInteraction, { passive: true });
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('pagehide', persistScroll);
    return () => {
      cancelRestore();
      window.cancelAnimationFrame(saveFrame);
      scroller.removeEventListener('scroll', schedulePersist);
      scroller.removeEventListener('pointerdown', handleInteraction);
      scroller.removeEventListener('touchstart', handleInteraction);
      scroller.removeEventListener('wheel', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('pagehide', persistScroll);
    };
  }, [pathname, searchKey]);

  function openNotifMenu() {
    setNotifMenuOpen(value => !value);
  }

  useEffect(() => {
    if (!notifMenuOpen && !searchOpen) return;
    function onClick(e: MouseEvent) {
      if (notifMenuOpen && notifWrapRef.current && !notifWrapRef.current.contains(e.target as Node)) setNotifMenuOpen(false);
      if (searchOpen && searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const returnTarget = notifMenuOpen ? notifWrapRef.current : searchWrapRef.current;
      setNotifMenuOpen(false);
      setSearchOpen(false);
      window.requestAnimationFrame(() => returnTarget?.querySelector<HTMLElement>('button, a')?.focus());
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [notifMenuOpen, searchOpen]);

  const notifications = notificationState && notificationState.userId === userId ? notificationState.rows : [];
  const visibleNotifications = notifications.filter(notification => (
    notificationIsEnabled(notification) &&
    !hiddenNotificationIds.has(notification.id)
  ));
  const unreadNotificationCount = visibleNotifications.filter(n => !seenIds.has(n.id)).length;
  const backLabel = labelForPath(previousPath?.split('?')[0]) ?? back?.label ?? 'Back';
  const mobileTopbarState = getMobileTopbarState(pathname);
  const isNewCommunityPost = pathname === '/community/new';
  const isNewPlaylist = pathname === '/library/playlists/new';
  const isPlaylistTrackPicker = /^\/library\/playlists\/[^/]+\/add$/.test(pathname);
  const playlistTrackPickerHref = back?.href ?? '/library';
  const mobileTopbarTitle = toolbarTitle ?? (isNewCommunityPost ? 'New Post' : isNewPlaylist ? 'New Playlist' : isPlaylistTrackPicker ? 'Add Track' : getMobileTopbarTitle(pathname));
  const isCommunityRoot = pathname === '/community';
  const isAccountRoot = pathname === '/you';
  const isNotificationsPage = pathname === '/notifications';
  const isInboxRoot = pathname === '/inbox';
  const isStudioRoot = pathname === '/studio';
  const isRadioRoot = pathname === '/radio';
  const isLibraryRoot = pathname === '/library' || (pathname.startsWith('/library/') && !pathname.startsWith('/library/item/') && !pathname.startsWith('/library/playlists/') && !pathname.startsWith('/library/music/') && pathname !== '/library/search');
  const isPlaylistLibrary = pathname === '/library/playlists';
  const isDiscoverSurface = pathname === '/' || (pathname.startsWith('/store') && !pathname.startsWith('/store/item/'));
  const isDetailRoute = mobileTopbarState.mode === 'back' || Boolean(back);
  const hasSectionTabs = Boolean(tabs?.some(tab => tab.variant === 'section'));

  const mobileBackAction = isDetailRoute ? (
    <button
      type="button"
      className="ui44-symbol-button ui44-symbol-button-back os-topbar-back"
      aria-label={backLabel}
      title={backLabel}
      onClick={() => {
        if (back?.alwaysNavigate) {
          router.push(back.href);
          return;
        }
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(back?.href ?? (mobileTopbarState.mode === 'back' ? mobileTopbarState.fallbackHref : '/'));
      }}
    >
      <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M13 5l-6 6 6 6" />
      </svg>
    </button>
  ) : null;

  function hideNotification(id: string) {
    const next = new Set(hiddenNotificationIds);
    next.add(id);
    setHiddenNotificationIds(next);
    if (userId) void saveNotificationReadState(userId, { seenIds, hiddenIds: next }).catch(() => {});
  }

  function clearNotifications() {
    const next = new Set(hiddenNotificationIds);
    visibleNotifications.forEach(notification => next.add(notification.id));
    setHiddenNotificationIds(next);
    if (userId) void saveNotificationReadState(userId, { seenIds, hiddenIds: next }).catch(() => {});
  }

  function markNotificationRead(id: string) {
    const wasSeen = seenIds.has(id);
    const next = new Set(seenIds);
    next.add(id);
    setSeenIds(next);
    if (userId) void saveNotificationReadState(userId, { seenIds: next, hiddenIds: hiddenNotificationIds }).catch(() => {
      if (wasSeen) return;
      setSeenIds(current => { const reverted = new Set(current); reverted.delete(id); return reverted; });
    });
  }

  function markAllNotificationsRead() {
    const next = new Set(seenIds);
    visibleNotifications.forEach(notification => next.add(notification.id));
    setSeenIds(next);
    if (userId) void saveNotificationReadState(userId, { seenIds: next, hiddenIds: hiddenNotificationIds }).catch(() => {
      setSeenIds(seenIds);
    });
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchDraft.trim();
    setSearchKey(query ? `q=${encodeURIComponent(query)}` : '');
    const librarySearch = pathname.startsWith('/library');
    router.push(query ? `${librarySearch ? '/library/search' : '/search'}?q=${encodeURIComponent(query)}` : librarySearch ? '/library/search' : '/search');
  }

  const closeMobileSearch = useCallback(() => {
    setMobileSearchOpen(false);
  }, []);

  const openMobileSearch = useCallback(() => {
    setMobileSearchOpen(true);
    setNotifMenuOpen(false);
  }, []);

  const submitMobileSearch = useCallback((value: string, href?: string) => {
    const query = value.trim();
    setMobileSearchOpen(false);
    const librarySearch = pathname.startsWith('/library');
    if (href && !librarySearch) {
      router.push(href);
      return;
    }
    setSearchKey(query ? `q=${encodeURIComponent(query)}` : '');
    router.push(query ? `${librarySearch ? '/library/search' : '/search'}?q=${encodeURIComponent(query)}` : librarySearch ? '/library/search' : '/search');
  }, [pathname, router]);

  const mobileSearchAction = isLibraryRoot ? (
    <button type="button" className="ui44-symbol-button ui44-symbol-button-search os-topbar-icon-button" aria-label="Search Library" aria-expanded={mobileSearchOpen} onClick={openMobileSearch}>
      <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
    </button>
  ) : isDiscoverSurface ? (
    <button
      type="button"
      className="ui44-symbol-button ui44-symbol-button-search os-topbar-icon-button"
      aria-label="Search"
      aria-expanded={mobileSearchOpen}
      onClick={openMobileSearch}
    >
      <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
    </button>
  ) : null;

  const mobileLeadingAction = isNewCommunityPost ? (
    <button type="button" className="ui44-symbol-button" aria-label="Cancel new post" title="Cancel" onClick={() => router.push('/community')}>
      <IconClose />
    </button>
  ) : isNewPlaylist ? (
    <button type="button" className="ui44-symbol-button" aria-label="Cancel new playlist" title="Cancel" onClick={() => router.push('/library/playlists')}>
      <IconClose />
    </button>
  ) : isPlaylistTrackPicker ? (
    <button type="button" className="ui44-symbol-button" aria-label="Close Add Track" title="Close" onClick={() => router.push(playlistTrackPickerHref)}>
      <IconClose />
    </button>
  ) : isDetailRoute ? mobileBackAction : isCommunityRoot ? (
    <Link href="/calendar" className="ui44-symbol-button" aria-label="Calendar" title="Calendar">
      <IconCalendar />
    </Link>
  ) : isAccountRoot ? (
    <Link href="/notifications" className="ui44-symbol-button" aria-label={unreadNotificationCount > 0 ? `Notifications, ${unreadNotificationCount} unread` : 'Notifications'} title="Notifications">
      <span className="os-topbar-icon-wrapper">
        <IconBell />
        {unreadNotificationCount > 0 && <span className="os-topbar-notification-dot" aria-hidden="true" />}
      </span>
    </Link>
  ) : isRadioRoot ? (
    <Link href="/calendar" className="ui44-symbol-button" aria-label="Radio Schedule" title="Radio Schedule">
      <IconCalendar />
    </Link>
  ) : isLibraryRoot ? (
    <button type="button" className="ui44-symbol-button" aria-label="Search Library" title="Search Library" onClick={openMobileSearch}>
      <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
    </button>
  ) : mobileSearchAction;

  const mobileTrailingAction = registeredMobileTrailingAction ?? (isNewCommunityPost ? (
    <button type="button" className="ui44-symbol-button" aria-label="Post" title="Post" onClick={() => window.dispatchEvent(new CustomEvent('community:new-post-submit'))}>
      <IconCheck />
    </button>
  ) : isNewPlaylist ? (
    <button type="button" className="ui44-symbol-button" aria-label="Save playlist" title="Save playlist" onClick={() => window.dispatchEvent(new CustomEvent('playlist:create-submit'))}>
      <IconCheck />
    </button>
  ) : isPlaylistTrackPicker ? (
    <button type="button" className="ui44-symbol-button" aria-label="Done adding tracks" title="Done" onClick={() => router.push(playlistTrackPickerHref)}>
      <IconCheck />
    </button>
  ) : isNotificationsPage ? (
    <button type="button" data-filter-popover-trigger="true" aria-pressed={notificationFilterActive} className={`ui44-symbol-button ui44-symbol-button-filter page-filter-button${notificationFilterActive ? ' ui44-symbol-button-active page-filter-button-active' : ''}`} aria-label="Filter Notifications" title="Filter Notifications" onClick={() => window.dispatchEvent(new CustomEvent('44:toggle-filter-popover', { detail: { label: 'Filter Notifications' } }))}>
      <span className="page-filter-icon" aria-hidden="true"><i /><i /><i /></span>
    </button>
  ) : isCommunityRoot ? (
    <Link href="/community/new" className="ui44-symbol-button" aria-label="New Post" title="New Post">
      <IconPlus />
    </Link>
  ) : isInboxRoot ? (
    <button type="button" className="ui44-symbol-button" aria-label="New Message" title="New Message" onClick={() => router.push('/conversation/new')}>
      <IconCompose />
    </button>
  ) : isStudioRoot ? (
    <button type="button" className="ui44-symbol-button" aria-label="Add Studio content" title="Add Studio content" aria-haspopup="menu" aria-expanded={overflowOpen} disabled={!overflowActions?.length} onClick={() => setOverflowOpen(open => !open)}>
      <IconPlus />
    </button>
  ) : isAccountRoot ? (
    <Link href="/settings" className="ui44-symbol-button" aria-label="Settings" title="Settings">
      <span className="os-icon os-icon-settings os-icon-sm" aria-hidden="true" />
    </Link>
  ) : isLibraryRoot ? (
    isPlaylistLibrary ? <Link href="/library/playlists/new" className="ui44-symbol-button" aria-label="Create Playlist" title="Create Playlist"><IconPlus /></Link>
      : <button type="button" data-filter-popover-trigger="true" aria-pressed={librarySortActive} className={`ui44-symbol-button${librarySortActive ? ' ui44-symbol-button-active' : ''}`} aria-label="Sort Library" title="Sort Library" onClick={() => window.dispatchEvent(new CustomEvent('44:toggle-filter-popover', { detail: { label: 'Sort Library' } }))}><IconSort /></button>
  ) : isRadioRoot ? (
    <button type="button" className="ui44-symbol-button" aria-label="More Radio actions" title="More Radio actions" aria-expanded={overflowOpen} onClick={() => setOverflowOpen(open => !open)}>
      <IconMore />
    </button>
  ) : isDetailRoute && overflowActions?.length ? (
    <button type="button" className="ui44-symbol-button" aria-label="More actions" title="More actions" aria-expanded={overflowOpen} onClick={() => setOverflowOpen(open => !open)}>
      <IconMore />
    </button>
  ) : null);

  return (
    <>
      <div className={`os-topbar os-topbar-mode-${mobileTopbarState.mode}${hasSectionTabs ? ' os-topbar-has-section-tabs' : ''}`}>
        <div className="os-topbar-left">
          <Link href="/" className="os-mobile-logo os-mobile-brand-logo" aria-label="44OS Home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/44-topbar-logo.png" alt="" />
          </Link>
        {back && (
          <button
            type="button"
            className="ui44-symbol-button ui44-symbol-button-back os-topbar-back"
            aria-label={isPlaylistTrackPicker ? 'Close Add Track' : backLabel}
            title={isPlaylistTrackPicker ? 'Close' : backLabel}
            onClick={() => {
              if (isPlaylistTrackPicker) {
                router.push(playlistTrackPickerHref);
                return;
              }
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
                return;
              }
              router.push(back.href);
            }}
          >
            {isPlaylistTrackPicker ? <IconClose /> : <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 5l-6 6 6 6"/>
            </svg>}
          </button>
        )}
        {!back && (mobileTopbarState.mode === 'back' || mobileTopbarState.mode === 'search-back') && (
          <button
            type="button"
            className="ui44-symbol-button ui44-symbol-button-back os-topbar-back os-topbar-back-mobile-only"
            aria-label={backLabel}
            title={backLabel}
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
                return;
              }
              router.push(mobileTopbarState.fallbackHref);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 5l-6 6 6 6"/>
            </svg>
          </button>
        )}
        {tabs?.map((tab, index) => {
          const className = [
            'os-topbar-tab',
            tab.variant === 'section' ? 'os-topbar-tab-section' : '',
            tab.variant === 'section' && index === 0 ? 'os-topbar-tab-section-first' : '',
            tab.active ? 'os-topbar-tab-active' : '',
          ].filter(Boolean).join(' ');
          return tab.href ? (
            <Link key={tab.id} href={tab.href} className={className} scroll={false}>{tab.label}</Link>
          ) : (
            <button key={tab.id} type="button" className={className} onClick={tab.onClick}>{tab.label}</button>
          );
        })}
        </div>

        <MobileToolbar
          title={mobileTopbarTitle}
          hideTitle={isAccountRoot}
          leading={mobileLeadingAction}
          trailing={<div className="os-mobile-toolbar-overflow">
            {mobileTrailingAction}
            {overflowOpen && overflowActions?.length ? <div className="ui44-paper-menu os-mobile-toolbar-menu" role="menu">{overflowActions.map((action: TopbarOverflowAction) => <button key={action.id} className={`ui44-paper-menu-item${action.danger ? ' os-topbar-overflow-danger' : ''}`} type="button" role="menuitem" disabled={action.disabled} onClick={() => { setOverflowOpen(false); action.onSelect?.(); }}>{action.label}</button>)}</div> : null}
          </div>}
        />

        <div className="os-topbar-right">
        {isPlaylistTrackPicker && (
          <button type="button" className="ui44-symbol-button os-topbar-icon-button" aria-label="Done adding tracks" title="Done" onClick={() => router.push(playlistTrackPickerHref)}>
            <IconCheck />
          </button>
        )}
        <div className="os-topbar-search os-topbar-search-desktop" ref={searchWrapRef}>
          {searchOpen ? (
            <form className="os-topbar-search-form ui44-composed-field ui44-composed-field-search" role="search" onSubmit={submitSearch}>
              <span className="os-topbar-search-icon os-icon os-icon-search os-icon-sm" aria-hidden="true" />
              <Ui44TextInput
                surface="bare"
                autoFocus
                className="os-topbar-search-input"
                value={searchDraft}
                onChange={event => setSearchDraft(event.target.value)}
                placeholder={pathname.startsWith('/library') ? 'Search Library' : 'Search'}
                aria-label={pathname.startsWith('/library') ? 'Search Library' : 'Search'}
              />
              {searchDraft && <button type="button" className="os-topbar-search-clear" aria-label="Clear search" onClick={() => setSearchDraft('')}>×</button>}
            </form>
          ) : (
            <button type="button" className="ui44-symbol-button ui44-symbol-button-search os-topbar-icon-button" aria-label={pathname.startsWith('/library') ? 'Search Library' : 'Search'} onClick={() => {
              setSearchOpen(true);
              setNotifMenuOpen(false);
            }}>
              <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
            </button>
          )}
        </div>
        {isLibraryRoot ? isPlaylistLibrary
          ? <Link href="/library/playlists/new" className="ui44-symbol-button os-topbar-icon-button" aria-label="Create Playlist" title="Create Playlist"><IconPlus /></Link>
          : <button type="button" data-filter-popover-trigger="true" aria-pressed={librarySortActive} className={`ui44-symbol-button os-topbar-icon-button${librarySortActive ? ' ui44-symbol-button-active' : ''}`} aria-label="Sort Library" title="Sort Library" onClick={() => window.dispatchEvent(new CustomEvent('44:toggle-filter-popover', { detail: { label: 'Sort Library' } }))}><IconSort /></button>
          : null}
        {isNotificationsPage ? <button type="button" data-filter-popover-trigger="true" aria-pressed={notificationFilterActive} className={`ui44-symbol-button os-topbar-icon-button ui44-symbol-button-filter${notificationFilterActive ? ' ui44-symbol-button-active' : ''}`} aria-label="Filter Notifications" title="Filter Notifications" onClick={() => window.dispatchEvent(new CustomEvent('44:toggle-filter-popover', { detail: { label: 'Filter Notifications' } }))}><span className="page-filter-icon" aria-hidden="true"><i /><i /><i /></span></button> : null}
        {mobileTopbarState.mode === 'search-back' && <form
          className="os-topbar-search-mobile"
          role="search"
          onSubmit={submitSearch}
        >
          <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
          <Ui44TextInput
            surface="bare"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            className="os-topbar-search-mobile-input"
            value={searchDraft}
            onFocus={() => {
              if (pathname !== '/search') router.push('/search');
            }}
            onChange={event => {
              const value = event.target.value;
              const query = value.trim();
              setSearchDraft(value);
              if (pathname !== '/search' && query) {
                const nextSearchKey = `q=${encodeURIComponent(query)}`;
                setSearchKey(nextSearchKey);
                router.push(`/search?${nextSearchKey}`);
              }
            }}
            placeholder="Search"
            aria-label="Search 44OS"
          />
          {searchDraft && (
            <button
              type="button"
              className="os-topbar-search-clear"
              aria-label="Clear search"
              onClick={() => setSearchDraft('')}
            >
              ×
            </button>
          )}
        </form>}

        {user && (
          <div ref={notifWrapRef} className="os-topbar-notification-menu">
            <button
              type="button"
              className={notifMenuOpen ? 'ui44-symbol-button ui44-symbol-button-notifications os-topbar-icon-button os-topbar-icon-button-active' : 'ui44-symbol-button ui44-symbol-button-notifications os-topbar-icon-button'}
              aria-label={unreadNotificationCount > 0 ? `Notifications, ${unreadNotificationCount} unread` : 'Notifications'}
              aria-expanded={notifMenuOpen}
              onClick={openNotifMenu}
            >
              <span className="os-topbar-icon-wrapper">
                <IconBell />
                {unreadNotificationCount > 0 && (
                  <span className="os-topbar-notification-count" aria-hidden="true">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </span>
            </button>
            {notifMenuOpen && (
              <div className="ui44-paper-menu os-popover os-popover-wide" role="dialog" aria-label="Notifications">
                <div className="os-popover-header">
                  <span className="os-popover-heading">Notifications</span>
                  {visibleNotifications.some(item => !seenIds.has(item.id)) && (
                    <button type="button" className="os-popover-text-button" onClick={markAllNotificationsRead}>
                      Mark shown read
                    </button>
                  )}
                  {visibleNotifications.length > 0 && (
                    <button type="button" className="os-popover-text-button" onClick={clearNotifications}>
                      Clear All
                    </button>
                  )}
                </div>
                {notificationLoadError ? (
                  <div className="os-notification-empty" role="alert">Notifications could not be loaded. <button type="button" className="os-popover-text-button" onClick={() => setNotificationLoadAttempt(value => value + 1)}>Try again</button></div>
                ) : visibleNotifications.length === 0 ? (
                  <div className="os-notification-empty">You&rsquo;re all caught up.</div>
                ) : (
                  <div className="os-notification-list">
                    {visibleNotifications.map(item => (
                      <div key={item.id} className="os-notification-row">
                        <Link href={item.href || '/notifications'} className="os-notification-item" onClick={() => markNotificationRead(item.id)}>
                          <div className="os-notification-title">{item.title}</div>
                          {item.description && <div className="os-notification-body">{item.description}</div>}
                        </Link>
                        <button
                          type="button"
                          className="os-notification-remove"
                          aria-label={`Remove ${item.title}`}
                          onClick={() => hideNotification(item.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/notifications" className="ui44-paper-menu-item os-popover-footer-link">
                  View all notifications
                </Link>
              </div>
            )}
          </div>
        )}

        {cartCount > 0 && (
          <Link href="/cart" className="ui44-symbol-button ui44-symbol-button-cart os-topbar-icon-button os-topbar-cart-button" aria-label={`Cart · ${cartCount} item${cartCount === 1 ? '' : 's'}`}>
            <IconCart />
            <span className="os-topbar-cart-count">{cartCount}</span>
          </Link>
        )}

        </div>
      </div>
      <MobileSearchOverlay
        open={mobileSearchOpen}
        value={searchDraft}
        onValueChange={setSearchDraft}
        onClose={closeMobileSearch}
        onSubmit={submitMobileSearch}
        libraryScope={pathname.startsWith('/library')}
      />
    </>
  );
}
