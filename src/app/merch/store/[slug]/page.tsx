'use client';

import { useParams } from 'next/navigation';
import { ProductStoreDetail } from '@/app/product/[id]/page';

export default function MerchStoreItemPage() {
  const { slug } = useParams<{ slug: string }>();
  return <ProductStoreDetail identifier={slug} backHref="/merch/store" backLabel="Merch Store" merchPage />;
}
