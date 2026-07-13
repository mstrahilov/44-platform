import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Calendar',
  description: 'Creator events and upcoming releases across 44OS.',
  path: '/calendar',
});

export default function CalendarLayout({ children }: { children: ReactNode }) { return children; }
