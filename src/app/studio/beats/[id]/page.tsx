import { redirect } from 'next/navigation';

export default async function EditBeatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/studio/assets/${id}`);
}
