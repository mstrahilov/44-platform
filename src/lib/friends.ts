import { isMissingRelationError } from './schemaCompat';
import { supabase } from './supabase';
import type { SocialAuthor } from './social';

export type FollowState = 'none' | 'following' | 'self';

export type FollowRow = {
  follower_id: string;
  following_id: string;
  created_at: string;
  profile?: SocialAuthor | null;
};

export async function loadFollowState(currentUserId: string, profileId: string) {
  if (currentUserId === profileId) {
    return { state: 'self' as FollowState, row: null, schemaReady: true, error: null };
  }

  const { data, error } = await supabase
    .from('profile_follows')
    .select('follower_id,following_id,created_at')
    .eq('follower_id', currentUserId)
    .eq('following_id', profileId)
    .maybeSingle();

  if (isMissingRelationError(error)) return { state: 'none' as FollowState, row: null, schemaReady: false, error };
  if (error) return { state: 'none' as FollowState, row: null, schemaReady: true, error };

  return {
    state: data ? 'following' as FollowState : 'none' as FollowState,
    row: (data as FollowRow | null) ?? null,
    schemaReady: true,
    error: null,
  };
}

export async function followProfile(currentUserId: string, profileId: string) {
  return supabase
    .from('profile_follows')
    .upsert({ follower_id: currentUserId, following_id: profileId }, { onConflict: 'follower_id,following_id' })
    .select('follower_id,following_id,created_at')
    .single();
}

export async function unfollowProfile(currentUserId: string, profileId: string) {
  return supabase
    .from('profile_follows')
    .delete()
    .eq('follower_id', currentUserId)
    .eq('following_id', profileId);
}

export async function loadFollowing(currentUserId: string) {
  const { data, error } = await supabase
    .from('profile_follows')
    .select(`
      follower_id,following_id,created_at,
      profile:profiles!profile_follows_following_id_fkey(id, slug, username, display_name, avatar_url, role, creator_type)
    `)
    .eq('follower_id', currentUserId)
    .order('created_at', { ascending: false });

  if (isMissingRelationError(error)) {
    return { rows: [] as FollowRow[], schemaReady: false, error };
  }

  return {
    rows: ((data as FollowRow[] | null) ?? []).filter(Boolean),
    schemaReady: true,
    error,
  };
}

export async function loadFollowers(profileId: string) {
  const { data, error } = await supabase
    .from('profile_follows')
    .select(`
      follower_id,following_id,created_at,
      profile:profiles!profile_follows_follower_id_fkey(id, slug, username, display_name, avatar_url, role, creator_type)
    `)
    .eq('following_id', profileId)
    .order('created_at', { ascending: false });

  if (isMissingRelationError(error)) {
    return { rows: [] as FollowRow[], schemaReady: false, error };
  }

  return {
    rows: ((data as FollowRow[] | null) ?? []).filter(Boolean),
    schemaReady: true,
    error,
  };
}
