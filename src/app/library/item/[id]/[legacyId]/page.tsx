import { permanentRedirect } from 'next/navigation';

export default async function LegacyLibraryItemRedirect({ params }: { params: Promise<{ legacyId: string }> }) {
  const { legacyId } = await params;
  permanentRedirect(`/library/item/${legacyId}`);
}
