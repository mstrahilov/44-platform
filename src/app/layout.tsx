import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import '@/styles/44-ui/canonical-system.css';
import Sidebar from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { TopbarProvider } from '@/components/TopbarContext';
import { MusicPlayerBar, MusicPlayerProvider } from '@/components/MusicPlayer';
import ThemeSync from '@/components/ThemeSync';
import SystemShell from '@/components/SystemShell';
import { ContextMenuProvider } from '@/components/ContextMenu';
import { MobileMenuProvider } from '@/components/MobileMenuContext';
import { Suspense } from 'react';
import { absoluteAppUrl, getAppMetadataBaseUrl } from '@/lib/metadata';
import { getMarketingUrl } from '@/lib/siteUrl';
import AnalyticsConsentBoundary from '@/components/AnalyticsConsent';
import { getAnalyticsMeasurementId } from '@/lib/analyticsConfig';
import { MarketPreferenceSync } from '@/components/MarketPreferenceSync';
import { WebPushNotificationPrompt } from '@/components/WebPushNotifications';

// Applies the saved theme before first paint to avoid a flash of the wrong theme.
const THEME_BOOTSTRAP = `(function(){try{
  localStorage.removeItem('44-theme-mode');
  localStorage.removeItem('44-theme-accent');
  document.body.className = 'theme-dark accent-ocean';
}catch(e){}})();`;

const AUTH_HANDOFF_BOOTSTRAP = `(function(){try{
  var search=new URLSearchParams(location.search);
  var hash=new URLSearchParams(location.hash.slice(1));
  var queryKeys=['code','token_hash','type','error','error_code','error_description'];
  var hashKeys=['access_token','refresh_token','expires_in','expires_at','token_type','type','error','error_code','error_description'];
  var isAuth=queryKeys.some(function(key){return search.has(key);})||hashKeys.some(function(key){return hash.has(key);});
  if(isAuth){location.replace(${JSON.stringify(absoluteAppUrl('/'))}+location.search+location.hash);}
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

const APPLICATION_METADATA: Metadata = {
  metadataBase: new URL(getAppMetadataBaseUrl()),
  title: {
    default: '44OS',
    template: '%s · 44OS',
  },
  description: 'A creative operating system to discover, collect, create, and connect through independent music, books, art, community, and radio.',
  alternates: {
    canonical: absoluteAppUrl('/'),
  },
  manifest: '/manifest.webmanifest',
  applicationName: '44OS',
  appleWebApp: {
    capable: true,
    title: '44OS',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/favicon.png?v=20260720', sizes: '400x400', type: 'image/png' },
    ],
  },
  openGraph: {
    title: '44OS',
    description: 'A creative operating system to discover, collect, create, and connect through independent music, books, art, community, and radio.',
    url: absoluteAppUrl('/'),
    siteName: '44OS',
    type: 'website',
    images: [
      {
        url: absoluteAppUrl('/og.png'),
        width: 1200,
        height: 630,
        alt: '44OS',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '44OS',
    description: 'A creative operating system to discover, collect, create, and connect through independent music, books, art, community, and radio.',
    images: [absoluteAppUrl('/og.png')],
  },
};

const APPLICATION_VIEWPORT: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b0b0b',
};

function marketingMetadata(): Metadata {
  const marketingUrl = getMarketingUrl();
  const description = 'Music, books, merch, and creative assets from independent artists, all in one place.';
  return {
    metadataBase: new URL(marketingUrl),
    title: '44OS · Independent creative work, in one place',
    description,
    alternates: { canonical: `${marketingUrl}/` },
    applicationName: '44OS',
    manifest: null,
    appleWebApp: false,
    icons: {
      icon: [{ url: '/favicon.ico', sizes: 'any' }],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    openGraph: {
      title: 'A platform for independent creative work.',
      description,
      url: `${marketingUrl}/`,
      siteName: '44OS',
      type: 'website',
      images: [{ url: `${marketingUrl}/og.png`, width: 1200, height: 630, alt: '44OS' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'A platform for independent creative work.',
      description,
      images: [`${marketingUrl}/og.png`],
    },
  };
}

async function isMarketingRequest() {
  return (await headers()).get('x-44os-surface') === 'marketing';
}

export async function generateMetadata(): Promise<Metadata> {
  return await isMarketingRequest() ? marketingMetadata() : APPLICATION_METADATA;
}

export async function generateViewport(): Promise<Viewport> {
  return await isMarketingRequest()
    ? { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#F5F5F0' }
    : APPLICATION_VIEWPORT;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const marketing = await isMarketingRequest();
  const analyticsMeasurementId = getAnalyticsMeasurementId();
  if (marketing) {
    return (
      <html lang="en">
        <head><script dangerouslySetInnerHTML={{ __html: AUTH_HANDOFF_BOOTSTRAP }} /></head>
        <body className="marketing-surface">
          <AnalyticsConsentBoundary measurementId={analyticsMeasurementId} />
          {children}
        </body>
      </html>
    );
  }
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SITE_IDENTITY_JSON_LD }} />
      </head>
      <body className="theme-dark accent-ocean" suppressHydrationWarning>
        <ThemeSync />
        <MarketPreferenceSync />
        <AnalyticsConsentBoundary measurementId={analyticsMeasurementId} />
        <WebPushNotificationPrompt />

        <div className="app-environment" aria-hidden="true">
          <div className="app-environment-image" />
          <div className="app-environment-veil" />
          <div className="app-environment-noise" />
        </div>

        <MusicPlayerProvider>
          <TopbarProvider>
           <MobileMenuProvider>
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
           </MobileMenuProvider>
          </TopbarProvider>
        </MusicPlayerProvider>

      </body>
    </html>
  );
}
