import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

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
      <body className="theme-amber theme-dark accent-amber">

        <div className="app-environment" aria-hidden="true">
          <div className="app-environment-image" />
          <div className="app-environment-veil" />
          <div className="app-environment-noise" />
        </div>

        <div className="app-shell">
          <Nav />
          <main className="app-main">
            {children}
          </main>
        </div>

      </body>
    </html>
  );
}
