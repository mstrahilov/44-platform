'use client';

import { useParams } from 'next/navigation';
import { ProductStoreDetail } from '@/app/product/[id]/page';

export default function AssetsStoreItemPage() {
  const { slug } = useParams<{ slug: string }>();
  return <ProductStoreDetail identifier={slug} backHref="/assets/store" backLabel="Assets Store" />;
}
