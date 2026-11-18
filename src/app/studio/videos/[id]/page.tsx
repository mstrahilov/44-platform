import { StudioVideoEditor } from '@/components/StudioVideoEditor';

export default async function EditVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudioVideoEditor videoId={id} />;
}
