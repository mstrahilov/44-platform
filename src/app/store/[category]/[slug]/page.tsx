import { notFound } from 'next/navigation';
import { ProductStoreDetail } from '@/app/product/[id]/page';
import { isStoreCategory } from '@/lib/storeRoutes';

const BACK_LABEL: Record<string, string> = {
  music: 'Music',
  books: 'Books',
  assets: 'Assets',
  merch: 'Merch',
};

export default async function StoreItemPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;
  if (!isStoreCategory(category) || category === 'all') notFound();

  return (
    <ProductStoreDetail
      identifier={slug}
      backHref={`/store/${category}`}
      backLabel={BACK_LABEL[category] ?? 'Store'}
      releasePage={category === 'music'}
      merchPage={category === 'merch'}
    />
  );
}
