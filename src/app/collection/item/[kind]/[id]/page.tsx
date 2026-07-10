import { permanentRedirect } from 'next/navigation';

export default async function LegacyLibraryItemRedirect({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/library/item/${id}`);
}
