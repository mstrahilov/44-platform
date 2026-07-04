import { redirect } from 'next/navigation';

export default async function LegacyInboxRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') query.set(key, value);
    else if (Array.isArray(value)) value.forEach(entry => query.append(key, entry));
  }
  const suffix = query.toString();
  redirect(`/community/messages${suffix ? `?${suffix}` : ''}`);
}
