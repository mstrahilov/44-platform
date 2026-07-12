'use client';

import { requestAchievementEvaluation } from '@/lib/achievementNotifications';
import type { AchievementNotification } from '@/lib/achievementNotifications';
import { isV1AchievementCode } from '@/lib/achievementCatalog';
import type { ProductAchievement } from '@/lib/platform';
import { supabase } from '@/lib/supabase';

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
  void achievements;
  const unlockedIds = unlockedAchievementIds ?? await loadUnlockedAchievementIds(userId, productId);
  const unlockedAchievements = await requestAchievementEvaluation(productId, triggerType, metadata);
  const nextUnlockedIds = new Set(unlockedIds);
  unlockedAchievements.forEach(achievement => nextUnlockedIds.add(achievement.id));

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
  void achievements;
  void unlockedAchievementIds;
  void userId;
  const unlocked = await requestAchievementEvaluation(productId, 'all_achievements_unlocked', metadata);
  return unlocked.find(achievement => achievement.achievementCode === 'overachiever') ?? null;
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

export async function recordAchievementPlaybackSignal({
  productId,
  trackId,
  sessionId,
  signalType,
}: {
  productId: string;
  trackId: string;
  sessionId: string;
  signalType: 'track_completed' | 'track_skipped';
}) {
  return supabase.rpc('record_achievement_playback_signal', {
    target_item_id: productId,
    target_track_id: trackId,
    target_session_id: sessionId,
    target_signal_type: signalType,
    signal_metadata: {},
  });
}
