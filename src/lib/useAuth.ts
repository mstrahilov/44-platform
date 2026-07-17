'use client';

import { useSyncExternalStore } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ensureProfileForUser } from '@/lib/studioProfiles';

export const AUTH_SESSION_MARKER_KEY = '44-auth-session-present';

type AuthSnapshot = { user: User | null; loading: boolean };

const INITIAL_AUTH_SNAPSHOT: AuthSnapshot = Object.freeze({ user: null, loading: true });
const authListeners = new Set<() => void>();
let authSnapshot: AuthSnapshot = INITIAL_AUTH_SNAPSHOT;
let authStarted = false;
let ensuredUserId: string | null = null;
let welcomeQueuedUserId: string | null = null;

function publishAuth(next: AuthSnapshot) {
  if (authSnapshot.user === next.user && authSnapshot.loading === next.loading) return;
  authSnapshot = next;
  authListeners.forEach(listener => listener());
}

function markSession(signedIn: boolean) {
  try {
    window.localStorage.setItem(AUTH_SESSION_MARKER_KEY, signedIn ? 'true' : 'false');
  } catch {
    // Authentication must still work when storage is unavailable.
  }
}

async function queueWelcome(userId: string, accessToken: string) {
  if (welcomeQueuedUserId === userId) return;
  welcomeQueuedUserId = userId;
  const response = await fetch('/api/email/welcome', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) welcomeQueuedUserId = null;
}

function acceptUser(user: User | null, accessToken?: string) {
  markSession(Boolean(user));
  publishAuth({ user, loading: false });
  if (!user) {
    ensuredUserId = null;
    welcomeQueuedUserId = null;
  }
  if (user && ensuredUserId !== user.id) {
    ensuredUserId = user.id;
    void ensureProfileForUser(user)
      .then(() => accessToken ? queueWelcome(user.id, accessToken) : undefined)
      .catch(() => {
        ensuredUserId = null;
      // Profile repair and welcome enqueue are best effort and must never turn a valid session into a logout.
      });
  }
}

function startAuth() {
  if (authStarted || typeof window === 'undefined') return;
  authStarted = true;

  const fallback = window.setTimeout(() => {
    if (authSnapshot.loading) publishAuth({ user: authSnapshot.user, loading: false });
  }, 3500);

  void supabase.auth.getSession()
    .then(({ data }) => {
      window.clearTimeout(fallback);
      acceptUser(data.session?.user ?? null, data.session?.access_token);
    })
    .catch(() => {
      window.clearTimeout(fallback);
      acceptUser(null);
    });

  supabase.auth.onAuthStateChange((_event, session) => {
    window.clearTimeout(fallback);
    acceptUser(session?.user ?? null, session?.access_token);
  });
}

function subscribe(listener: () => void) {
  authListeners.add(listener);
  startAuth();
  return () => authListeners.delete(listener);
}

function getAuthSnapshot() {
  return authSnapshot;
}

function getServerAuthSnapshot() {
  return INITIAL_AUTH_SNAPSHOT;
}

export function useAuth() {
  return useSyncExternalStore(subscribe, getAuthSnapshot, getServerAuthSnapshot);
}
