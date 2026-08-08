'use client';

/**
 * The 44OS Sidebar. Renders from the app registry (src/lib/osApps.ts) —
 * do not add nav items here; register them in the registry instead.
 *
 * OS behaviors owned here:
 * - Right-click on a Sidebar item → context menu (Open / Sidebar mode /
 *   Sidebar Settings). Right-click on empty Sidebar → mode + settings.
 * - Drag the desktop Sidebar's trailing edge between its compact and expanded
 *   bounds. Crossing the label-safe threshold snaps to the compact icon rail.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { getActiveMobileOSAppId, getActiveOSAppId, getAvailableDockApps, getOSApp, type OSApp } from '@/lib/osApps';
import {
  SIDEBAR_COMPACT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_EXPANDED_WIDTH,
  setDockMode,
  setSidebarWidth,
  unpinDockItem,
  useDockPreferences,
  type PinnedDockItem,
} from '@/lib/dockPreferences';
import { useContextMenu, type ContextMenuEntry } from '@/components/ContextMenu';

const RESIZE_STEP = 16;
const EXPAND_DRAG_DISTANCE = 12;

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    Promise.resolve().then(() => setNow(new Date()));
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function sidebarModeEntries(compact: boolean): ContextMenuEntry[] {
  return [
    {
      id: 'dock-mode',
      label: compact ? 'Expand Sidebar' : 'Compact Sidebar',
      onSelect: () => setDockMode(compact ? 'full' : 'compact'),
    },
    { id: 'dock-settings', label: 'Sidebar Settings', href: '/settings#appearance' },
  ];
}

function SidebarItem({
  app,
  active,
  compact,
}: {
  app: OSApp;
  active: boolean;
  compact: boolean;
}) {
  const { openContextMenu } = useContextMenu();

  const entries: ContextMenuEntry[] = [
    { id: 'open', label: `Open ${app.label}`, href: app.href },
    { kind: 'divider', id: 'divider-1' },
    ...sidebarModeEntries(compact),
  ];

  return <div className="sidebar-app-group">
    <Link
        href={app.href}
        className={active ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}
        title={compact ? app.label : undefined}
        aria-label={app.label}
        onContextMenu={event => openContextMenu(event, entries)}
      >
        <span className={`os-icon ${app.iconClass}`} aria-hidden="true" />
        <span className="sidebar-item-label">{app.label}</span>
      </Link>
    </div>;
}

function SidebarAccountItem({ profile, active, compact }: { profile: StudioProfile | null; active: boolean; compact: boolean }) {
  const { openContextMenu } = useContextMenu();
  const label = 'Account';
  return <div className="sidebar-app-group">
    <Link
      href="/you"
      className={active ? 'sidebar-item sidebar-item-active sidebar-account-item' : 'sidebar-item sidebar-account-item'}
      title={compact ? label : undefined}
      aria-label={label}
      onContextMenu={event => openContextMenu(event, [
        { id: 'open', label: 'Open Account', href: '/you' },
        { kind: 'divider', id: 'divider-1' },
        ...sidebarModeEntries(compact),
      ])}
    >
      <span className="sidebar-account-avatar" aria-hidden="true">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" />
        ) : <span className="os-icon os-icon-user" />}
      </span>
      <span className="sidebar-item-label">{label}</span>
    </Link>
  </div>;
}

function PinnedSidebarItemRow({ item, active, compact }: { item: PinnedDockItem; active: boolean; compact: boolean }) {
  const { openContextMenu } = useContextMenu();
  return (
    <Link
      href={item.href}
      className={active ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}
      title={compact ? item.label : undefined}
      aria-label={item.label}
      onContextMenu={event => openContextMenu(event, [
        { id: 'open', label: `Open ${item.label}`, href: item.href },
        { kind: 'divider', id: 'divider-1' },
        { id: 'unpin', label: 'Unpin from Sidebar', onSelect: () => unpinDockItem(item.id) },
      ])}
    >
      <span className="sidebar-pin-art" aria-hidden="true">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" />
        ) : (
          <span className={`os-icon ${item.iconClass}`} />
        )}
      </span>
      <span className="sidebar-item-label">{item.label}</span>
    </Link>
  );
}

function SidebarSection({
  label,
  apps,
  activeAppId,
  compact,
}: {
  label?: string;
  apps: OSApp[];
  activeAppId: string;
  compact: boolean;
}) {
  if (apps.length === 0) return null;

  return (
    <div className="sidebar-section" aria-label={label}>
      {label && <div className="sidebar-section-label">{label}</div>}
      {apps.map(app => (
        <SidebarItem key={app.id} app={app} active={activeAppId === app.id} compact={compact} />
      ))}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const { mode, width, pinnedItems } = useDockPreferences();
  const now = useNow();
  const activeAppId = getActiveOSAppId(pathname);
  const activeMobileAppId = getActiveMobileOSAppId(pathname);
  const { openContextMenu } = useContextMenu();

  const compact = mode === 'compact';

  const resizeRef = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
    compact: boolean;
  } | null>(null);

  useEffect(() => {
    document.documentElement.style.setProperty('--os-sidebar-user-width', `${width}px`);
  }, [width]);

  useEffect(() => () => {
    document.body.classList.remove('sidebar-resizing');
  }, []);

  function expandSidebar(nextWidth = width) {
    setSidebarWidth(nextWidth);
    setDockMode('full');
  }

  function compactSidebar() {
    setDockMode('compact');
  }

  function onResizePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: compact ? SIDEBAR_COMPACT_WIDTH : width,
      compact,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add('sidebar-resizing');
  }

  function onResizePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const dx = event.clientX - resize.startX;

    if (resize.compact) {
      if (dx < EXPAND_DRAG_DISTANCE) return;
      expandSidebar(SIDEBAR_MIN_EXPANDED_WIDTH);
      resizeRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: SIDEBAR_MIN_EXPANDED_WIDTH,
        compact: false,
      };
      return;
    }

    const nextWidth = Math.min(SIDEBAR_MAX_WIDTH, resize.startWidth + dx);
    if (nextWidth <= SIDEBAR_MIN_EXPANDED_WIDTH) {
      setSidebarWidth(SIDEBAR_MIN_EXPANDED_WIDTH);
      compactSidebar();
      resizeRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: SIDEBAR_COMPACT_WIDTH,
        compact: true,
      };
      return;
    }
    setSidebarWidth(nextWidth);
  }

  function onResizePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (resizeRef.current?.pointerId !== event.pointerId) return;
    resizeRef.current = null;
    document.body.classList.remove('sidebar-resizing');
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* pointer already released */ }
  }

  function onResizeKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (compact || width - RESIZE_STEP <= SIDEBAR_MIN_EXPANDED_WIDTH) compactSidebar();
      else setSidebarWidth(width - RESIZE_STEP);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      expandSidebar(compact ? SIDEBAR_MIN_EXPANDED_WIDTH : width + RESIZE_STEP);
    } else if (event.key === 'Home') {
      event.preventDefault();
      compactSidebar();
    } else if (event.key === 'End') {
      event.preventDefault();
      expandSidebar(SIDEBAR_MAX_WIDTH);
    }
  }

  useEffect(() => {
    if (!user) { Promise.resolve().then(() => setProfile(null)); return; }
    loadStudioProfile(user.id).then(r => setProfile(r.profile));
  }, [user]);

  const availableApps = getAvailableDockApps({
    signedIn: Boolean(user),
    isCreator: isCreatorProfile(profile),
    isAdmin: profile?.role === 'admin',
  });
  const dockApps = availableApps;
  const activePinnedItem = pinnedItems.find(item => isPinnedDockItemActive(pathname, item.href));
  const mainActiveAppId = activePinnedItem ? '' : activeAppId;
  const primaryApps = ['store', 'radio', 'library', 'community']
    .map(id => dockApps.find(app => app.id === id))
    .filter((app): app is OSApp => Boolean(app))
    .map(app => app.id === 'store' ? { ...app, label: 'Home' } : app);
  const supportApp = dockApps.find(app => app.id === 'support') ?? null;
  const accountApp = dockApps.find(app => app.id === 'you') ?? null;
  const mobileDockApps = [
    { app: getOSApp('store'), label: 'Home' },
    { app: getOSApp('library'), label: 'Library' },
    { app: getOSApp('radio'), label: 'Radio' },
    { app: getOSApp('community'), label: 'Community' },
    { app: getOSApp('you'), label: 'Account' },
  ].filter((entry): entry is { app: OSApp; label: string } => Boolean(entry.app));

  const time = now
    ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';

  return <>
    <aside
      className={compact ? 'app-sidebar app-sidebar-compact' : 'app-sidebar'}
      onDragStart={event => event.preventDefault()}
      onContextMenu={event => {
        // Items open their own menus; this handles the Sidebar background.
        if ((event.target as HTMLElement).closest('.sidebar-item, .sidebar-logo, .sidebar-resize-handle')) return;
        openContextMenu(event, sidebarModeEntries(compact));
      }}
    >
      <div className="sidebar-top">
        <Link href="/" className="sidebar-logo" aria-label="44OS Home">
          <span className="os-logo-44" aria-hidden="true" />
        </Link>
        <span className="sidebar-clock" aria-live="polite">{time}</span>
      </div>

      <nav className="sidebar-nav sidebar-nav-desktop" aria-label="Sidebar">
        <SidebarSection apps={primaryApps} activeAppId={mainActiveAppId} compact={compact} />

        {pinnedItems.length > 0 && (
          <>
            <div className="sidebar-divider" />
            {pinnedItems.map(item => (
              <PinnedSidebarItemRow key={item.id} item={item} active={activePinnedItem?.id === item.id} compact={compact} />
            ))}
          </>
        )}

        <div className="sidebar-spacer" />

        {supportApp && (
          <SidebarItem app={supportApp} active={mainActiveAppId === supportApp.id} compact={compact} />
        )}

        {user && accountApp && (
          <>
            <div className="sidebar-divider" />
            <SidebarAccountItem profile={profile} active={mainActiveAppId === accountApp.id} compact={compact} />
          </>
        )}

        {!user ? (
          <Link
            href="/login"
            className={pathname.startsWith('/login') ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}
            title={compact ? 'Log In' : undefined}
            aria-label="Log In"
          >
            <span className="os-icon os-icon-user" aria-hidden="true" />
            <span className="sidebar-item-label">Log In</span>
          </Link>
        ) : null}
      </nav>
      <nav className="sidebar-nav-mobile" aria-label="Primary navigation">
        {mobileDockApps.map(({ app, label }) => (
          <Link
            key={app.id}
            href={app.href}
            className={activeMobileAppId === app.id ? 'mobile-dock-item mobile-dock-item-active' : 'mobile-dock-item'}
            aria-label={label}
            aria-current={activeMobileAppId === app.id ? 'page' : undefined}
          >
            <span className={`mobile-dock-icon os-icon ${app.iconClass}`} aria-hidden="true" />
            <span className="mobile-dock-label">{label}</span>
          </Link>
        ))}
      </nav>
      <div
        className="sidebar-resize-handle"
        role="separator"
        aria-label="Resize Sidebar"
        aria-orientation="vertical"
        aria-valuemin={SIDEBAR_COMPACT_WIDTH}
        aria-valuemax={SIDEBAR_MAX_WIDTH}
        aria-valuenow={compact ? SIDEBAR_COMPACT_WIDTH : width}
        tabIndex={0}
        title="Resize Sidebar"
        onDoubleClick={() => compact ? expandSidebar() : compactSidebar()}
        onKeyDown={onResizeKeyDown}
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerEnd}
        onPointerCancel={onResizePointerEnd}
      />
    </aside>
  </>;
}

function isPinnedDockItemActive(pathname: string, href: string) {
  const path = href.split('?')[0];
  return pathname === path || pathname.startsWith(`${path}/`);
}
