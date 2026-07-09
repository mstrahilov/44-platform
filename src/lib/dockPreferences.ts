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
export type PinnedDockItemKind = 'music' | 'book' | 'asset' | 'profile' | 'item';
export type PinnedDockItem = {
  id: string;
  label: string;
  href: string;
  iconClass: string;
  kind: PinnedDockItemKind;
  imageUrl?: string | null;
};

export const DOCK_MODE_STORAGE_KEY = '44-dock-mode';
export const DOCK_HIDDEN_STORAGE_KEY = '44-dock-hidden';
export const DOCK_ORDER_STORAGE_KEY = '44-dock-order';
export const DOCK_PINNED_STORAGE_KEY = '44-dock-pinned';
const DOCK_PREFERENCES_UPDATED = '44-dock-preferences-updated';
const DEFAULT_HIDDEN_DOCK_APP_IDS: OSAppId[] = [];
const DEFAULT_DOCK_ORDER: OSAppId[] = ['library', 'store', 'community', 'dashboard', 'radio', 'support'];
const MAX_PINNED_DOCK_ITEMS = 5;

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
    const parsed = raw ? (JSON.parse(raw) as unknown) : DEFAULT_HIDDEN_DOCK_APP_IDS;
    return Array.isArray(parsed) ? (parsed as OSAppId[]) : [];
  } catch {
    return DEFAULT_HIDDEN_DOCK_APP_IDS;
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

export function getDockAppOrder(): OSAppId[] {
  if (typeof window === 'undefined') return DEFAULT_DOCK_ORDER;
  try {
    const raw = window.localStorage.getItem(DOCK_ORDER_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : DEFAULT_DOCK_ORDER;
    return Array.isArray(parsed) ? (parsed as OSAppId[]) : DEFAULT_DOCK_ORDER;
  } catch {
    return DEFAULT_DOCK_ORDER;
  }
}

export function setDockAppOrder(order: OSAppId[]) {
  if (typeof window === 'undefined') return;
  const deduped = Array.from(new Set([...order, ...DEFAULT_DOCK_ORDER]));
  window.localStorage.setItem(DOCK_ORDER_STORAGE_KEY, JSON.stringify(deduped));
  window.dispatchEvent(new Event(DOCK_PREFERENCES_UPDATED));
}

export function resetDockPreferences() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DOCK_MODE_STORAGE_KEY, 'full');
  window.localStorage.setItem(DOCK_HIDDEN_STORAGE_KEY, JSON.stringify(DEFAULT_HIDDEN_DOCK_APP_IDS));
  window.localStorage.setItem(DOCK_ORDER_STORAGE_KEY, JSON.stringify(DEFAULT_DOCK_ORDER));
  window.localStorage.removeItem(DOCK_PINNED_STORAGE_KEY);
  window.dispatchEvent(new Event(DOCK_PREFERENCES_UPDATED));
}

export function getPinnedDockItems(): PinnedDockItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DOCK_PINNED_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPinnedDockItem).slice(0, MAX_PINNED_DOCK_ITEMS);
  } catch {
    return [];
  }
}

export function pinDockItem(item: PinnedDockItem) {
  if (typeof window === 'undefined') return;
  const current = getPinnedDockItems().filter(existing => existing.id !== item.id);
  window.localStorage.setItem(DOCK_PINNED_STORAGE_KEY, JSON.stringify([item, ...current].slice(0, MAX_PINNED_DOCK_ITEMS)));
  window.dispatchEvent(new Event(DOCK_PREFERENCES_UPDATED));
}

export function unpinDockItem(id: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DOCK_PINNED_STORAGE_KEY, JSON.stringify(getPinnedDockItems().filter(item => item.id !== id)));
  window.dispatchEvent(new Event(DOCK_PREFERENCES_UPDATED));
}

function isPinnedDockItem(value: unknown): value is PinnedDockItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<PinnedDockItem>;
  return typeof item.id === 'string'
    && typeof item.label === 'string'
    && typeof item.href === 'string'
    && typeof item.iconClass === 'string'
    && typeof item.kind === 'string'
    && (item.imageUrl === undefined || item.imageUrl === null || typeof item.imageUrl === 'string');
}

/** Live Dock preferences for components. Re-renders on any preference change. */
export function useDockPreferences(): { mode: DockMode; hiddenIds: OSAppId[]; order: OSAppId[]; pinnedItems: PinnedDockItem[] } {
  const [mode, setModeState] = useState<DockMode>('full');
  const [hiddenIds, setHiddenIds] = useState<OSAppId[]>([]);
  const [order, setOrder] = useState<OSAppId[]>(DEFAULT_DOCK_ORDER);
  const [pinnedItems, setPinnedItems] = useState<PinnedDockItem[]>([]);

  useEffect(() => {
    function sync() {
      setModeState(getDockMode());
      setHiddenIds(getHiddenDockAppIds());
      setOrder(getDockAppOrder());
      setPinnedItems(getPinnedDockItems());
    }
    sync();
    window.addEventListener(DOCK_PREFERENCES_UPDATED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(DOCK_PREFERENCES_UPDATED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { mode, hiddenIds, order, pinnedItems };
}
