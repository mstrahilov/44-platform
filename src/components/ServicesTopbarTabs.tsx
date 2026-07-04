'use client';

import { useTopbarTabs } from '@/components/TopbarContext';

export type ServicesSection = 'services' | 'projects' | 'requests';

export function useServicesTopbarTabs(active: ServicesSection) {
  useTopbarTabs([
    { id: 'services', label: 'Services', href: '/services', active: active === 'services' },
    { id: 'projects', label: 'Projects', href: '/services/projects', active: active === 'projects' },
    { id: 'requests', label: 'Requests', href: '/services/requests', active: active === 'requests' },
  ]);
}
