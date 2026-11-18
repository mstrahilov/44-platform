import { supabase } from '@/lib/supabase';
import type { SocialAuthor } from '@/lib/social';
import { requestPushDelivery } from '@/lib/webPush';

export type InboxConversation = { id: string; conversation_key: string; updated_at: string };
export type InboxConversationMember = { conversation_id: string; profile_id: string; last_read_at: string | null; archived_at: string | null; profiles?: SocialAuthor | null };
export type InboxMessage = { id: string; conversation_id: string; sender_id: string | null; body: string; status: string; created_at: string };
export type MessagePageCursor = { timestamp: string; id: string };
export type MessageRecipient = Pick<SocialAuthor, 'id' | 'slug' | 'username' | 'display_name' | 'avatar_url' | 'role' | 'creator_type'>;

export type InboxPage = {
  conversations: InboxConversation[];
  members: InboxConversationMember[];
  messages: InboxMessage[];
  nextCursor: MessagePageCursor | null;
};

function applyMessageCursor<T extends { or: (filters: string) => T }>(query: T, cursor: MessagePageCursor | null | undefined, column: 'updated_at' | 'created_at') {
  if (!cursor) return query;
  if (!Number.isFinite(Date.parse(cursor.timestamp)) || !/^[0-9a-f-]{36}$/i.test(cursor.id)) {
    throw new Error('The message page cursor is invalid.');
  }
  return query.or(`${column}.lt.${cursor.timestamp},and(${column}.eq.${cursor.timestamp},id.lt.${cursor.id})`);
}

export async function loadInboxData(userId: string, cursor?: MessagePageCursor | null, limit = 40): Promise<InboxPage> {
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  const pageQuery = supabase
    .from('conversations')
    .select('id,conversation_key,updated_at,conversation_members!inner(profile_id,archived_at),messages(id,conversation_id,sender_id,body,status,created_at)')
    .eq('conversation_members.profile_id', userId)
    .is('conversation_members.archived_at', null);
  const pageResult = await applyMessageCursor(pageQuery, cursor, 'updated_at')
    .eq('messages.status', 'sent')
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .order('created_at', { ascending: false, referencedTable: 'messages' })
    .order('id', { ascending: false, referencedTable: 'messages' })
    .limit(1, { referencedTable: 'messages' })
    .limit(boundedLimit);
  if (pageResult.error) throw pageResult.error;
  const pageRows = (pageResult.data ?? []) as unknown as Array<InboxConversation & {
    messages?: InboxMessage[];
  }>;
  const conversations: InboxConversation[] = pageRows.map(({ id, conversation_key, updated_at }) => ({ id, conversation_key, updated_at }));
  const ids = conversations.map(row => row.id);
  if (ids.length === 0) return { conversations, members: [], messages: [], nextCursor: null };

  const memberResult = await supabase
    .from('conversation_members')
    .select('conversation_id,profile_id,last_read_at,archived_at,profiles:profiles!conversation_members_profile_id_fkey(id, slug, username, display_name, avatar_url, role, creator_type)')
    .in('conversation_id', ids);
  if (memberResult.error) throw memberResult.error;
  return {
    conversations,
    members: (memberResult.data as unknown as InboxConversationMember[] | null) ?? [],
    // The embedded relation is limited to one latest sent message per conversation.
    messages: pageRows.flatMap(row => row.messages ?? []),
    nextCursor: pageRows.length === boundedLimit
      ? { timestamp: pageRows.at(-1)!.updated_at, id: pageRows.at(-1)!.id }
      : null,
  };
}

export async function loadInboxConversation(userId: string, conversationId: string) {
  const conversationResult = await supabase
    .from('conversations')
    .select('id,conversation_key,updated_at,conversation_members!inner(profile_id,archived_at),messages(id,conversation_id,sender_id,body,status,created_at)')
    .eq('id', conversationId)
    .eq('conversation_members.profile_id', userId)
    .is('conversation_members.archived_at', null)
    .eq('messages.status', 'sent')
    .order('created_at', { ascending: false, referencedTable: 'messages' })
    .order('id', { ascending: false, referencedTable: 'messages' })
    .limit(1, { referencedTable: 'messages' })
    .maybeSingle();
  if (conversationResult.error) throw conversationResult.error;
  if (!conversationResult.data) return null;
  const row = conversationResult.data as unknown as InboxConversation & { messages?: InboxMessage[] };
  const memberResult = await supabase
    .from('conversation_members')
    .select('conversation_id,profile_id,last_read_at,archived_at,profiles:profiles!conversation_members_profile_id_fkey(id, slug, username, display_name, avatar_url, role, creator_type)')
    .eq('conversation_id', conversationId);
  if (memberResult.error) throw memberResult.error;
  return {
    conversation: { id: row.id, conversation_key: row.conversation_key, updated_at: row.updated_at } as InboxConversation,
    members: (memberResult.data as unknown as InboxConversationMember[] | null) ?? [],
    messages: row.messages ?? [],
  };
}

export async function loadConversationMessages(conversationId: string, cursor?: MessagePageCursor | null, limit = 50) {
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  const query = supabase
    .from('messages')
    .select('id,conversation_id,sender_id,body,status,created_at')
    .eq('conversation_id', conversationId)
    .eq('status', 'sent');
  const result = await applyMessageCursor(query, cursor, 'created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(boundedLimit);
  if (result.error) throw result.error;
  const descendingRows = (result.data as InboxMessage[] | null) ?? [];
  const rows = descendingRows.slice().reverse();
  return {
    messages: rows,
    nextCursor: descendingRows.length === boundedLimit && rows[0]
      ? { timestamp: rows[0].created_at, id: rows[0].id }
      : null,
  };
}

export async function markConversationRead(conversationId: string, userId: string, timestamp: string) {
  const result = await supabase
    .from('conversation_members')
    .update({ last_read_at: timestamp })
    .eq('conversation_id', conversationId)
    .eq('profile_id', userId)
    .select('conversation_id,profile_id')
    .single();
  if (result.error) throw result.error;
  if (result.data.conversation_id !== conversationId || result.data.profile_id !== userId) throw new Error('The conversation read state could not be saved.');
}

export async function archiveConversation(conversationId: string, userId: string) {
  const result = await supabase
    .from('conversation_members')
    .update({ archived_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('profile_id', userId)
    .select('conversation_id,profile_id')
    .single();
  if (result.error) throw result.error;
  if (result.data.conversation_id !== conversationId || result.data.profile_id !== userId) throw new Error('The conversation could not be archived.');
}

export async function searchMessageRecipients(userId: string, query: string) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const fields = ['display_name', 'username', 'slug'] as const;
  const matches = await Promise.all(fields.map(async field => {
    const result = await supabase
      .from('profiles')
      .select('id,slug,username,display_name,avatar_url,role,creator_type')
      .neq('id', userId)
      .ilike(field, `%${normalizedQuery}%`)
      .order('display_name', { ascending: true })
      .limit(12);
    if (result.error) throw result.error;
    return (result.data as MessageRecipient[] | null) ?? [];
  }));

  const seen = new Set<string>();
  return matches.flat().filter(profile => {
    if (seen.has(profile.id)) return false;
    seen.add(profile.id);
    return true;
  }).slice(0, 12);
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
