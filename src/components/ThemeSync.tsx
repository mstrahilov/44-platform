'use client';

import { useEffect, useRef } from 'react';
import {
  applyTheme,
  DEFAULT_THEME_ACCENT,
  DEFAULT_THEME_MODE,
  isThemeAccent,
  isThemeMode,
  type ThemeAccent,
  type ThemeMode,
} from '@/lib/theme';
import { supabase } from '@/lib/supabase';

// Signed-out chrome is always dark/ocean. Signed-in preferences come only from
// Supabase so the same account has the same theme on every device.
export default function ThemeSync() {
  const signedInRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const modeRef = useRef<ThemeMode>(DEFAULT_THEME_MODE);
  const accentRef = useRef<ThemeAccent>(DEFAULT_THEME_ACCENT);

  useEffect(() => {
    let alive = true;

    function applyDefaultTheme() {
      signedInRef.current = false;
      userIdRef.current = null;
      modeRef.current = DEFAULT_THEME_MODE;
      accentRef.current = DEFAULT_THEME_ACCENT;
      applyTheme(DEFAULT_THEME_MODE, DEFAULT_THEME_ACCENT);
    }

    async function applyForSession(userId: string | null) {
      if (!userId) {
        applyDefaultTheme();
        return;
      }

      signedInRef.current = true;
      userIdRef.current = userId;
      const { data } = await supabase
        .from('user_theme_preferences')
        .select('theme_mode, theme_accent')
        .eq('user_id', userId)
        .maybeSingle();
      if (!alive || !signedInRef.current || userIdRef.current !== userId) return;

      if (!data) {
        await supabase.from('user_theme_preferences').upsert({
          user_id: userId,
          theme_mode: DEFAULT_THEME_MODE,
          theme_accent: DEFAULT_THEME_ACCENT,
        });
        if (!alive || !signedInRef.current || userIdRef.current !== userId) return;
      }

      const mode = isThemeMode(data?.theme_mode) ? data.theme_mode : DEFAULT_THEME_MODE;
      const accent = isThemeAccent(data?.theme_accent) ? data.theme_accent : DEFAULT_THEME_ACCENT;
      modeRef.current = mode;
      accentRef.current = accent;
      applyTheme(mode, accent);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      void applyForSession(data.session?.user.id ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyForSession(session?.user.id ?? null);
    });

    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      if (signedInRef.current && modeRef.current === 'system') applyTheme('system', accentRef.current);
    };
    mq.addEventListener('change', onChange);
    return () => {
      alive = false;
      mq.removeEventListener('change', onChange);
      listener.subscription.unsubscribe();
    };
  }, []);

  return null;
}
