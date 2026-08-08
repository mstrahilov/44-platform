'use client';

import { isTauri } from '@tauri-apps/api/core';
import type { AchievementNotification } from '@/lib/achievementNotifications';

const ENABLED_KEY = '44-desktop-notifications-enabled';
const DENIED_KEY = '44-desktop-notifications-denied';
const SEEN_PREFIX = '44-desktop-notification-ids:';

export type DesktopNotificationState = 'unsupported' | 'default' | 'enabled' | 'denied' | 'error';

export function desktopNotificationsSupported() {
  return typeof window !== 'undefined' && isTauri();
}

async function notificationPlugin() {
  return import('@tauri-apps/plugin-notification');
}

export async function getDesktopNotificationState(): Promise<DesktopNotificationState> {
  if (!desktopNotificationsSupported()) return 'unsupported';
  try {
    const { isPermissionGranted } = await notificationPlugin();
    const granted = await isPermissionGranted();
    if (granted && window.localStorage.getItem(ENABLED_KEY) === 'true') return 'enabled';
    if (window.localStorage.getItem(DENIED_KEY) === 'true') return 'denied';
    return 'default';
  } catch {
    return 'error';
  }
}

export async function enableDesktopNotifications() {
  if (!desktopNotificationsSupported()) return 'unsupported' as const;
  const { isPermissionGranted, requestPermission, sendNotification } = await notificationPlugin();
  let granted = await isPermissionGranted();
  if (!granted) granted = await requestPermission() === 'granted';
  window.localStorage.setItem(DENIED_KEY, granted ? 'false' : 'true');
  window.localStorage.setItem(ENABLED_KEY, granted ? 'true' : 'false');
  if (granted) {
    sendNotification({
      title: 'Notifications enabled',
      body: '44OS can now notify you about replies, mentions, and new messages.',
    });
  }
  return granted ? 'enabled' as const : 'denied' as const;
}

export async function disableDesktopNotifications() {
  if (!desktopNotificationsSupported()) return 'unsupported' as const;
  window.localStorage.setItem(ENABLED_KEY, 'false');
  return 'default' as const;
}

function storedIds(userId: string) {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(`${SEEN_PREFIX}${userId}`) || '[]');
    return new Set(Array.isArray(value) ? value.filter(item => typeof item === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function saveIds(userId: string, rows: AchievementNotification[]) {
  window.sessionStorage.setItem(
    `${SEEN_PREFIX}${userId}`,
    JSON.stringify(rows.slice(0, 100).map(row => row.id)),
  );
}

export function primeDesktopNotificationRows(userId: string, rows: AchievementNotification[]) {
  if (!desktopNotificationsSupported()) return;
  saveIds(userId, rows);
}

export async function deliverNewDesktopNotifications(userId: string, rows: AchievementNotification[]) {
  if (!desktopNotificationsSupported()) return;
  const previousIds = storedIds(userId);
  const additions = rows.filter(row => !previousIds.has(row.id)).slice(0, 3);
  saveIds(userId, rows);
  if (!additions.length || await getDesktopNotificationState() !== 'enabled') return;

  const { sendNotification } = await notificationPlugin();
  additions.reverse().forEach(row => {
    sendNotification({
      title: row.title.slice(0, 120),
      body: (row.description || 'Open 44 to see what is new.').slice(0, 240),
    });
  });
}
