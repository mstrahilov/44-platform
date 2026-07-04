'use client';

import { useParams } from 'next/navigation';
import { ProductStoreDetail } from '@/app/product/[id]/page';

export default function MusicStoreItemPage() {
  const { slug } = useParams<{ slug: string }>();
  return <ProductStoreDetail identifier={slug} backHref="/music/store" backLabel="Music Store" releasePage />;
}
