import { supabase } from '@/lib/supabase';

export async function createOrOpenConversation(_currentUserId: string, otherProfileId: string) {
  const { data, error } = await supabase.rpc('create_or_open_direct_conversation', {
    other_profile_id: otherProfileId,
  });

  return {
    href: data ? `/inbox?conversation=${String(data)}` : '/inbox',
    error,
  };
}

export async function sendDirectMessage(conversationId: string, body: string) {
  return supabase.rpc('send_direct_message', {
    target_conversation_id: conversationId,
    message_body: body,
  });
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
