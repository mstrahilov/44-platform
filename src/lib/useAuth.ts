'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ensureProfileForUser } from '@/lib/studioProfiles';

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

    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) return;
      settled = true;
      window.clearTimeout(fallback);
      if (data.user) {
        await ensureProfileForUser(data.user);
      }
      setUser(data.user);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      settled = true;
      window.clearTimeout(fallback);
      setUser(null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
