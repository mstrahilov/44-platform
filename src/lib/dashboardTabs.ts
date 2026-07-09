'use client';

import { useTopbarTabs, type TopbarTab } from '@/components/TopbarContext';

export const DASHBOARD_TABS: Array<{ id: string; label: string; href: string }> = [
  { id: 'overview', label: 'Overview', href: '/dashboard' },
  { id: 'music', label: 'Music', href: '/dashboard/products' },
  { id: 'books', label: 'Books', href: '/dashboard/products?section=books' },
  { id: 'assets', label: 'Sample Packs', href: '/dashboard/products?section=assets' },
  { id: 'merch', label: 'Merch', href: '/dashboard/products?section=merch' },
];

export function useDashboardTabs(activeId: string) {
  useTopbarTabs(
    DASHBOARD_TABS.map<TopbarTab>(tab => ({
      ...tab,
      active: tab.id === activeId,
    })),
  );
}
