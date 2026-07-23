'use client';

/**
 * The 44OS Dock. Renders from the app registry (src/lib/osApps.ts) —
 * do not add nav items here; register them in the registry instead.
 * The file keeps its Sidebar name for compatibility; product language
 * for this surface is "Dock".
 *
 * OS behaviors owned here:
 * - Right-click on a Dock item → context menu (Open / Dock mode /
 *   Dock Settings). Right-click on empty Dock → mode + settings.
 * - Horizontal drag on the Dock (≈56px) toggles full ↔ compact mode;
 *   the drag never resizes the Dock freely, it snaps between the two modes.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { getActiveMobileOSAppId, getActiveOSAppId, getAvailableDockApps, getOSApp, type OSApp } from '@/lib/osApps';
import { setDockMode, unpinDockItem, useDockPreferences, type PinnedDockItem } from '@/lib/dockPreferences';
import { useContextMenu, type ContextMenuEntry } from '@/components/ContextMenu';

const DRAG_TOGGLE_DISTANCE = 56;
const DRAG_START_DISTANCE = 12;

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    Promise.resolve().then(() => setNow(new Date()));
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function dockModeEntries(compact: boolean): ContextMenuEntry[] {
  return [
    {
      id: 'dock-mode',
      label: compact ? 'Expand Dock' : 'Compact Dock',
      onSelect: () => setDockMode(compact ? 'full' : 'compact'),
    },
    { id: 'dock-settings', label: 'Dock Settings', href: '/settings#dock' },
  ];
}

function DockItem({
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
    ...dockModeEntries(compact),
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

function PinnedDockItemRow({ item, active, compact }: { item: PinnedDockItem; active: boolean; compact: boolean }) {
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
        { id: 'unpin', label: 'Unpin Item', onSelect: () => unpinDockItem(item.id) },
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

function DockSection({
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
        <DockItem key={app.id} app={app} active={activeAppId === app.id} compact={compact} />
      ))}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const { mode, pinnedItems } = useDockPreferences();
  const now = useNow();
  const activeAppId = getActiveOSAppId(pathname);
  const activeMobileAppId = getActiveMobileOSAppId(pathname);
  const { openContextMenu } = useContextMenu();

  const compact = mode === 'compact';

  // Drag-to-toggle: track a horizontal pointer drag anywhere on the Dock.
  const dragRef = useRef<{ startX: number } | null>(null);
  const suppressClickRef = useRef(false);
  const compactRef = useRef(compact);

  useEffect(() => {
    compactRef.current = compact;
  }, [compact]);

  function onPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    dragRef.current = { startX: event.clientX };
    suppressClickRef.current = false;
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    if (Math.abs(dx) > DRAG_START_DISTANCE && !suppressClickRef.current) {
      // A real drag has started: capture the pointer so the gesture
      // completes even if it leaves the Dock, and swallow the click.
      suppressClickRef.current = true;
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
    }
    if (!compactRef.current && dx < -DRAG_TOGGLE_DISTANCE) {
      setDockMode('compact');
      dragRef.current = null;
    } else if (compactRef.current && dx > DRAG_TOGGLE_DISTANCE) {
      setDockMode('full');
      dragRef.current = null;
    }
  }

  function onPointerEnd() {
    dragRef.current = null;
  }

  // After a drag, swallow the click that would otherwise open the item under the pointer.
  function onClickCapture(event: React.MouseEvent<HTMLElement>) {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
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
  const settingsApp = dockApps.find(app => app.id === 'settings') ?? null;
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
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={onClickCapture}
      onDragStart={event => event.preventDefault()}
      onContextMenu={event => {
        // Items open their own menus; this handles the Dock background.
        if ((event.target as HTMLElement).closest('.sidebar-item, .sidebar-logo')) return;
        openContextMenu(event, dockModeEntries(compact));
      }}
    >
      <div className="sidebar-top">
        <Link href="/" className="sidebar-logo" aria-label="44OS Home">
          <span className="os-logo-44" aria-hidden="true" />
        </Link>
        <span className="sidebar-clock" aria-live="polite">{time}</span>
      </div>

      <nav className="sidebar-nav sidebar-nav-desktop" aria-label="Dock">
        <DockSection apps={primaryApps} activeAppId={mainActiveAppId} compact={compact} />

        {pinnedItems.length > 0 && (
          <>
            <div className="sidebar-divider" />
            {pinnedItems.map(item => (
              <PinnedDockItemRow key={item.id} item={item} active={activePinnedItem?.id === item.id} compact={compact} />
            ))}
          </>
        )}

        <div className="sidebar-spacer" />

        {supportApp && (
          <DockItem app={supportApp} active={mainActiveAppId === supportApp.id} compact={compact} />
        )}

        {user && settingsApp && (
          <>
            <div className="sidebar-divider" />
            <DockItem app={settingsApp} active={mainActiveAppId === settingsApp.id} compact={compact} />
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
    </aside>
  </>;
}

function isPinnedDockItemActive(pathname: string, href: string) {
  const path = href.split('?')[0];
  return pathname === path || pathname.startsWith(`${path}/`);
}
