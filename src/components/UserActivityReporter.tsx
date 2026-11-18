'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';

const ACTIVITY_REPORT_INTERVAL_MS = 5 * 60 * 1000;

/** Records a lightweight, authenticated activity heartbeat for web and desktop. */
export function UserActivityReporter() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user || typeof window === 'undefined') return;
    const storageKey = `44-last-active:${user.id}`;
    let sending = false;

    async function reportIfDue() {
      if (document.visibilityState !== 'visible' || sending) return;

      let lastReported = 0;
      try {
        lastReported = Number(window.localStorage.getItem(storageKey)) || 0;
      } catch {
        // Continue without local throttling if storage is unavailable.
      }
      if (Date.now() - lastReported < ACTIVITY_REPORT_INTERVAL_MS) return;

      sending = true;
      try {
        window.localStorage.setItem(storageKey, String(Date.now()));
      } catch {
        // The database function also throttles writes across devices.
      }

      try {
        const { error } = await supabase.rpc('record_current_user_activity');
        if (error) throw error;
      } catch {
        try { window.localStorage.removeItem(storageKey); } catch { /* Best effort retry on next focus. */ }
      } finally {
        sending = false;
      }
    }

    void reportIfDue();
    const heartbeat = window.setInterval(reportIfDue, ACTIVITY_REPORT_INTERVAL_MS);
    window.addEventListener('focus', reportIfDue);
    window.addEventListener('pageshow', reportIfDue);
    document.addEventListener('visibilitychange', reportIfDue);
    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('focus', reportIfDue);
      window.removeEventListener('pageshow', reportIfDue);
      document.removeEventListener('visibilitychange', reportIfDue);
    };
  }, [loading, user?.id]);

  return null;
}
