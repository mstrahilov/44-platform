import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Support',
  description: 'Find help for account access, orders, Library, Dock settings, Radio, creator tools, and troubleshooting.',
  path: '/support',
});

export default function SupportLayout({ children }: { children: ReactNode }) {
  return children;
}
