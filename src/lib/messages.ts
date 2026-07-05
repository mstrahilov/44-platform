import { isMissingRelationError } from '@/lib/schemaCompat';
import { normalizeConversationKey } from '@/lib/social';
import { supabase } from '@/lib/supabase';

export async function createOrOpenConversation(currentUserId: string, otherProfileId: string) {
  const conversationKey = normalizeConversationKey(currentUserId, otherProfileId);

  const { data: existing, error: existingError } = await supabase
    .from('conversations')
    .select('id')
    .eq('conversation_key', conversationKey)
    .maybeSingle();

  if (isMissingRelationError(existingError)) {
    return { href: `/inbox?with=${otherProfileId}`, error: existingError };
  }

  if (existing?.id) {
    return { href: `/inbox?conversation=${existing.id}`, error: null };
  }

  const { data: created, error: createError } = await supabase
    .from('conversations')
    .insert({
      conversation_key: conversationKey,
      created_by: currentUserId,
    })
    .select('id')
    .single();

  if (isMissingRelationError(createError)) {
    return { href: `/inbox?with=${otherProfileId}`, error: createError };
  }

  if (createError || !created?.id) {
    return { href: '/inbox', error: createError };
  }

  const conversationId = (created as { id: string }).id;
  const { error: memberError } = await supabase
    .from('conversation_members')
    .upsert([
      { conversation_id: conversationId, profile_id: currentUserId },
      { conversation_id: conversationId, profile_id: otherProfileId },
    ], { onConflict: 'conversation_id,profile_id' });

  return {
    href: `/inbox?conversation=${conversationId}`,
    error: memberError,
  };
}
