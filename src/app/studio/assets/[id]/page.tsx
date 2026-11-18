import { AssetStudioForm } from '@/components/AssetStudioForm';

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssetStudioForm itemId={id} />;
}
