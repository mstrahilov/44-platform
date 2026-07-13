import { BookReader } from '@/components/BookReader';

export const dynamic = 'force-dynamic';

export default async function ReaderPage({ params, searchParams }: { params: Promise<{ itemId: string }>; searchParams: Promise<{ mode?: string }> }) {
  const [{ itemId }, query] = await Promise.all([params, searchParams]);
  return <BookReader itemId={itemId} mode={query.mode === 'sample' ? 'sample' : 'full'} />;
}
