'use client';

import { unlockAchievementForUser } from '@/lib/achievementNotifications';
import type { AchievementNotification } from '@/lib/achievementNotifications';
import { isV1AchievementCode } from '@/lib/achievementCatalog';
import type { ProductAchievement } from '@/lib/platform';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';

type TrackTriggerOptions = {
  userId: string;
  productId: string;
  triggerType: string;
  achievements?: ProductAchievement[];
  unlockedAchievementIds?: Set<string>;
  metadata?: Record<string, unknown>;
};

export type AchievementTrackResult = {
  unlockedAchievements: AchievementNotification[];
  unlockedIds: string[];
};

export async function trackProductAchievementTrigger({
  userId,
  productId,
  triggerType,
  achievements,
  unlockedAchievementIds,
  metadata,
}: TrackTriggerOptions): Promise<AchievementTrackResult> {
  const achievementRows = (achievements ?? await loadProductAchievements(productId)).filter(achievement => isV1AchievementCode(achievement.code));
  const unlockedIds = unlockedAchievementIds ?? await loadUnlockedAchievementIds(userId, productId);
  const candidates = achievementRows.filter(achievement => achievement.trigger_type === triggerType);
  const unlockedAchievements: AchievementNotification[] = [];
  const nextUnlockedIds = new Set(unlockedIds);

  for (const achievement of candidates) {
    if (nextUnlockedIds.has(achievement.id)) continue;
    const unlocked = await unlockAchievementForUser(userId, productId, achievement, metadata);
    if (!unlocked) continue;
    unlockedAchievements.push(unlocked);
    nextUnlockedIds.add(achievement.id);
  }

  const overachiever = await maybeUnlockOverachiever({
    userId,
    productId,
    achievements: achievementRows,
    unlockedAchievementIds: nextUnlockedIds,
    metadata: { source: 'overachiever_check', completed_trigger: triggerType },
  });

  if (overachiever) {
    unlockedAchievements.push(overachiever);
    nextUnlockedIds.add(overachiever.id);
  }

  return {
    unlockedAchievements,
    unlockedIds: Array.from(nextUnlockedIds).filter(id => !unlockedIds.has(id)),
  };
}

export async function maybeUnlockOverachiever({
  userId,
  productId,
  achievements,
  unlockedAchievementIds,
  metadata,
}: {
  userId: string;
  productId: string;
  achievements?: ProductAchievement[];
  unlockedAchievementIds?: Set<string>;
  metadata?: Record<string, unknown>;
}) {
  const achievementRows = (achievements ?? await loadProductAchievements(productId)).filter(achievement => isV1AchievementCode(achievement.code));
  const overachiever = achievementRows.find(achievement => achievement.code === 'overachiever');
  if (!overachiever) return null;

  const unlockedIds = unlockedAchievementIds ?? await loadUnlockedAchievementIds(userId, productId);
  if (unlockedIds.has(overachiever.id)) return null;

  const requiredAchievements = achievementRows.filter(achievement => achievement.code !== 'overachiever');
  if (requiredAchievements.length === 0) return null;
  if (!requiredAchievements.every(achievement => unlockedIds.has(achievement.id))) return null;

  return unlockAchievementForUser(userId, productId, overachiever, metadata);
}

export async function loadProductAchievements(productId: string) {
  const supportsAchievements = await productSupportsV1Achievements(productId);
  if (!supportsAchievements) return [];

  const { data } = await supabase
    .from('item_achievements')
    .select('id,item_id,code,title,description,trigger_type,trigger_config,reward_item_id,reward_config,points,icon,sort_order,is_secret')
    .eq('item_id', productId)
    .order('sort_order');

  return ((data as ProductAchievement[] | null) ?? []).filter(achievement => isV1AchievementCode(achievement.code));
}

async function productSupportsV1Achievements(productId: string) {
  const { data } = await supabase
    .from('catalog_items')
    .select('experience_type')
    .eq('id', productId)
    .maybeSingle();

  if (!data) return false;
  return (data.experience_type ?? '').toLowerCase() === 'music';
}

export async function loadUnlockedAchievementIds(userId: string, productId: string) {
  const { data } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)
    .eq('item_id', productId);

  return new Set(((data as Array<{ achievement_id: string }> | null) ?? []).map(item => item.achievement_id));
}

export async function incrementAchievementProgress({
  userId,
  productId,
  metric,
  metadata,
}: {
  userId: string;
  productId: string;
  metric: string;
  metadata?: Record<string, unknown>;
}) {
  const { data: existing } = await supabase
    .from('achievement_progress')
    .select('value,metadata')
    .eq('user_id', userId)
    .eq('item_id', productId)
    .eq('metric', metric)
    .maybeSingle();

  const currentValue = typeof existing?.value === 'number' ? existing.value : 0;
  const nextValue = currentValue + 1;

  await supabase
    .from('achievement_progress')
    .upsert({
      user_id: userId,
      item_id: productId,
      metric,
      value: nextValue,
      metadata: {
        ...(isRecord(existing?.metadata) ? existing.metadata : {}),
        ...(metadata ?? {}),
      } as Json,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,item_id,metric' });

  return nextValue;
}

export async function rememberAchievementProgress({
  userId,
  productId,
  metric,
  value,
  metadata,
}: {
  userId: string;
  productId: string;
  metric: string;
  value?: number;
  metadata?: Record<string, unknown>;
}) {
  await supabase
    .from('achievement_progress')
    .upsert({
      user_id: userId,
      item_id: productId,
      metric,
      value: value ?? 1,
      metadata: (metadata ?? {}) as Json,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,item_id,metric' });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
