import { permanentRedirect } from 'next/navigation';

export default async function LegacyLibraryCategoryRedirect({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  permanentRedirect(`/library/${category}`);
}
