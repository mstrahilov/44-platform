import StoreApp from '@/components/StoreApp';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Store',
  description: 'Discover, collect, create, and connect through independent music, books, art, community, and radio.',
  path: '/',
});

export default function HomeRootPage() {
  return <StoreApp category="all" frontDoor />;
}
