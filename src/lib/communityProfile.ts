import type { StudioProfile } from '@/lib/studioProfiles';

export function hasCommunityIdentity(profile: Pick<StudioProfile, 'display_name' | 'username'> | null | undefined) {
  return Boolean(profile?.display_name?.trim() && profile?.username?.trim());
}

export function communityIdentityMessage() {
  return 'Please finish setting up your community profile to interact.';
}
