import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Community',
  description: 'Join posts, questions, and collaboration threads from creators and fans on 44OS.',
  path: '/community',
});

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return children;
}
