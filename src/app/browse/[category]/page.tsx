import { notFound } from 'next/navigation';
import StoreApp from '@/components/StoreApp';
import { isStoreCategory, type StoreCategory } from '@/lib/storeRoutes';

export default async function BrowseCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isStoreCategory(category) || category === 'all') notFound();
  return <StoreApp category={category as StoreCategory} />;
}
