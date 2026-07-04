'use client';

/**
 * Dock preferences — localStorage-first (Supabase `user_dock_items` /
 * `user_os_preferences` take over later, see Other/44OS_FOUNDATION.md §6).
 *
 * All reads/writes go through this module so the Dock and Settings > Dock
 * stay in sync via a window event.
 */

import { useEffect, useState } from 'react';
import type { OSAppId } from '@/lib/osApps';

export type DockMode = 'full' | 'compact';

export const DOCK_MODE_STORAGE_KEY = '44-dock-mode';
export const DOCK_HIDDEN_STORAGE_KEY = '44-dock-hidden';
const DOCK_PREFERENCES_UPDATED = '44-dock-preferences-updated';

export function getDockMode(): DockMode {
  if (typeof window === 'undefined') return 'full';
  return window.localStorage.getItem(DOCK_MODE_STORAGE_KEY) === 'compact' ? 'compact' : 'full';
}

export function setDockMode(mode: DockMode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DOCK_MODE_STORAGE_KEY, mode);
  window.dispatchEvent(new Event(DOCK_PREFERENCES_UPDATED));
}

export function getHiddenDockAppIds(): OSAppId[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DOCK_HIDDEN_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as OSAppId[]) : [];
  } catch {
    return [];
  }
}

export function setDockAppHidden(id: OSAppId, hidden: boolean) {
  if (typeof window === 'undefined') return;
  const current = new Set(getHiddenDockAppIds());
  if (hidden) current.add(id);
  else current.delete(id);
  window.localStorage.setItem(DOCK_HIDDEN_STORAGE_KEY, JSON.stringify(Array.from(current)));
  window.dispatchEvent(new Event(DOCK_PREFERENCES_UPDATED));
}

/** Live Dock preferences for components. Re-renders on any preference change. */
export function useDockPreferences(): { mode: DockMode; hiddenIds: OSAppId[] } {
  const [mode, setModeState] = useState<DockMode>('full');
  const [hiddenIds, setHiddenIds] = useState<OSAppId[]>([]);

  useEffect(() => {
    function sync() {
      setModeState(getDockMode());
      setHiddenIds(getHiddenDockAppIds());
    }
    sync();
    window.addEventListener(DOCK_PREFERENCES_UPDATED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(DOCK_PREFERENCES_UPDATED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { mode, hiddenIds };
}
