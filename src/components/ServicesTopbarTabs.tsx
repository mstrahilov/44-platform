'use client';

import { useTopbarTabs } from '@/components/TopbarContext';

export type ServicesSection = 'services' | 'projects' | 'requests';

const HOME_SERVICE_TABS = [
  { id: 'all', label: 'Discover', href: '/' },
  { id: 'music', label: 'Music', href: '/store/music' },
  { id: 'books', label: 'Books', href: '/store/books' },
  { id: 'merch', label: 'Merch', href: '/store/merch' },
  { id: 'assets', label: 'Sample Packs', href: '/store/assets' },
  { id: 'services', label: 'Services', href: '/services' },
] as const;

export function useServicesTopbarTabs(active: ServicesSection) {
  useTopbarTabs(HOME_SERVICE_TABS.map(tab => ({
    ...tab,
    active: tab.id === 'services' && active === 'services',
  })));
}
