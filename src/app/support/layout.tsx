import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/metadata';
import { TopbarSectionBack } from '@/components/TopbarSectionBack';

export const metadata = buildPageMetadata({
  title: 'Support',
  description: 'Search 44OS help for accounts, Library, purchases, Merch, Community, creator tools, safety, and policies.',
  path: '/support',
});

export default function SupportLayout({ children }: { children: ReactNode }) {
  return <>
    <TopbarSectionBack rootHref="/support" rootLabel="Support" />
    {children}
  </>;
}
