import { redirect } from 'next/navigation';

export default async function LegacyLibraryCategoryRedirect({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  redirect(`/collection/${category}`);
}
