import { redirect } from 'next/navigation';

export default function MerchOrdersPage() {
  redirect('/account?tab=orders');
}
