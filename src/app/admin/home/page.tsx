import type { Metadata } from 'next';
import AdminHomeApp from '@/components/admin/AdminHomeApp';

export const metadata: Metadata = {
  title: 'Home editorial · Admin · 44',
  robots: { index: false, follow: false },
};

export default function AdminHomePage() {
  return <AdminHomeApp />;
}
