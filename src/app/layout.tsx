import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { TopbarProvider } from '@/components/TopbarContext';
import { MusicPlayerBar, MusicPlayerProvider } from '@/components/MusicPlayer';
import ThemeSync from '@/components/ThemeSync';
import SystemShell from '@/components/SystemShell';
import { ContextMenuProvider } from '@/components/ContextMenu';

// Applies the saved theme before first paint to avoid a flash of the wrong theme.
const THEME_BOOTSTRAP = `(function(){try{
  var m = localStorage.getItem('44-theme-mode') || 'light';
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
      <body className="theme-light accent-amber" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <ThemeSync />

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
                <Sidebar />
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
          </TopbarProvider>
        </MusicPlayerProvider>

      </body>
    </html>
  );
}
