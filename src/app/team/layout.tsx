import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/inter/wght.css';
import { TopbarSectionBack } from '@/components/TopbarSectionBack';

export const metadata: Metadata = {
  title: 'Team',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};

export default function TeamLayout({ children }: { children: ReactNode }) {
  return <><TopbarSectionBack rootHref="/team" rootLabel="Team" />{children}</>;
}
