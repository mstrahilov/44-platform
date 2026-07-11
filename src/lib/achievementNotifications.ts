import { supabase } from '@/lib/supabase';
import { isV1AchievementCode } from '@/lib/achievementCatalog';
import type { AchievementEvent, ProductAchievement } from '@/lib/platform';
import type { AchievementToastData } from '@/components/AchievementToast';

export const ACHIEVEMENT_NOTIFICATIONS_UPDATED = '44:achievement-notifications-updated';

export interface AchievementNotification extends AchievementToastData {
  createdAt?: string;
  productId?: string | null;
  href?: string | null;
  kind?: 'achievement' | 'reply' | 'mention' | 'like' | 'message';
  actorUserId?: string | null;
  actorAvatarUrl?: string | null;
  achievementCode?: string | null;
  achievementIcon?: string | null;
}

function broadcastAchievementNotification(notification: AchievementNotification) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(ACHIEVEMENT_NOTIFICATIONS_UPDATED, {
      detail: notification,
    }),
  );
}

export async function unlockAchievementForUser(
  userId: string,
  productId: string,
  achievement: Pick<ProductAchievement, 'id' | 'code' | 'title' | 'description' | 'trigger_type'>,
  metadata?: Record<string, unknown>,
) {
  const { data: existingUnlock } = await supabase
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_id', achievement.id)
    .maybeSingle();

  if (existingUnlock) return null;

  const { error } = await supabase.from('user_achievements').insert({
    user_id: userId,
    item_id: productId,
    achievement_id: achievement.id,
  });

  if (error) return null;

  await supabase.from('achievement_events').insert({
    user_id: userId,
    item_id: productId,
    achievement_id: achievement.id,
    event_type: 'achievement_unlocked',
    metadata: {
      trigger_type: achievement.trigger_type,
      achievement_code: achievement.code,
      ...(metadata ?? {}),
    },
  });

  const notification = {
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    achievementCode: achievement.code,
  } satisfies AchievementNotification;

  broadcastAchievementNotification(notification);

  return notification;
}

// Reply, mention, like, and message events are created by the reviewed live
// Supabase triggers. The client synthesizes notification rows from those events.

export async function loadAchievementNotifications(userId: string): Promise<AchievementNotification[]> {
  const { data, error } = await supabase
    .from('achievement_events')
    .select('id,user_id,item_id,achievement_id,event_type,metadata,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(24);

  if (error || !data) return [];

  const eventRows = data as AchievementEvent[];
  const achievementIds = Array.from(
    new Set(
      eventRows
        .filter(item => item.event_type === 'achievement_unlocked')
        .map(item => item.achievement_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const achievementMap = new Map<string, Pick<ProductAchievement, 'id' | 'code' | 'title' | 'description' | 'icon'>>();

  if (achievementIds.length > 0) {
    const { data: achievements } = await supabase
      .from('item_achievements')
      .select('id,code,title,description,icon')
      .in('id', achievementIds);

    ((achievements as Array<Pick<ProductAchievement, 'id' | 'code' | 'title' | 'description' | 'icon'>> | null) ?? []).forEach(item => {
      if (!isV1AchievementCode(item.code)) return;
      achievementMap.set(item.id, item);
    });
  }

  const actorIds = Array.from(new Set(eventRows
    .map(event => typeof event.metadata?.actor_user_id === 'string' ? event.metadata.actor_user_id : null)
    .filter((value): value is string => Boolean(value))));
  const actorAvatarMap = new Map<string, string | null>();

  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from('profiles')
      .select('id,avatar_url')
      .in('id', actorIds);

    ((actors as Array<{ id: string; avatar_url: string | null }> | null) ?? []).forEach(actor => {
      actorAvatarMap.set(actor.id, actor.avatar_url);
    });
  }

  const notifications: AchievementNotification[] = [];

  for (const event of eventRows) {
    if (event.event_type === 'achievement_unlocked') {
      const achievement = event.achievement_id ? achievementMap.get(event.achievement_id) : null;
      if (!achievement) continue;

      notifications.push({
        id: event.id,
        title: achievement.title,
        description: achievement.description,
        createdAt: event.created_at,
        productId: event.item_id,
        kind: 'achievement',
        achievementCode: achievement.code,
        achievementIcon: achievement.icon,
      });
      continue;
    }

    if (event.event_type === 'reply_received') {
      const actorUserId = typeof event.metadata?.actor_user_id === 'string' ? event.metadata.actor_user_id : null;
      const actorName = typeof event.metadata?.actor_name === 'string' ? event.metadata.actor_name : 'Someone';
      const postTitle = typeof event.metadata?.post_title === 'string' ? event.metadata.post_title : 'your post';
      const replyBody = typeof event.metadata?.reply_body === 'string' ? event.metadata.reply_body : '';
      const postId = typeof event.metadata?.post_id === 'string' ? event.metadata.post_id : null;
      const postSlug = typeof event.metadata?.post_slug === 'string' ? event.metadata.post_slug : null;

      notifications.push({
        id: event.id,
        title: `${actorName} replied`,
        description: replyBody || `New reply on ${postTitle}.`,
        createdAt: event.created_at,
        productId: null,
        href: postSlug || postId ? `/community/thread/${postSlug || postId}` : '/notifications',
        kind: 'reply',
        actorUserId,
        actorAvatarUrl: actorUserId ? actorAvatarMap.get(actorUserId) ?? null : null,
      });
      continue;
    }

    if (event.event_type === 'like_received') {
      const actorUserId = typeof event.metadata?.actor_user_id === 'string' ? event.metadata.actor_user_id : null;
      const actorName = typeof event.metadata?.actor_name === 'string' ? event.metadata.actor_name : 'Someone';
      const postTitle = typeof event.metadata?.post_title === 'string' ? event.metadata.post_title : 'your post';
      const postId = typeof event.metadata?.post_id === 'string' ? event.metadata.post_id : null;
      const postSlug = typeof event.metadata?.post_slug === 'string' ? event.metadata.post_slug : null;

      notifications.push({
        id: event.id,
        title: `${actorName} liked your post`,
        description: postTitle,
        createdAt: event.created_at,
        productId: null,
        href: postSlug || postId ? `/community/thread/${postSlug || postId}` : '/notifications',
        kind: 'like',
        actorUserId,
        actorAvatarUrl: actorUserId ? actorAvatarMap.get(actorUserId) ?? null : null,
      });
      continue;
    }

    if (event.event_type === 'message_received') {
      const actorName = typeof event.metadata?.actor_name === 'string' ? event.metadata.actor_name : 'Someone';
      const messageBody = typeof event.metadata?.message_body === 'string' ? event.metadata.message_body : '';
      const conversationId = typeof event.metadata?.conversation_id === 'string' ? event.metadata.conversation_id : null;

      notifications.push({
        id: event.id,
        title: `${actorName} sent you a message`,
        description: messageBody || 'New message in your inbox.',
        createdAt: event.created_at,
        productId: null,
        href: conversationId ? `/inbox?conversation=${conversationId}` : '/inbox',
        kind: 'message',
      });
      continue;
    }

    if (event.event_type === 'mention_received') {
      const actorUserId = typeof event.metadata?.actor_user_id === 'string' ? event.metadata.actor_user_id : null;
      const actorName = typeof event.metadata?.actor_name === 'string' ? event.metadata.actor_name : 'Someone';
      const postTitle = typeof event.metadata?.post_title === 'string' ? event.metadata.post_title : 'a post';
      const postBody = typeof event.metadata?.post_body === 'string' ? event.metadata.post_body : '';
      const postId = typeof event.metadata?.post_id === 'string' ? event.metadata.post_id : null;
      const postSlug = typeof event.metadata?.post_slug === 'string' ? event.metadata.post_slug : null;

      notifications.push({
        id: event.id,
        title: `${actorName} mentioned you`,
        description: postBody || `You were mentioned in ${postTitle}.`,
        createdAt: event.created_at,
        productId: null,
        href: postSlug || postId ? `/community/thread/${postSlug || postId}` : '/notifications',
        kind: 'mention',
        actorUserId,
        actorAvatarUrl: actorUserId ? actorAvatarMap.get(actorUserId) ?? null : null,
      });
    }
  }

  return notifications;
}
