import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Questions',
  description: 'Ask questions and exchange practical knowledge with the 44OS creative community.',
  path: '/community/questions',
});

export default function QuestionsLayout({ children }: { children: ReactNode }) {
  return children;
}
