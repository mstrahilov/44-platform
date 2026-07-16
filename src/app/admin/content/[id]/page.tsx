import AdminContentDetailApp from '@/components/admin/AdminContentDetailApp';

export default async function AdminContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminContentDetailApp itemId={id} />;
}
