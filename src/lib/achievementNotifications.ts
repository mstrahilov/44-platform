import { supabase } from '@/lib/supabase';
import { isV1AchievementCode } from '@/lib/achievementCatalog';
import type { AchievementEvent, ProductAchievement } from '@/lib/platform';
import type { AchievementToastData } from '@/components/AchievementToast';

export const ACHIEVEMENT_NOTIFICATIONS_UPDATED = '44:achievement-notifications-updated';

export interface AchievementNotification extends AchievementToastData {
  createdAt?: string;
  productId?: string | null;
  href?: string | null;
  kind?: 'achievement' | 'reply' | 'mention' | 'like' | 'message' | 'system';
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
  void userId;
  const notifications = await requestAchievementEvaluation(productId, achievement.trigger_type, metadata);
  return notifications.find(notification => notification.id === achievement.id) ?? null;
}

export async function requestAchievementEvaluation(
  productId: string,
  triggerType: string,
  metadata?: Record<string, unknown>,
) {
  const sessionId = typeof metadata?.playback_session_id === 'string' ? metadata.playback_session_id : undefined;
  const { data, error } = await supabase.rpc('evaluate_item_achievements', {
    target_item_id: productId,
    requested_trigger_type: triggerType,
    target_session_id: sessionId,
    client_context: {
      ...(metadata ?? {}),
      timezone_offset_minutes: new Date().getTimezoneOffset(),
    },
  });
  if (error || !data) return [];

  return data.map(row => {
    const notification = {
      id: row.id,
      title: row.title,
      description: row.description,
      achievementCode: row.code,
      achievementIcon: row.icon,
    } satisfies AchievementNotification;
    broadcastAchievementNotification(notification);
    return notification;
  });
}

// Reply, mention, like, and message events are created by the reviewed live
// Supabase triggers. The client synthesizes notification rows from those events.

export async function loadAchievementNotifications(userId: string, limit = 24): Promise<AchievementNotification[]> {
  const [{ data, error }, sellerNotices] = await Promise.all([
    supabase
      .from('achievement_events')
      .select('id,user_id,item_id,achievement_id,event_type,metadata,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(limit, 500))),
    supabase
      .from('creator_seller_notifications' as never)
      .select('id,title,body,href,created_at')
      .eq('creator_id' as never, userId)
      .order('created_at' as never, { ascending: false })
      .limit(10),
  ]);

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
        href: event.item_id ? `/library/item/${event.item_id}` : '/library',
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
      const replyId = typeof event.metadata?.reply_id === 'string' ? event.metadata.reply_id : null;
      const threadIdentifier = postSlug || postId;

      notifications.push({
        id: event.id,
        title: `${actorName} replied`,
        description: replyBody || `New reply on ${postTitle}.`,
        createdAt: event.created_at,
        productId: null,
        href: threadIdentifier
          ? `/community/thread/${threadIdentifier}${replyId ? `/reply/${replyId}` : ''}`
          : '/notifications',
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
      const actorUserId = typeof event.metadata?.actor_user_id === 'string' ? event.metadata.actor_user_id : null;
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
        actorUserId,
        actorAvatarUrl: actorUserId ? actorAvatarMap.get(actorUserId) ?? null : null,
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
      continue;
    }

    if (event.event_type === 'creator_access_granted') {
      notifications.push({
        id: event.id,
        title: 'You are now a Creator',
        description: 'Creator access is ready. Open Studio to add your first release.',
        createdAt: event.created_at,
        productId: null,
        href: '/studio',
        kind: 'system',
      });
    }
  }

  if (!sellerNotices.error) {
    const rows = sellerNotices.data as unknown as Array<{
      id: string; title: string; body: string; href: string; created_at: string;
    }>;
    rows.forEach(notice => notifications.push({
      id: notice.id,
      title: notice.title,
      description: notice.body,
      createdAt: notice.created_at,
      href: notice.href,
      kind: 'system',
    }));
  }

  return notifications.sort((left, right) => (
    new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()
  ));
}
