import { notFound, permanentRedirect } from 'next/navigation';
import { isStoreCategory } from '@/lib/storeRoutes';

export default async function BrowseCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isStoreCategory(category) || category === 'all') notFound();
  permanentRedirect(`/store/${category}`);
}
