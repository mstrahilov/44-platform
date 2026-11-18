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
  try {
    const response = await fetch('/api/email/welcome', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
    if (response.ok) return;
  } catch {
    // A later auth update can retry the queue request.
  }
  if (welcomeQueuedUserId === userId) welcomeQueuedUserId = null;
  throw new Error('Could not queue the welcome email.');
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
    // Release the Supabase auth callback before making any dependent requests.
    window.setTimeout(() => {
      if (authSnapshot.user?.id !== user.id) return;
      void ensureProfileForUser(user)
        .then(({ error }) => {
          if (error) throw error;
          if (accessToken && authSnapshot.user?.id === user.id) return queueWelcome(user.id, accessToken);
        })
        .catch(() => {
          if (ensuredUserId === user.id) ensuredUserId = null;
        });
    }, 0);
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
