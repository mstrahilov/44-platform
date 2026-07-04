'use client';

import { useTopbarTabs } from '@/components/TopbarContext';

export type ResourcesSection = 'resources' | 'collection';

export function useResourcesTopbarTabs(active: ResourcesSection) {
  useTopbarTabs([
    { id: 'resources', label: 'Resources', href: '/resources', active: active === 'resources' },
    { id: 'collection', label: 'Saved', href: '/resources/collection', active: active === 'collection' },
  ]);
}
