import AdminPersonDetailApp from '@/components/admin/AdminPersonDetailApp';

export default async function AdminPersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminPersonDetailApp profileId={id} />;
}
