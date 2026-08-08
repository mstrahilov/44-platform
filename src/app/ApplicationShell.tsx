import { Suspense, type ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { TopbarProvider } from '@/components/TopbarContext';
import { MusicPlayerBar, MusicPlayerProvider } from '@/components/MusicPlayer';
import ThemeSync from '@/components/ThemeSync';
import SystemShell from '@/components/SystemShell';
import { ContextMenuProvider } from '@/components/ContextMenu';
import AnalyticsConsentBoundary from '@/components/AnalyticsConsent';
import { MarketPreferenceSync } from '@/components/MarketPreferenceSync';
import { WebPushNotificationPrompt } from '@/components/WebPushNotifications';
import { absoluteAppUrl } from '@/lib/metadata';
import { getMarketingUrl } from '@/lib/siteUrl';
import { DesktopMenuNavigation } from '@/components/DesktopMenuNavigation';

const THEME_BOOTSTRAP = `(function(){try{
  localStorage.removeItem('44-theme-mode');
  localStorage.removeItem('44-theme-accent');
  document.body.className = 'theme-dark accent-ocean';
}catch(e){}})();`;

const SITE_IDENTITY_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${absoluteAppUrl('/')}#website`,
  name: '44OS',
  alternateName: '44 OS',
  url: absoluteAppUrl('/'),
  publisher: {
    '@type': 'Organization',
    '@id': `${getMarketingUrl()}/#organization`,
    name: '44OS',
    alternateName: 'forty four',
    url: `${getMarketingUrl()}/`,
    logo: `${getMarketingUrl()}/icon-512.png`,
  },
}).replace(/</g, '\\u003c');

export default function ApplicationShell({
  analyticsMeasurementId,
  children,
}: {
  analyticsMeasurementId: string | null;
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* The application-only generated sheet must not be hoisted into marketing by Next. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/_surface/44os-app.css?v=20260807-v12d" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SITE_IDENTITY_JSON_LD }} />
      </head>
      <body className="theme-dark accent-ocean" suppressHydrationWarning>
        <ThemeSync />
        <MarketPreferenceSync />
        <AnalyticsConsentBoundary measurementId={analyticsMeasurementId} />
        <WebPushNotificationPrompt />
        <DesktopMenuNavigation />

        <div className="app-environment" aria-hidden="true">
          <div className="app-environment-image" />
          <div className="app-environment-veil" />
          <div className="app-environment-noise" />
        </div>

        <MusicPlayerProvider>
          <TopbarProvider>
            <ContextMenuProvider>
              <SystemShell />
              <div className="app-frame">
                <div className="app-shell">
                  <Suspense fallback={null}><Sidebar /></Suspense>
                  <div className="app-main">
                    <Topbar />
                    <div className="app-main-content">{children}</div>
                    <MusicPlayerBar />
                  </div>
                </div>
              </div>
            </ContextMenuProvider>
          </TopbarProvider>
        </MusicPlayerProvider>
      </body>
    </html>
  );
}
