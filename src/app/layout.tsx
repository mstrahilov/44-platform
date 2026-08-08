import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './surface-base.css';
import './analytics-consent.css';
import { absoluteAppUrl, getAppMetadataBaseUrl } from '@/lib/metadata';
import { getMarketingUrl } from '@/lib/siteUrl';
import AnalyticsConsentBoundary from '@/components/AnalyticsConsent';
import { getAnalyticsMeasurementId } from '@/lib/analyticsConfig';

const AUTH_HANDOFF_BOOTSTRAP = `(function(){try{
  var search=new URLSearchParams(location.search);
  var hash=new URLSearchParams(location.hash.slice(1));
  var queryKeys=['code','token_hash','type','error','error_code','error_description'];
  var hashKeys=['access_token','refresh_token','expires_in','expires_at','token_type','type','error','error_code','error_description'];
  var isAuth=queryKeys.some(function(key){return search.has(key);})||hashKeys.some(function(key){return hash.has(key);});
  if(isAuth){location.replace(${JSON.stringify(absoluteAppUrl('/'))}+location.search+location.hash);}
}catch(e){}})();`;

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
      { url: '/favicon.ico?v=20260724', sizes: 'any' },
      { url: '/icon-192.png?v=20260724', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png?v=20260724', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-touch-icon.png?v=20260724', sizes: '180x180', type: 'image/png' },
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
    title: '44 · Independent creative work, in one place',
    description,
    alternates: { canonical: `${marketingUrl}/` },
    applicationName: '44',
    manifest: null,
    appleWebApp: false,
    icons: {
      icon: [{ url: '/favicon.ico?v=20260724', sizes: 'any' }],
      apple: [{ url: '/apple-touch-icon.png?v=20260724', sizes: '180x180', type: 'image/png' }],
    },
    openGraph: {
      title: 'A platform for independent creative work.',
      description,
      url: `${marketingUrl}/`,
      siteName: '44',
      type: 'website',
      images: [{ url: `${marketingUrl}/og.png`, width: 1200, height: 630, alt: '44' }],
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
  const { default: ApplicationShell } = await import('./ApplicationShell');
  return <ApplicationShell analyticsMeasurementId={analyticsMeasurementId}>{children}</ApplicationShell>;
}
