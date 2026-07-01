import { supabase } from '@/lib/supabase';
import type { AchievementEvent, ProductAchievement } from '@/lib/platform';
import type { AchievementToastData } from '@/components/AchievementToast';

export interface AchievementNotification extends AchievementToastData {
  createdAt?: string;
  productId?: string | null;
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

  return {
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    points: achievement.points,
  } satisfies AchievementToastData;
}

export async function loadAchievementNotifications(userId: string): Promise<AchievementNotification[]> {
  const { data, error } = await supabase
    .from('achievement_events')
    .select('id,user_id,product_id,achievement_id,event_type,metadata,created_at')
    .eq('user_id', userId)
    .eq('event_type', 'achievement_unlocked')
    .order('created_at', { ascending: false })
    .limit(24);

  if (error || !data) return [];

  const eventRows = data as AchievementEvent[];
  const achievementIds = Array.from(
    new Set(eventRows.map(item => item.achievement_id).filter((value): value is string => Boolean(value))),
  );

  if (achievementIds.length === 0) return [];

  const { data: achievements } = await supabase
    .from('product_achievements')
    .select('id,title,description,points')
    .in('id', achievementIds);

  const achievementMap = new Map(
    ((achievements as Array<Pick<ProductAchievement, 'id' | 'title' | 'description' | 'points'>> | null) ?? []).map(item => [item.id, item]),
  );

  const notifications: AchievementNotification[] = [];

  for (const event of eventRows) {
    const achievement = event.achievement_id ? achievementMap.get(event.achievement_id) : null;
    if (!achievement) continue;

    notifications.push({
      id: event.id,
      title: achievement.title,
      description: achievement.description,
      points: achievement.points,
      createdAt: event.created_at,
      productId: event.product_id,
    });
  }

  return notifications;
}
