import { redirect } from 'next/navigation';

export default function MerchOrdersPage() {
  redirect('/settings?tab=account');
}
