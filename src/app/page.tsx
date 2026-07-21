import StoreApp from '@/components/StoreApp';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: '44OS',
    description: 'Discover, collect, create, and connect through independent music, books, art, community, and radio.',
    path: '/',
  }),
  // The visible application section remains "Discover". The document and
  // shared-link identity are the product name rather than the section name.
  title: { absolute: '44OS' },
};

export default function HomeRootPage() {
  return <StoreApp category="all" frontDoor />;
}
