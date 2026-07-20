'use client';

import { supabase } from '@/lib/supabase';

export const WEB_PUSH_STATE_UPDATED = '44:web-push-state-updated';

export type WebPushState = 'unsupported' | 'default' | 'enabled' | 'denied' | 'error';

function publicKeyBytes(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(window.atob(base64), character => character.charCodeAt(0));
}

export function webPushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
    && Boolean(process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY);
}

export function isStandaloneWebApp() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export async function register44ServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

async function bearerToken() {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error('Sign in again to manage notifications.');
  return token;
}

async function saveSubscription(subscription: PushSubscription) {
  const serialized = subscription.toJSON();
  const token = await bearerToken();
  const response = await fetch('/api/push/subscriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(serialized),
  });
  if (!response.ok) throw new Error('Push subscription could not be saved.');
}

export async function getWebPushState(): Promise<WebPushState> {
  if (!webPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'default';
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription() ? 'enabled' : 'default';
}

export async function enableWebPush() {
  if (!webPushSupported()) throw new Error('Push notifications are not supported on this device.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    window.dispatchEvent(new Event(WEB_PUSH_STATE_UPDATED));
    return permission === 'denied' ? 'denied' : 'default';
  }
  const registration = await register44ServiceWorker();
  if (!registration) throw new Error('The notification service could not start.');
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: publicKeyBytes(process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY || ''),
  });
  await saveSubscription(subscription);
  window.dispatchEvent(new Event(WEB_PUSH_STATE_UPDATED));
  return 'enabled' as const;
}

export async function disableWebPush() {
  if (!webPushSupported()) return 'unsupported' as const;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const token = await bearerToken();
    await fetch('/api/push/subscriptions', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
  }
  window.dispatchEvent(new Event(WEB_PUSH_STATE_UPDATED));
  return 'default' as const;
}

export async function syncExistingWebPushSubscription() {
  if (!webPushSupported() || Notification.permission !== 'granted') return;
  const registration = await register44ServiceWorker();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) await saveSubscription(subscription);
}

export async function requestPushDelivery() {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) return;
  await fetch('/api/push/process', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
}
