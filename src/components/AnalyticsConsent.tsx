'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_READY_EVENT,
  getAnalyticsConsent,
  setAnalyticsConsent,
  trackBrowserAnalyticsEvent,
  type AnalyticsConsent,
} from '@/lib/analytics';

const GOOGLE_TAG_ORIGIN = 'https://www.googletagmanager.com';

export default function AnalyticsConsentBoundary({ measurementId }: { measurementId: string | null }) {
  const pathname = usePathname();
  const consent = useAnalyticsConsent();

  useEffect(() => {
    if (!measurementId) return;
    if (consent === 'granted') enableAnalytics(measurementId);
    else disableAnalytics(measurementId);
  }, [consent, measurementId]);

  useEffect(() => {
    if (!measurementId || consent !== 'granted') return;
    const sendPageView = () => trackBrowserAnalyticsEvent('page_view', {
      page_path: pathname || '/',
      page_title: document.title || '44OS',
    });
    if (window.__44osAnalyticsReady) sendPageView();
    else window.addEventListener(ANALYTICS_READY_EVENT, sendPageView, { once: true });
    return () => window.removeEventListener(ANALYTICS_READY_EVENT, sendPageView);
  }, [consent, measurementId, pathname]);

  if (!measurementId || consent !== 'unset') return null;
  return <aside className="analytics-consent" aria-label="Analytics privacy choice">
    <div className="analytics-consent-copy">
      <strong>Help improve 44OS?</strong>
      <p>Optional analytics can measure how people use public features. Necessary account, security, Cart, and playback storage works either way.</p>
      <Link href="/legal/privacy#analytics">Privacy details</Link>
    </div>
    <div className="analytics-consent-actions">
      <button type="button" className="os-button os-button-secondary os-button-compact" onClick={() => setAnalyticsConsent('denied')}>Decline</button>
      <button type="button" className="os-button os-button-primary os-button-compact" onClick={() => setAnalyticsConsent('granted')}>Allow analytics</button>
    </div>
  </aside>;
}

export function AnalyticsPrivacyControls({ measurementId }: { measurementId: string | null }) {
  const consent = useAnalyticsConsent();

  if (!measurementId) return <p className="analytics-preferences-status">Optional Google Analytics measurement is currently disabled.</p>;
  return <div className="analytics-preferences" aria-label="Analytics preferences">
    <p className="analytics-preferences-status" role="status">Current choice: {consent === 'granted' ? 'Allowed' : consent === 'denied' ? 'Declined' : 'Not selected'}</p>
    <div className="analytics-consent-actions">
      <button type="button" className="os-button os-button-secondary os-button-compact" onClick={() => setAnalyticsConsent('denied')}>Decline analytics</button>
      <button type="button" className="os-button os-button-primary os-button-compact" onClick={() => setAnalyticsConsent('granted')}>Allow analytics</button>
    </div>
  </div>;
}

function useAnalyticsConsent() {
  return useSyncExternalStore(subscribeToConsent, getAnalyticsConsent, getServerConsent);
}

function subscribeToConsent(callback: () => void) {
  window.addEventListener(ANALYTICS_CONSENT_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(ANALYTICS_CONSENT_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getServerConsent(): AnalyticsConsent {
  return 'unset';
}

function ensureGtag() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => { window.dataLayer?.push(args); });
  return window.gtag;
}

function enableAnalytics(measurementId: string) {
  const gtag = ensureGtag();
  gtag('consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  });
  gtag('set', 'ads_data_redaction', true);
  gtag('consent', 'update', {
    analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  });
  window[`ga-disable-${measurementId}` as keyof Window] = false as never;
  if (!document.querySelector(`script[data-44os-analytics="${measurementId}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `${GOOGLE_TAG_ORIGIN}/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.dataset['44osAnalytics'] = measurementId;
    script.addEventListener('load', () => {
      gtag('js', new Date());
      gtag('config', measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
      window.__44osAnalyticsReady = true;
      window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
    }, { once: true });
    document.head.appendChild(script);
  } else if (window.__44osAnalyticsReady) {
    window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
  }
}

function disableAnalytics(measurementId: string) {
  const gtag = ensureGtag();
  gtag('consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  });
  gtag('consent', 'update', {
    analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  });
  window[`ga-disable-${measurementId}` as keyof Window] = true as never;
  window.__44osAnalyticsReady = false;
  clearAnalyticsCookies();
}

function clearAnalyticsCookies() {
  const names = document.cookie.split(';').map(value => value.split('=', 1)[0].trim()).filter(name => name === '_ga' || name.startsWith('_ga_'));
  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.44os.com; SameSite=Lax`;
  }
}
