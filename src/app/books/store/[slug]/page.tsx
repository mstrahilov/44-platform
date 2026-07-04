'use client';

import { useParams } from 'next/navigation';
import { ProductStoreDetail } from '@/app/product/[id]/page';

export default function BooksStoreItemPage() {
  const { slug } = useParams<{ slug: string }>();
  return <ProductStoreDetail identifier={slug} backHref="/books/store" backLabel="Books Store" />;
}
