import { isMissingRelationError } from './schemaCompat';
import { supabase } from './supabase';
import type { SocialAuthor } from './social';

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'canceled';

export type FriendRequestRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendRequestStatus;
  created_at: string;
  responded_at: string | null;
  requester?: SocialAuthor | null;
  addressee?: SocialAuthor | null;
};

export type FriendshipState =
  | 'none'
  | 'friends'
  | 'incoming'
  | 'outgoing';

export function otherFriendProfile(row: FriendRequestRow, currentUserId: string) {
  return row.requester_id === currentUserId ? row.addressee : row.requester;
}

export async function loadFriendshipState(currentUserId: string, profileId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id,requester_id,addressee_id,status,created_at,responded_at')
    .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${currentUserId})`)
    .in('status', ['pending', 'accepted'])
    .maybeSingle();

  if (isMissingRelationError(error)) return { state: 'none' as FriendshipState, request: null, schemaReady: false, error };
  if (error) return { state: 'none' as FriendshipState, request: null, schemaReady: true, error };
  const request = (data as FriendRequestRow | null) ?? null;
  if (!request) return { state: 'none' as FriendshipState, request: null, schemaReady: true, error: null };
  if (request.status === 'accepted') return { state: 'friends' as FriendshipState, request, schemaReady: true, error: null };
  if (request.addressee_id === currentUserId) return { state: 'incoming' as FriendshipState, request, schemaReady: true, error: null };
  return { state: 'outgoing' as FriendshipState, request, schemaReady: true, error: null };
}

export async function sendFriendRequest(currentUserId: string, profileId: string) {
  return supabase
    .from('friend_requests')
    .insert({ requester_id: currentUserId, addressee_id: profileId, status: 'pending' })
    .select('id,requester_id,addressee_id,status,created_at,responded_at')
    .single();
}

export async function acceptFriendRequest(requestId: string) {
  return supabase
    .from('friend_requests')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .select('id,requester_id,addressee_id,status,created_at,responded_at')
    .single();
}

export async function cancelFriendRequest(requestId: string) {
  return supabase
    .from('friend_requests')
    .update({ status: 'canceled', responded_at: new Date().toISOString() })
    .eq('id', requestId);
}

export async function removeFriend(requestId: string) {
  return supabase
    .from('friend_requests')
    .update({ status: 'canceled', responded_at: new Date().toISOString() })
    .eq('id', requestId);
}

export async function loadFriendRequests(currentUserId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      id,requester_id,addressee_id,status,created_at,responded_at,
      requester:profiles!friend_requests_requester_id_fkey(id, slug, username, display_name, avatar_url, role, creator_type),
      addressee:profiles!friend_requests_addressee_id_fkey(id, slug, username, display_name, avatar_url, role, creator_type)
    `)
    .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
    .in('status', ['pending', 'accepted'])
    .order('created_at', { ascending: false });

  if (isMissingRelationError(error)) {
    return { rows: [] as FriendRequestRow[], schemaReady: false, error };
  }

  return {
    rows: ((data as FriendRequestRow[] | null) ?? []).filter(Boolean),
    schemaReady: true,
    error,
  };
}
