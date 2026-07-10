import { ProductStoreDetail } from '@/app/product/[id]/page';

export default async function BrowseItemPage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;

  return (
    <ProductStoreDetail
      identifier={identifier}
      backHref="/browse"
      backLabel="Browse"
    />
  );
}
