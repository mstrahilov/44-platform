import { LibraryItemDetail } from '@/components/LibraryItemDetail';

export const dynamic = 'force-dynamic';

export default async function LibraryItemCanonicalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LibraryItemDetail kind="product" id={id} backHref="/library" backLabel="Library" />;
}
