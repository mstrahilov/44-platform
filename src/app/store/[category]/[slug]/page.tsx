import { notFound, permanentRedirect } from 'next/navigation';
import { isStoreCategory } from '@/lib/storeRoutes';

export default async function StoreItemPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;
  if (!isStoreCategory(category) || category === 'all') notFound();
  permanentRedirect(`/browse/item/${slug}`);
}
