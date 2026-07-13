import { BookReader } from '@/components/BookReader';

export const dynamic = 'force-dynamic';

export default async function ReaderPage({ params, searchParams }: { params: Promise<{ itemId: string }>; searchParams: Promise<{ mode?: string; returnTo?: string }> }) {
  const [{ itemId }, query] = await Promise.all([params, searchParams]);
  const returnTo = query.returnTo?.startsWith('/') && !query.returnTo.startsWith('//') ? query.returnTo : undefined;
  return <BookReader itemId={itemId} mode={query.mode === 'sample' ? 'sample' : 'full'} returnTo={returnTo} />;
}
