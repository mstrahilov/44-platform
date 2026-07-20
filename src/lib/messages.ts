import { supabase } from '@/lib/supabase';
import type { SocialAuthor } from '@/lib/social';
import { requestPushDelivery } from '@/lib/webPush';

export type InboxConversation = { id: string; conversation_key: string; updated_at: string };
export type InboxConversationMember = { conversation_id: string; profile_id: string; profiles?: SocialAuthor | null };
export type InboxMessage = { id: string; conversation_id: string; sender_id: string | null; body: string; status: string; created_at: string };
export type MessageRecipient = Pick<SocialAuthor, 'id' | 'slug' | 'username' | 'display_name' | 'avatar_url' | 'role' | 'creator_type'>;

export async function loadInboxData(userId: string) {
  const membershipResult = await supabase.from('conversation_members').select('conversation_id').eq('profile_id', userId);
  if (membershipResult.error) throw membershipResult.error;
  const ids = Array.from(new Set((membershipResult.data ?? []).map(row => row.conversation_id)));
  if (ids.length === 0) return { conversations: [] as InboxConversation[], members: [] as InboxConversationMember[], messages: [] as InboxMessage[] };

  const [conversationResult, memberResult, messageResult] = await Promise.all([
    supabase.from('conversations').select('*').in('id', ids).order('updated_at', { ascending: false }),
    supabase
      .from('conversation_members')
      .select('conversation_id, profile_id, profiles:profiles!conversation_members_profile_id_fkey(id, slug, username, display_name, avatar_url, role, creator_type)')
      .in('conversation_id', ids),
    supabase.from('messages').select('*').in('conversation_id', ids).order('created_at', { ascending: true }),
  ]);
  const error = conversationResult.error || memberResult.error || messageResult.error;
  if (error) throw error;
  return {
    conversations: (conversationResult.data as InboxConversation[] | null) ?? [],
    members: (memberResult.data as unknown as InboxConversationMember[] | null) ?? [],
    messages: (messageResult.data as InboxMessage[] | null) ?? [],
  };
}

export async function searchMessageRecipients(userId: string, query: string) {
  let request = supabase
    .from('profiles')
    .select('id,slug,username,display_name,avatar_url,role,creator_type')
    .neq('id', userId)
    .order('display_name', { ascending: true })
    .limit(12);
  if (query) request = request.or(`display_name.ilike.%${query}%,username.ilike.%${query}%,slug.ilike.%${query}%`);
  const result = await request;
  if (result.error) throw result.error;
  return (result.data as MessageRecipient[] | null) ?? [];
}

export async function createOrOpenConversation(_currentUserId: string, otherProfileId: string) {
  const { data, error } = await supabase.rpc('create_or_open_direct_conversation', {
    other_profile_id: otherProfileId,
  });

  const conversationId = data ? String(data) : null;

  return {
    conversationId,
    href: conversationId ? `/conversation/${conversationId}` : '/inbox',
    error,
  };
}

export async function sendDirectMessage(conversationId: string, body: string) {
  const result = await supabase.rpc('send_direct_message', {
    target_conversation_id: conversationId,
    message_body: body,
  });
  if (!result.error) void requestPushDelivery();
  return result;
}

export function directMessageError(error: { message?: string } | null | undefined) {
  const message = error?.message?.trim() ?? '';
  if (!message) return '';
  if (message.includes('create_or_open_direct_conversation') || message.includes('send_direct_message')) {
    return 'Messages are being updated. Refresh the page and try again.';
  }
  if (message.toLowerCase().includes('row-level security')) {
    return 'This conversation could not be opened. Refresh the page and try again.';
  }
  return message;
}
