import { BeatStudioForm } from '@/components/BeatStudioForm';

export default async function EditBeatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BeatStudioForm itemId={id} />;
}
