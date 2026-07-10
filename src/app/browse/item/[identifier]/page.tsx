import { permanentRedirect } from 'next/navigation';

export default async function BrowseItemPage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;

  permanentRedirect(`/store/item/${identifier}`);
}
