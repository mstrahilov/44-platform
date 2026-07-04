import { redirect } from 'next/navigation';

export default async function LegacyProfileRedirect({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  redirect(`/community/profile/${username}`);
}
