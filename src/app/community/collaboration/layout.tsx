import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Collaboration',
  description: 'Find collaborators, share opportunities, and build creative work together on 44OS.',
  path: '/community/collaboration',
});

export default function CollaborationLayout({ children }: { children: ReactNode }) {
  return children;
}
