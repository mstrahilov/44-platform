'use client';

import { useTopbarTabs, type TopbarTab } from '@/components/TopbarContext';

export const DASHBOARD_TABS: Array<{ id: string; label: string; href: string }> = [
  { id: 'overview', label: 'Overview', href: '/dashboard' },
  { id: 'products', label: 'Products', href: '/dashboard/products' },
  { id: 'services', label: 'Services', href: '/dashboard/services' },
  { id: 'resources', label: 'Resources', href: '/dashboard/resources' },
  { id: 'payouts', label: 'Earnings', href: '/dashboard/payouts' },
  { id: 'preferences', label: 'Preferences', href: '/dashboard/preferences' },
];

export function useDashboardTabs(activeId: string) {
  useTopbarTabs(
    DASHBOARD_TABS.map<TopbarTab>(tab => ({
      ...tab,
      active: tab.id === activeId,
    })),
  );
}
