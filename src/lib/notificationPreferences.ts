'use client';

import type { AchievementNotification } from '@/lib/achievementNotifications';

export type NotificationPreferenceKind = 'mentions' | 'replies' | 'likes' | 'achievements';

export const NOTIFICATION_PREFERENCE_KEYS: Record<NotificationPreferenceKind, string> = {
  mentions: '44-setting-notification-mentions',
  replies: '44-setting-notification-replies',
  likes: '44-setting-notification-likes',
  achievements: '44-setting-notification-achievements',
};

export function getNotificationPreference(kind: NotificationPreferenceKind, fallback = true) {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(NOTIFICATION_PREFERENCE_KEYS[kind]);
  if (value === null) return fallback;
  return value === 'true';
}

export function setNotificationPreference(kind: NotificationPreferenceKind, value: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NOTIFICATION_PREFERENCE_KEYS[kind], String(value));
}

export function resetNotificationPreferences() {
  if (typeof window === 'undefined') return;
  Object.values(NOTIFICATION_PREFERENCE_KEYS).forEach(key => window.localStorage.removeItem(key));
}

export function notificationIsEnabled(notification: Pick<AchievementNotification, 'kind'>) {
  if (notification.kind === 'mention') return getNotificationPreference('mentions');
  if (notification.kind === 'reply') return getNotificationPreference('replies');
  if (notification.kind === 'like') return getNotificationPreference('likes');
  if (notification.kind === 'achievement') return getNotificationPreference('achievements');
  if (notification.kind === 'system') return true;
  return false;
}
