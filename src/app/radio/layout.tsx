import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Radio',
  description: 'Tune in to 44 Radio, a live listening surface for independent releases.',
  path: '/radio',
});

export default function RadioLayout({ children }: { children: ReactNode }) {
  return children;
}
