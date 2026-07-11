import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { TopbarProvider } from '@/components/TopbarContext';
import { MusicPlayerBar, MusicPlayerProvider } from '@/components/MusicPlayer';
import ThemeSync from '@/components/ThemeSync';
import SystemShell from '@/components/SystemShell';
import { ContextMenuProvider } from '@/components/ContextMenu';
import { MobileMenuProvider } from '@/components/MobileMenuContext';
import { Suspense } from 'react';
import { absoluteMetadataUrl, getMetadataBaseUrl } from '@/lib/metadata';

// Applies the saved theme before first paint to avoid a flash of the wrong theme.
const THEME_BOOTSTRAP = `(function(){try{
  var signedIn = localStorage.getItem('44-auth-session-present') === 'true';
  var m = signedIn ? (localStorage.getItem('44-theme-mode') || 'light') : 'light';
  var a = signedIn ? (localStorage.getItem('44-theme-accent') || 'amber') : 'amber';
  var resolved = m === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : m;
  document.body.className = 'theme-' + resolved + ' accent-' + a;
}catch(e){}})();`;

export const metadata: Metadata = {
  metadataBase: new URL(getMetadataBaseUrl()),
  title: {
    default: '44OS',
    template: '%s · 44OS',
  },
  description: 'A creative operating system for independent releases, libraries, community, and radio.',
  alternates: {
    canonical: absoluteMetadataUrl('/store'),
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
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: '44OS',
    description: 'A creative operating system for independent releases, libraries, community, and radio.',
    url: absoluteMetadataUrl('/store'),
    siteName: '44OS',
    type: 'website',
    images: [
      {
        url: absoluteMetadataUrl('/og.png'),
        width: 1200,
        height: 630,
        alt: '44OS',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '44OS',
    description: 'A creative operating system for independent releases, libraries, community, and radio.',
    images: [absoluteMetadataUrl('/og.png')],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f6f0e7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="theme-light accent-amber" suppressHydrationWarning>
        <Script id="theme-bootstrap" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <ThemeSync />

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
                <Suspense fallback={null}>
                  <Sidebar />
                </Suspense>
                <main className="app-main">
                  <Topbar />
                  <div className="app-main-content">
                    {children}
                  </div>
                  <MusicPlayerBar />
                </main>
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
