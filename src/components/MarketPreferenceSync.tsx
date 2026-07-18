'use client';

import { useEffect, useState } from 'react';
import { getProfileMarketPreferences } from '@/lib/domain/profiles';
import {
  getStoredViewerCountry,
  getStoredViewerCurrency,
  setStoredViewerPreferences,
  VIEWER_MARKET_CHANGE_EVENT,
} from '@/lib/marketPreferences';
import { useAuth } from '@/lib/useAuth';

export function MarketPreferenceSync() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    let alive = true;
    void getProfileMarketPreferences(user.id).then(preferences => {
      if (alive && preferences?.country_code) setStoredViewerPreferences(preferences.country_code);
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [loading, user]);

  return null;
}

export function useViewerMarket() {
  const [market, setMarket] = useState(() => ({
    countryCode: getStoredViewerCountry(),
    currency: getStoredViewerCurrency(),
  }));

  useEffect(() => {
    function sync() {
      setMarket({
        countryCode: getStoredViewerCountry(),
        currency: getStoredViewerCurrency(),
      });
    }
    sync();
    window.addEventListener(VIEWER_MARKET_CHANGE_EVENT, sync);
    return () => window.removeEventListener(VIEWER_MARKET_CHANGE_EVENT, sync);
  }, []);

  return market;
}
