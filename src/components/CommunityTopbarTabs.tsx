'use client';

import { useTopbarTabs } from '@/components/TopbarContext';

export type CommunitySection = 'feed' | 'following' | 'questions' | 'collaboration' | 'friends' | 'messages' | 'profile';

const COMMUNITY_TABS: Array<{ id: CommunitySection; label: string; href: string }> = [
  { id: 'feed', label: 'Feed', href: '/community' },
  { id: 'following', label: 'Following', href: '/community?view=following' },
  { id: 'questions', label: 'Questions', href: '/community?topic=question' },
  { id: 'collaboration', label: 'Collaboration', href: '/community?topic=collaboration' },
];

export function useCommunityTopbarTabs(active: CommunitySection) {
  const hasCommunityFeedTabs = COMMUNITY_TABS.some(tab => tab.id === active);
  useTopbarTabs(hasCommunityFeedTabs ? COMMUNITY_TABS.map(tab => ({ ...tab, active: tab.id === active })) : undefined);
}
