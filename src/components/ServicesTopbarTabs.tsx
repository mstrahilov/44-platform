'use client';

import { useTopbarTabs } from '@/components/TopbarContext';

export type ServicesSection = 'services' | 'projects' | 'requests';

const HOME_SERVICE_TABS = [
  { id: 'all', label: 'Browse', href: '/browse' },
  { id: 'music', label: 'Music', href: '/browse/music' },
  { id: 'books', label: 'Books', href: '/browse/books' },
  { id: 'merch', label: 'Merch', href: '/browse/merch' },
  { id: 'assets', label: 'Assets', href: '/browse/assets' },
  { id: 'services', label: 'Services', href: '/services' },
] as const;

export function useServicesTopbarTabs(active: ServicesSection) {
  useTopbarTabs(HOME_SERVICE_TABS.map(tab => ({
    ...tab,
    active: tab.id === 'services' && active === 'services',
  })));
}
