import { notFound } from 'next/navigation';
import LibraryApp from '@/components/LibraryApp';
import { isLibraryCategory, type LibraryCategory } from '@/lib/libraryRoutes';

export const dynamic = 'force-dynamic';

export default async function LibraryCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isLibraryCategory(category) || category === 'all') notFound();
  return <LibraryApp category={category as LibraryCategory} />;
}
