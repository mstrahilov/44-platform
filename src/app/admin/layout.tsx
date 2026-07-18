import type { ReactNode } from 'react';
import { TopbarSectionBack } from '@/components/TopbarSectionBack';

const ADMIN_PARENT_ROUTES = [
  { prefix: '/admin/content/', href: '/admin/content', label: 'Content' },
  { prefix: '/admin/fulfillment/', href: '/admin/fulfillment', label: 'Merch' },
  { prefix: '/admin/people/', href: '/admin/people', label: 'People' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>
    <TopbarSectionBack rootHref="/admin" rootLabel="Admin" parentRoutes={ADMIN_PARENT_ROUTES} />
    {children}
  </>;
}
