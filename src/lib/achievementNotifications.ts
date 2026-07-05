import { supabase } from '@/lib/supabase';
import type { AchievementEvent, ProductAchievement } from '@/lib/platform';
import type { AchievementToastData } from '@/components/AchievementToast';

export const ACHIEVEMENT_NOTIFICATIONS_UPDATED = '44:achievement-notifications-updated';

export interface AchievementNotification extends AchievementToastData {
  createdAt?: string;
  productId?: string | null;
  href?: string | null;
  kind?: 'achievement' | 'reply' | 'mention' | 'like' | 'message';
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
  achievement: Pick<ProductAchievement, 'id' | 'code' | 'title' | 'description' | 'points' | 'trigger_type'>,
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
    product_id: productId,
    achievement_id: achievement.id,
  });

  if (error) return null;

  await supabase.from('achievement_events').insert({
    user_id: userId,
    product_id: productId,
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
    points: achievement.points,
  } satisfies AchievementNotification;

  broadcastAchievementNotification(notification);

  return notification;
}

// Reply, mention, like, and message notifications are created by Supabase
// triggers on post_replies, posts, post_likes, and messages
// (Other/44os-functional-sweep.sql). The client only reads them.

export async function loadAchievementNotifications(userId: string): Promise<AchievementNotification[]> {
  const { data, error } = await supabase
    .from('achievement_events')
    .select('id,user_id,product_id,achievement_id,event_type,metadata,created_at')
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
  const achievementMap = new Map<string, Pick<ProductAchievement, 'id' | 'title' | 'description' | 'points'>>();

  if (achievementIds.length > 0) {
    const { data: achievements } = await supabase
      .from('product_achievements')
      .select('id,title,description,points')
      .in('id', achievementIds);

    ((achievements as Array<Pick<ProductAchievement, 'id' | 'title' | 'description' | 'points'>> | null) ?? []).forEach(item => {
      achievementMap.set(item.id, item);
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
        points: achievement.points,
        createdAt: event.created_at,
        productId: event.product_id,
        kind: 'achievement',
      });
      continue;
    }

    if (event.event_type === 'reply_received') {
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
      });
      continue;
    }

    if (event.event_type === 'like_received') {
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
      });
    }
  }

  return notifications;
}
