import { ProductStoreDetail } from '@/app/product/[id]/page';

export default async function StoreItemPage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  return <ProductStoreDetail identifier={identifier} backHref="/store" backLabel="Store" />;
}
