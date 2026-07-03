import type { StudioProfile } from '@/lib/studioProfiles';

export function hasCommunityIdentity(profile: Pick<StudioProfile, 'username' | 'avatar_url'> | null | undefined) {
  return Boolean(profile?.username?.trim() && profile?.avatar_url?.trim());
}

export function communityIdentityMessage() {
  return 'Please finish setting up your community profile to interact.';
}
