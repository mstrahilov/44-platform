import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Log In',
  description: 'Log in to 44OS to access your Library, profile, Studio, and settings.',
  path: '/login',
});

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
