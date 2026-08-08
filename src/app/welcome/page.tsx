import type { Metadata } from 'next';
import WelcomeApp from '@/components/WelcomeApp';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Welcome',
    description: 'A concise introduction to your 44 account and creative space.',
    path: '/welcome',
  }),
  robots: { index: false, follow: false },
};

export default function WelcomePage() {
  return <WelcomeApp />;
}
