import { notFound } from 'next/navigation';
import StoreApp from '@/components/StoreApp';
import { isStoreCategory, type StoreCategory } from '@/lib/storeRoutes';
import { buildPageMetadata } from '@/lib/metadata';

const CATEGORY_METADATA: Record<Exclude<StoreCategory, 'all'>, { title: string; description: string }> = {
  music: {
    title: 'Music',
    description: 'Explore albums, EPs, singles, and evolving releases from independent creators on 44OS.',
  },
  books: {
    title: 'Books',
    description: 'Explore art books, poetry, stories, and digital publishing from independent creators on 44OS.',
  },
  assets: {
    title: 'Assets',
    description: 'Explore assets, remix stems, presets, and creative tools from independent creators on 44OS.',
  },
  games: {
    title: 'Games',
    description: 'Explore games and interactive releases from independent creators on 44OS.',
  },
  merch: {
    title: 'Merch',
    description: 'Explore apparel, accessories, and physical goods from independent creators on 44OS.',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isStoreCategory(category) || category === 'all') return buildPageMetadata({ title: 'Browse', path: '/store' });
  return buildPageMetadata({
    ...CATEGORY_METADATA[category],
    path: `/store/${category}`,
  });
}

export default async function StoreCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isStoreCategory(category) || category === 'all') notFound();
  return <StoreApp category={category as StoreCategory} />;
}
