'use client';

import { useEffect } from 'react';
import { applyTheme, getStoredAccent, getStoredMode } from '@/lib/theme';

// Keeps the <body> theme classes in sync with the stored preference, and — when
// mode is "system" — re-applies whenever the OS light/dark setting changes.
export default function ThemeSync() {
  useEffect(() => {
    applyTheme(getStoredMode(), getStoredAccent());

    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      if (getStoredMode() === 'system') applyTheme('system', getStoredAccent());
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return null;
}
