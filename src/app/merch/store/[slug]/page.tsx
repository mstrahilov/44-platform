import { permanentRedirect } from 'next/navigation';

export default async function LegacyMerchStoreItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/store/item/${slug}`);
}
