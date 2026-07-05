'use client';

import { useTopbarTabs } from '@/components/TopbarContext';

export type CommunitySection = 'feed' | 'friends' | 'messages' | 'profile';

export function useCommunityTopbarTabs(_active: CommunitySection) {
  useTopbarTabs(undefined);
}
