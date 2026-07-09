'use client';

import { useParams } from 'next/navigation';
import { LibraryItemDetail } from '@/app/library/item/[kind]/[id]/page';

export default function AssetsLibraryItemPage() {
  const { id } = useParams<{ id: string }>();
  return <LibraryItemDetail kind="product" id={id} backHref="/library/assets" backLabel="Sample Pack Library" />;
}
