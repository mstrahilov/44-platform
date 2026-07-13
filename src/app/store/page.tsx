import StoreApp from '@/components/StoreApp';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Store',
  description: 'Find releases, books, sample packs, and merch from independent creators on 44OS.',
  path: '/store',
});

export default function StorePage() {
  return <StoreApp category="all" frontDoor />;
}
