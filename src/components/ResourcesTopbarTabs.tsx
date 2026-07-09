'use client';

import { useTopbarTabs } from '@/components/TopbarContext';

export type ResourcesSection = 'resources' | 'collection';

export function useResourcesTopbarTabs(active: ResourcesSection) {
  void active;
  useTopbarTabs(undefined);
}
