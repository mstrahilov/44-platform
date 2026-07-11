import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Search',
  description: 'Find items, creators, posts, questions, and collaborations on 44OS.',
  path: '/search',
});

export default function SearchLayout({ children }: { children: ReactNode }) {
  return children;
}
