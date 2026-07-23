'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import {
  ACHIEVEMENT_NOTIFICATIONS_UPDATED,
  loadAchievementNotifications,
  type AchievementNotification,
} from '@/lib/achievementNotifications';
import { notificationIsEnabled } from '@/lib/notificationPreferences';
import { usePathname, useRouter } from 'next/navigation';
import { useTopbar } from './TopbarContext';
import { useCart } from '@/lib/cart';
import { Ui44TextInput } from '@/components/ui44/Inputs';
import { PUBLIC_PURCHASES_AVAILABLE } from '@/lib/commerceAvailability';
import {
  loadNotificationReadState,
  NOTIFICATION_STATE_UPDATED,
  saveNotificationReadState,
} from '@/lib/notificationState';
import { hasCustomerOrders } from '@/lib/domain/customerCommerce';
import { fetchMyTeamAccess } from '@/lib/domain/team';
import { getMobileTopbarState } from '@/lib/osApps';
import { MobileSearchOverlay } from '@/components/MobileSearchOverlay';

export type { TopbarTab } from './TopbarContext';

const IconBell = () => <span className="os-icon os-icon-notifications os-icon-sm" aria-hidden="true" />;
const IconUser = () => <span className="os-icon os-icon-user os-icon-sm" aria-hidden="true" />;

const IconCart = () => (
  <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 4h2.4l2.2 10.2a1.6 1.6 0 0 0 1.6 1.3h7.2a1.6 1.6 0 0 0 1.6-1.2L19.5 7H6.2" />
    <circle cx="9.2" cy="18.4" r="1.2" />
    <circle cx="16.8" cy="18.4" r="1.2" />
  </svg>
);

const IconProfile = () => <span className="os-icon os-icon-user os-icon-sm" aria-hidden="true" />;
const IconMessages = () => <span className="os-icon os-icon-inbox os-icon-sm" aria-hidden="true" />;
const IconOrders = () => <span className="os-icon os-icon-orders os-icon-sm" aria-hidden="true" />;
const IconStudio = () => <span className="os-icon os-icon-studio-disc os-icon-sm" aria-hidden="true" />;
const IconTeam = () => <span className="os-icon os-icon-friends os-icon-sm" aria-hidden="true" />;

const IconSignOut = () => (
  <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/>
    <path d="M14 15l4-4-4-4"/>
    <line x1="18" y1="11" x2="8" y2="11"/>
  </svg>
);

const CURRENT_PATH_KEY = '44-current-path';
const PREVIOUS_PATH_KEY = '44-previous-path';
const SCROLL_PREFIX = '44-scroll:';
type ProfileState = {
  userId: string;
  profile: StudioProfile | null;
};

type NotificationState = {
  userId: string;
  rows: AchievementNotification[];
};

type OrderVisibilityState = {
  userId: string;
  hasOrders: boolean;
};
type TeamVisibilityState = { userId: string; authorized: boolean };

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
  const { tabs, back } = useTopbar();
  const { count: cartCount } = useCart();
  const [profileState, setProfileState] = useState<ProfileState | null>(null);
  const [notificationState, setNotificationState] = useState<NotificationState | null>(null);
  const [orderVisibilityState, setOrderVisibilityState] = useState<OrderVisibilityState | null>(null);
  const [teamVisibilityState, setTeamVisibilityState] = useState<TeamVisibilityState | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [hiddenNotificationIds, setHiddenNotificationIds] = useState<Set<string>>(new Set());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  const [searchKey, setSearchKey] = useState(() => (
    typeof window === 'undefined' ? '' : window.location.search.replace(/^\?/, '')
  ));
  const userWrapRef = useRef<HTMLDivElement | null>(null);
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
    if (!userId) return;
    let alive = true;
    const activeUserId = userId;
    loadStudioProfile(activeUserId).then(r => {
      if (alive) setProfileState({ userId: activeUserId, profile: r.profile });
    });
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      Promise.resolve().then(() => setOrderVisibilityState(null));
      return;
    }
    let alive = true;
    const activeUserId = userId;
    void hasCustomerOrders(activeUserId)
      .then(hasOrders => {
        if (alive) setOrderVisibilityState({ userId: activeUserId, hasOrders });
      })
      .catch(() => {
        if (alive) setOrderVisibilityState({ userId: activeUserId, hasOrders: false });
      });
    return () => { alive = false; };
  }, [pathname, userId]);

  useEffect(() => {
    if (!userId) {
      Promise.resolve().then(() => setTeamVisibilityState(null));
      return;
    }
    let alive = true;
    const activeUserId = userId;
    void fetchMyTeamAccess().then(access => {
      if (alive) setTeamVisibilityState({ userId: activeUserId, authorized: access.authorized });
    }).catch(() => {
      if (alive) setTeamVisibilityState({ userId: activeUserId, authorized: false });
    });
    return () => { alive = false; };
  }, [pathname, userId]);

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
      const state = await loadNotificationReadState(activeUserId);
      if (!alive) return;
      setSeenIds(state.seenIds);
      setHiddenNotificationIds(state.hiddenIds);
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
      if (alive) setNotificationState({ userId: activeUserId, rows: rows.slice(0, 24) });
    });
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const activeUserId = userId;

    async function refreshNotifications() {
      const rows = await loadAchievementNotifications(activeUserId);
      setNotificationState({ userId: activeUserId, rows: rows.slice(0, 24) });
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
  }, [userId]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setUserMenuOpen(false);
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
    if (pathname !== '/search') return;
    const query = new URLSearchParams(searchKey).get('q') ?? '';
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
    const nextOpen = !notifMenuOpen;
    setNotifMenuOpen(nextOpen);
    setUserMenuOpen(false);
    if (nextOpen && visibleNotifications.length > 0) {
      const merged = new Set(seenIds);
      visibleNotifications.forEach(n => merged.add(n.id));
      setSeenIds(merged);
      if (userId) void saveNotificationReadState(userId, { seenIds: merged, hiddenIds: hiddenNotificationIds });
    }
  }

  useEffect(() => {
    if (!userMenuOpen && !notifMenuOpen && !searchOpen) return;
    function onClick(e: MouseEvent) {
      if (userMenuOpen && userWrapRef.current && !userWrapRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (notifMenuOpen && notifWrapRef.current && !notifWrapRef.current.contains(e.target as Node)) setNotifMenuOpen(false);
      if (searchOpen && searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const returnTarget = userMenuOpen
        ? userWrapRef.current
        : notifMenuOpen
          ? notifWrapRef.current
          : searchWrapRef.current;
      setUserMenuOpen(false);
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
  }, [userMenuOpen, notifMenuOpen, searchOpen]);

  const profile = profileState && profileState.userId === userId ? profileState.profile : null;
  const notifications = notificationState && notificationState.userId === userId ? notificationState.rows : [];
  const hasOrders = Boolean(orderVisibilityState?.userId === userId && orderVisibilityState.hasOrders);
  const hasTeamAccess = Boolean(teamVisibilityState?.userId === userId && teamVisibilityState.authorized);
  const displayName = profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'You';
  const avatarUrl = profile?.avatar_url ?? null;
  const profileHref = profile?.username ? `/profile/${profile.username}` : '/profile';
  const visibleNotifications = notifications.filter(notification => (
    notificationIsEnabled(notification) &&
    !hiddenNotificationIds.has(notification.id)
  ));
  const unreadNotificationCount = visibleNotifications.filter(n => !seenIds.has(n.id)).length;
  const backLabel = labelForPath(previousPath?.split('?')[0]) ?? back?.label ?? 'Back';
  const mobileTopbarState = getMobileTopbarState(pathname);

  async function handleSignOut() {
    setUserMenuOpen(false);
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  function hideNotification(id: string) {
    const next = new Set(hiddenNotificationIds);
    next.add(id);
    setHiddenNotificationIds(next);
    if (userId) void saveNotificationReadState(userId, { seenIds, hiddenIds: next });
  }

  function clearNotifications() {
    const next = new Set(hiddenNotificationIds);
    visibleNotifications.forEach(notification => next.add(notification.id));
    setHiddenNotificationIds(next);
    if (userId) void saveNotificationReadState(userId, { seenIds, hiddenIds: next });
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchDraft.trim();
    setSearchKey(query ? `q=${encodeURIComponent(query)}` : '');
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  }

  const closeMobileSearch = useCallback(() => {
    setMobileSearchOpen(false);
  }, []);

  const openMobileSearch = useCallback(() => {
    setMobileSearchOpen(true);
    setUserMenuOpen(false);
    setNotifMenuOpen(false);
  }, []);

  const submitMobileSearch = useCallback((value: string, href?: string) => {
    const query = value.trim();
    setMobileSearchOpen(false);
    if (href) {
      router.push(href);
      return;
    }
    setSearchKey(query ? `q=${encodeURIComponent(query)}` : '');
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  }, [router]);

  return (
    <>
      <div className={`os-topbar os-topbar-mode-${mobileTopbarState.mode}`}>
        <div className="os-topbar-left">
          <Link href="/" className="os-mobile-logo os-mobile-brand-logo" aria-label="44OS Home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/44-topbar-logo.png" alt="" />
          </Link>
        {back && (
          <button
            type="button"
            className="ui44-symbol-button ui44-symbol-button-back os-topbar-back"
            aria-label={backLabel}
            title={backLabel}
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
                return;
              }
              router.push(back.href);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 5l-6 6 6 6"/>
            </svg>
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
        {tabs?.map(tab => {
          const className = tab.active ? 'os-topbar-tab os-topbar-tab-active' : 'os-topbar-tab';
          return tab.href ? (
            <Link key={tab.id} href={tab.href} className={className} scroll={false}>{tab.label}</Link>
          ) : (
            <button key={tab.id} type="button" className={className} onClick={tab.onClick}>{tab.label}</button>
          );
        })}
        </div>

        <div className="os-topbar-right">
        {PUBLIC_PURCHASES_AVAILABLE && cartCount > 0 && (
          <Link href="/cart" className="ui44-symbol-button ui44-symbol-button-cart os-topbar-icon-button os-topbar-cart-button" aria-label={`Cart · ${cartCount} item${cartCount === 1 ? '' : 's'}`}>
            <IconCart />
            <span className="os-topbar-cart-count">{cartCount}</span>
          </Link>
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
                placeholder="Search"
                aria-label="Search"
              />
              {searchDraft && <button type="button" className="os-topbar-search-clear" aria-label="Clear search" onClick={() => setSearchDraft('')}>×</button>}
            </form>
          ) : (
            <button type="button" className="ui44-symbol-button ui44-symbol-button-search os-topbar-icon-button" aria-label="Search" onClick={() => {
              setSearchOpen(true);
              setUserMenuOpen(false);
              setNotifMenuOpen(false);
            }}>
              <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
            </button>
          )}
        </div>
        {mobileTopbarState.mode !== 'search-back' && (
          <button
            type="button"
            className="ui44-symbol-button ui44-symbol-button-search os-topbar-icon-button os-topbar-mobile-search-trigger"
            aria-label="Search"
            aria-expanded={mobileSearchOpen}
            onClick={openMobileSearch}
          >
            <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
          </button>
        )}
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
                  {visibleNotifications.length > 0 && (
                    <button type="button" className="os-popover-text-button" onClick={clearNotifications}>
                      Clear All
                    </button>
                  )}
                </div>
                {visibleNotifications.length === 0 ? (
                  <div className="os-notification-empty">You&rsquo;re all caught up.</div>
                ) : (
                  <div className="os-notification-list">
                    {visibleNotifications.map(item => (
                      <div key={item.id} className="os-notification-row">
                        <Link href={item.href || '/notifications'} className="os-notification-item">
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

        {user ? (
          <div ref={userWrapRef} className="os-topbar-account-menu">
            <button
              type="button"
              className="os-topbar-avatar"
              aria-label="Your account"
              onClick={() => { setUserMenuOpen(o => !o); setNotifMenuOpen(false); }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} />
              ) : (
                <IconUser />
              )}
            </button>
            {userMenuOpen && (
              <div className="ui44-paper-menu os-popover os-account-popover" role="menu">
                <Link href={profileHref} className="ui44-paper-menu-item os-popover-item os-account-menu-item" role="menuitem">
                  <IconProfile />
                  <span className="os-account-menu-copy"><strong>Profile</strong><span>View or edit your profile</span></span>
                </Link>
                <Link href="/inbox" className="ui44-paper-menu-item os-popover-item os-account-menu-item" role="menuitem">
                  <IconMessages />
                  <span className="os-account-menu-copy"><strong>Messages</strong><span>View or send messages</span></span>
                </Link>
                {hasOrders && (
                  <Link href="/orders" className="ui44-paper-menu-item os-popover-item os-account-menu-item" role="menuitem">
                    <IconOrders />
                    <span className="os-account-menu-copy"><strong>Orders</strong><span>View purchases and orders</span></span>
                  </Link>
                )}
                {isCreatorProfile(profile) && (
                  <Link href="/studio" className="ui44-paper-menu-item os-popover-item os-account-menu-item" role="menuitem">
                    <IconStudio />
                    <span className="os-account-menu-copy"><strong>Studio</strong><span>Publish and manage work</span></span>
                  </Link>
                )}
                {hasTeamAccess && (
                  <Link href="/team" className="ui44-paper-menu-item os-popover-item os-account-menu-item" role="menuitem">
                    <IconTeam />
                    <span className="os-account-menu-copy"><strong>Team</strong><span>Open Team resources</span></span>
                  </Link>
                )}
                <div className="os-popover-divider" />
                <button type="button" className="ui44-paper-menu-item os-popover-item" role="menuitem" onClick={handleSignOut}>
                  <IconSignOut /> Log Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className="os-topbar-avatar os-topbar-login-avatar" aria-label="Log in">
            <IconUser />
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
      />
    </>
  );
}
