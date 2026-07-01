import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import ThemeSync from '@/components/ThemeSync';

// Applies the saved theme before first paint to avoid a flash of the wrong theme.
const THEME_BOOTSTRAP = `(function(){try{
  var m = localStorage.getItem('44-theme-mode') || 'dark';
  var a = localStorage.getItem('44-theme-accent') || 'amber';
  var resolved = m === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : m;
  document.body.className = 'theme-' + resolved + ' accent-' + a;
}catch(e){}})();`;

export const metadata: Metadata = {
  title: '44',
  description: 'A platform for independent creative work.',
  icons: {
    icon: process.env.VERCEL ? '/favicon-live.svg' : '/favicon-local.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="theme-dark accent-amber" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <ThemeSync />

        <div className="app-environment" aria-hidden="true">
          <div className="app-environment-image" />
          <div className="app-environment-veil" />
          <div className="app-environment-noise" />
        </div>

        <div className="app-shell">
          <Sidebar />
          <main className="app-main">
            {children}
          </main>
        </div>

      </body>
    </html>
  );
}
