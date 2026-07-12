'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import {
  ACHIEVEMENT_NOTIFICATIONS_UPDATED,
  loadAchievementNotifications,
  type AchievementNotification,
} from '@/lib/achievementNotifications';
import { notificationIsEnabled } from '@/lib/notificationPreferences';
import { usePathname, useRouter } from 'next/navigation';
import { useTopbar } from './TopbarContext';
import { useCart } from '@/lib/cart';
import {
  loadNotificationReadState,
  NOTIFICATION_STATE_UPDATED,
  saveNotificationReadState,
} from '@/lib/notificationState';

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

const IconProfile = () => (
  <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="7.5" r="3.5"/>
    <path d="M3 19c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>
  </svg>
);

const IconStudio = () => <span className="os-icon os-icon-dashboard os-icon-sm" aria-hidden="true" />;
const IconSettings = () => <span className="os-icon os-icon-settings os-icon-sm" aria-hidden="true" />;

const IconMessages = () => (
  <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 12.5a1.5 1.5 0 0 1-1.5 1.5H8l-4 3.5V5.5A1.5 1.5 0 0 1 5.5 4h11a1.5 1.5 0 0 1 1.5 1.5v7z"/>
  </svg>
);

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

function labelForPath(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith('/library')) return 'Library';
  if (path.startsWith('/browse') || path.startsWith('/store') || path.startsWith('/product') || path.startsWith('/cart')) return 'Browse';
  if (path.startsWith('/community')) return 'Community';
  if (path.startsWith('/studio') || path.startsWith('/dashboard')) return 'Studio';
  if (path.startsWith('/profile')) return 'Profile';
  if (path.startsWith('/music')) return 'Music';
  if (path.startsWith('/books')) return 'Books';
  if (path.startsWith('/assets')) return 'Assets';
  if (path.startsWith('/merch') || path.startsWith('/shop')) return 'Merch';
  if (path === '/' || path.startsWith('/home')) return 'Browse';
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
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [hiddenNotificationIds, setHiddenNotificationIds] = useState<Set<string>>(new Set());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
      if (alive) setNotificationState({ userId: activeUserId, rows: rows.slice(0, 10) });
    });
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const activeUserId = userId;

    async function refreshNotifications() {
      const rows = await loadAchievementNotifications(activeUserId);
      setNotificationState({ userId: activeUserId, rows: rows.slice(0, 10) });
    }

    function onAchievementUpdate() {
      refreshNotifications();
    }

    window.addEventListener(ACHIEVEMENT_NOTIFICATIONS_UPDATED, onAchievementUpdate);
    return () => window.removeEventListener(ACHIEVEMENT_NOTIFICATIONS_UPDATED, onAchievementUpdate);
  }, [userId]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setUserMenuOpen(false);
      setNotifMenuOpen(false);
      setSearchOpen(false);
      document.querySelector<HTMLElement>('.app-main-content')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
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
    if (typeof window === 'undefined') return;
    const pathWithQuery = searchKey ? `${pathname}?${searchKey}` : pathname;
    const saved = window.sessionStorage.getItem(`${SCROLL_PREFIX}${pathWithQuery}`);
    if (saved) {
      const y = Number(saved);
      if (Number.isFinite(y) && y > 0) {
        window.requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: 'auto' }));
      }
    }

    let frame = 0;
    function saveScroll() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        window.sessionStorage.setItem(`${SCROLL_PREFIX}${pathWithQuery}`, String(window.scrollY));
      });
    }
    window.addEventListener('scroll', saveScroll, { passive: true });
    window.addEventListener('pagehide', saveScroll);
    return () => {
      saveScroll();
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', saveScroll);
      window.removeEventListener('pagehide', saveScroll);
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
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [userMenuOpen, notifMenuOpen, searchOpen]);

  const profile = profileState && profileState.userId === userId ? profileState.profile : null;
  const notifications = notificationState && notificationState.userId === userId ? notificationState.rows : [];
  const displayName = profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'You';
  const avatarUrl = profile?.avatar_url ?? null;
  const profileHref = profile?.username ? `/profile/${profile.username}` : '/profile';
  const visibleNotifications = notifications.filter(notification => (
    notification.kind !== 'message' &&
    notificationIsEnabled(notification) &&
    !hiddenNotificationIds.has(notification.id)
  ));
  const hasNewNotifications = visibleNotifications.some(n => !seenIds.has(n.id));
  const backLabel = labelForPath(previousPath?.split('?')[0]) ?? back?.label ?? 'Back';

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
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  }

  return (
    <div className="os-topbar">
      <div className="os-topbar-left">
        <Link href="/" className="os-mobile-logo" aria-label="44OS Home">
          <span className="os-logo-44" aria-hidden="true" />
        </Link>
        {back && (
          <button
            type="button"
            className="os-topbar-back"
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
        {cartCount > 0 && (
          <Link href="/cart" className="os-topbar-icon-button os-topbar-cart-button" aria-label={`Cart · ${cartCount} item${cartCount === 1 ? '' : 's'}`}>
            <IconCart />
            <span className="os-topbar-cart-count">{cartCount}</span>
          </Link>
        )}

        <div className="os-topbar-search" ref={searchWrapRef}>
          {searchOpen ? (
            <form className="os-topbar-search-form" role="search" onSubmit={submitSearch}>
              <span className="os-topbar-search-icon os-icon os-icon-search os-icon-sm" aria-hidden="true" />
              <input
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
            <button type="button" className="os-topbar-icon-button" aria-label="Search" onClick={() => {
              setSearchOpen(true);
              setUserMenuOpen(false);
              setNotifMenuOpen(false);
            }}>
              <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
            </button>
          )}
        </div>

        {user && (
          <div ref={notifWrapRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className={notifMenuOpen ? 'os-topbar-icon-button os-topbar-icon-button-active' : 'os-topbar-icon-button'}
              aria-label="Notifications"
              aria-expanded={notifMenuOpen}
              onClick={openNotifMenu}
            >
              <span className="os-topbar-icon-wrapper">
                <IconBell />
                {hasNewNotifications && <span className="os-topbar-dot" />}
              </span>
            </button>
            {notifMenuOpen && (
              <div className="os-popover os-popover-wide" role="menu">
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
                          <div className="os-notification-time">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Just now'}
                          </div>
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
                <Link href="/notifications" className="os-popover-footer-link">
                  View all notifications
                </Link>
              </div>
            )}
          </div>
        )}

        {user ? (
          <div ref={userWrapRef} style={{ position: 'relative' }}>
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
              <div className="os-popover os-account-popover" role="menu">
                <Link href={profileHref} className="os-popover-item" role="menuitem">
                  <IconProfile /> Profile
                </Link>
                <Link href="/inbox" className="os-popover-item" role="menuitem">
                  <IconMessages /> Inbox
                </Link>
                <Link href="/studio" className="os-popover-item" role="menuitem">
                  <IconStudio /> Studio
                </Link>
                <Link href="/settings" className="os-popover-item os-popover-item-mobile-only" role="menuitem">
                  <IconSettings /> Settings
                </Link>
                <div className="os-popover-divider" />
                <button type="button" className="os-popover-item" role="menuitem" onClick={handleSignOut}>
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
  );
}
