import { LibraryMusicRelease } from '@/components/LibraryMusicRelease';

export const dynamic = 'force-dynamic';

export default async function LibraryMusicReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LibraryMusicRelease itemId={id} />;
}
