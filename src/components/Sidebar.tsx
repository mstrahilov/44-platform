'use client';

/**
 * The 44OS Dock. Renders from the app registry (src/lib/osApps.ts) —
 * do not add nav items here; register them in the registry instead.
 * The file keeps its Sidebar name for compatibility; product language
 * for this surface is "Dock".
 *
 * OS behaviors owned here:
 * - Right-click on a Dock item → context menu (Open / Hide from Dock /
 *   Dock mode / Dock Settings). Right-click on empty Dock → mode + settings.
 * - Horizontal drag on the Dock (≈56px) toggles full ↔ compact mode;
 *   the drag never resizes the Dock freely, it snaps between the two modes.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { getActiveOSAppId, getAvailableDockApps, type OSApp } from '@/lib/osApps';
import { setDockAppHidden, setDockMode, useDockPreferences } from '@/lib/dockPreferences';
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
    { id: 'dock-settings', label: 'Dock Settings', href: '/settings?tab=dock' },
  ];
}

function DockItem({ app, active, compact }: { app: OSApp; active: boolean; compact: boolean }) {
  const { openContextMenu } = useContextMenu();

  const entries: ContextMenuEntry[] = [
    { id: 'open', label: `Open ${app.label}`, href: app.href },
    { kind: 'divider', id: 'divider-1' },
    ...(app.locked
      ? []
      : ([{ id: 'hide', label: 'Hide from Dock', onSelect: () => setDockAppHidden(app.id, true) }] as ContextMenuEntry[])),
    ...dockModeEntries(compact),
  ];

  return (
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
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const { mode, hiddenIds } = useDockPreferences();
  const now = useNow();
  const activeAppId = getActiveOSAppId(pathname);
  const { openContextMenu } = useContextMenu();

  const compact = mode === 'compact';

  // Drag-to-toggle: track a horizontal pointer drag anywhere on the Dock.
  const dragRef = useRef<{ startX: number } | null>(null);
  const suppressClickRef = useRef(false);
  const compactRef = useRef(compact);
  compactRef.current = compact;

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
  });
  const dockApps = availableApps.filter(app => app.locked || !hiddenIds.includes(app.id));

  const mediaApps = dockApps.filter(app => app.group === 'media');
  const communityApps = dockApps.filter(app => app.group === 'community');
  const studioOrder = ['dashboard'];
  const studioApps = dockApps
    .filter(app => app.group === 'studio')
    .sort((a, b) => studioOrder.indexOf(a.id) - studioOrder.indexOf(b.id));
  const accountApps = dockApps.filter(app => app.group === 'account');
  const systemApps = dockApps.filter(app => app.group === 'system');

  const time = now
    ? now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  return (
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
        <Link href="/" className="sidebar-logo" aria-label="44 Home">
          <span className="os-logo-44" aria-hidden="true" />
        </Link>
        <span className="sidebar-clock" aria-live="polite">{time}</span>
      </div>

      <nav className="sidebar-nav" aria-label="Dock">
        {mediaApps.map(app => (
          <DockItem key={app.id} app={app} active={activeAppId === app.id} compact={compact} />
        ))}

        {mediaApps.length > 0 && communityApps.length > 0 && <div className="sidebar-divider" />}

        {communityApps.map(app => (
          <DockItem key={app.id} app={app} active={activeAppId === app.id} compact={compact} />
        ))}

        {communityApps.length > 0 && studioApps.length > 0 && <div className="sidebar-divider" />}

        {studioApps.map(app => (
          <DockItem key={app.id} app={app} active={activeAppId === app.id} compact={compact} />
        ))}

        <div className="sidebar-spacer" />

        {!user && (
          <>
            <Link
              href="/login"
              className={pathname.startsWith('/login') ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}
              title={compact ? 'Log In' : undefined}
              aria-label="Log In"
            >
              <span className="os-icon os-icon-user" aria-hidden="true" />
              <span className="sidebar-item-label">Log In</span>
            </Link>
          </>
        )}

        {accountApps.map(app => (
          <DockItem key={app.id} app={app} active={activeAppId === app.id} compact={compact} />
        ))}

        <div className="sidebar-divider" />

        {systemApps.map(app => (
          <DockItem key={app.id} app={app} active={activeAppId === app.id} compact={compact} />
        ))}
      </nav>
    </aside>
  );
}
