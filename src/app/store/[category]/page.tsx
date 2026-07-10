import { notFound, permanentRedirect } from 'next/navigation';
import { isStoreCategory } from '@/lib/storeRoutes';

export default async function StoreCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isStoreCategory(category) || category === 'all') notFound();
  permanentRedirect(`/browse/${category}`);
}
