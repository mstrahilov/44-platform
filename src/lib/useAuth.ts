'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ensureProfileForUser } from '@/lib/studioProfiles';

export const AUTH_SESSION_MARKER_KEY = '44-auth-session-present';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let settled = false;
    const fallback = window.setTimeout(() => {
      if (!mounted || settled) return;
      setLoading(false);
    }, 3500);

    function markSession(signedIn: boolean) {
      window.localStorage.setItem(AUTH_SESSION_MARKER_KEY, signedIn ? 'true' : 'false');
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      settled = true;
      window.clearTimeout(fallback);
      const sessionUser = data.session?.user ?? null;
      markSession(Boolean(sessionUser));
      if (sessionUser) {
        await ensureProfileForUser(sessionUser);
      }
      setUser(sessionUser);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      settled = true;
      window.clearTimeout(fallback);
      markSession(false);
      setUser(null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      markSession(Boolean(session?.user));
      if (session?.user) {
        await ensureProfileForUser(session.user);
      }
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      window.clearTimeout(fallback);
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
