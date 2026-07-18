import AdminMerchDetailApp from '@/components/admin/AdminMerchDetailApp';

export default async function AdminMerchDetailPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return <AdminMerchDetailApp itemId={itemId} />;
}
