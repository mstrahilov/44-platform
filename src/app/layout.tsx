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
      <body>
        {/* ── ambient orbs ── */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        }}>
          <div style={{
            position: 'absolute',
            width: 800, height: 800,
            background: 'rgba(30,60,160,0.18)',
            filter: 'blur(180px)',
            borderRadius: '50%',
            bottom: -250, left: -200,
          }} />
          <div style={{
            position: 'absolute',
            width: 700, height: 700,
            background: 'rgba(10,80,200,0.14)',
            filter: 'blur(180px)',
            borderRadius: '50%',
            top: -150, right: -150,
          }} />
          <div style={{
            position: 'absolute',
            width: 600, height: 600,
            background: 'rgba(20,100,180,0.10)',
            filter: 'blur(160px)',
            borderRadius: '50%',
            top: '50%', left: '45%',
            transform: 'translate(-50%,-50%)',
          }} />
        </div>

        {/* ── app shell ── */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}>
          <Nav />
          <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
