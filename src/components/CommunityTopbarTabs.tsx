'use client';

import { useTopbarTabs } from '@/components/TopbarContext';

export type CommunitySection = 'feed' | 'friends' | 'messages' | 'profile';

export function useCommunityTopbarTabs(active: CommunitySection) {
  useTopbarTabs([
    { id: 'feed', label: 'Feed', href: '/community/feed', active: active === 'feed' },
    { id: 'profile', label: 'Profile', href: '/community/profile', active: active === 'profile' },
    { id: 'friends', label: 'Friends', href: '/community/friends', active: active === 'friends' },
    { id: 'messages', label: 'Messages', href: '/community/messages', active: active === 'messages' },
  ]);
}
