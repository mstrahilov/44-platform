'use client';

import { useTopbarTabs } from '@/components/TopbarContext';

export type ResourcesSection = 'resources' | 'collection';

export function useResourcesTopbarTabs(_active: ResourcesSection) {
  useTopbarTabs(undefined);
}
