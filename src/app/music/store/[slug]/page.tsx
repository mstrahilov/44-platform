import { permanentRedirect } from 'next/navigation';

export default async function LegacyMusicStoreItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/browse/item/${slug}`);
}
