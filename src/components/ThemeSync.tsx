'use client';

import { useEffect, useRef } from 'react';
import { applyTheme, getStoredAccent, getStoredMode } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

// Keeps the <body> theme classes in sync with the stored preference, and — when
// mode is "system" — re-applies whenever the OS light/dark setting changes.
export default function ThemeSync() {
  const signedInRef = useRef(false);

  useEffect(() => {
    let alive = true;

    function applyForSignedInState(signedIn: boolean) {
      signedInRef.current = signedIn;
      applyTheme(signedIn ? getStoredMode() : 'light', signedIn ? getStoredAccent() : 'amber');
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      applyForSignedInState(Boolean(data.session));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applyForSignedInState(Boolean(session));
    });

    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      if (signedInRef.current && getStoredMode() === 'system') applyTheme('system', getStoredAccent());
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
