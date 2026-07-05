'use client';

import { useTopbarTabs } from '@/components/TopbarContext';

export type ServicesSection = 'services' | 'projects' | 'requests';

export function useServicesTopbarTabs(_active: ServicesSection) {
  useTopbarTabs(undefined);
}
