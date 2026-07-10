'use client';

import { AchievementIconGlyph } from '@/components/AchievementIconGlyph';
import { SectionHeader } from '@/components/Ui';
import type { DashboardCatalogSectionId } from '@/lib/dashboardCatalog';
import { getAchievementIconPath } from '@/lib/achievementIcons';
import { supabase } from '@/lib/supabase';

export type DraftAchievement = {
  code: string;
  title: string;
  description: string;
  triggerType: string;
  enabled: boolean;
  iconUrl?: string | null;
};

export type DraftBonusContent = {
  title: string;
  fileUrl: string;
  visibility: 'free' | 'achievement';
  achievementCode: string;
};

export type ReleaseFeatureState = {
  achievementsEnabled: boolean;
  commentaryEnabled: boolean;
  behindTheScenesEnabled: boolean;
  behindTheScenesUrl: string;
  achievements: DraftAchievement[];
  bonusItems: DraftBonusContent[];
};

export type SavedProductAchievement = DraftAchievement & {
  reward_config?: Record<string, unknown> | null;
  is_secret?: boolean | null;
};

export type SavedProductAsset = {
  asset_type: string | null;
  title: string | null;
  file_url: string | null;
};

function supportsAchievementsForSection(sectionId: DashboardCatalogSectionId) {
  return sectionId === 'music';
}

const REQUIRED_SELECTED_ACHIEVEMENTS = 3;
const OVERACHIEVER_CODE = 'overachiever';

export function createReleaseFeatureState(sectionId: DashboardCatalogSectionId): ReleaseFeatureState {
  const achievements = achievementTemplates(sectionId);
  return {
    achievementsEnabled: supportsAchievementsForSection(sectionId),
    commentaryEnabled: false,
    behindTheScenesEnabled: false,
    behindTheScenesUrl: '',
    achievements,
    bonusItems: [],
  };
}

export function achievementTemplates(sectionId: DashboardCatalogSectionId): DraftAchievement[] {
  if (sectionId === 'music') {
    return [
      { code: 'front_to_back', title: 'Front to Back', description: 'Listen to every track on this release.', triggerType: 'all_tracks_listened', enabled: true, iconUrl: getAchievementIconPath('front_to_back') },
      { code: 'first_wave', title: 'First Wave', description: 'Listen to this release during its launch window.', triggerType: 'release_completed_launch_window', enabled: true, iconUrl: getAchievementIconPath('first_wave') },
      { code: 'no_skips', title: 'No Skips', description: 'Listen from the first track to the last without skipping.', triggerType: 'album_no_skips', enabled: true, iconUrl: getAchievementIconPath('no_skips') },
      { code: 'nightbird', title: 'Nightbird', description: 'Listen to the release between 10 PM and 4 AM.', triggerType: 'release_completed_at_night', enabled: true, iconUrl: getAchievementIconPath('nightbird') },
      { code: 'heavy_rotation', title: 'Heavy Rotation', description: 'Listen to the full release three times.', triggerType: 'release_completed_three_sessions', enabled: true, iconUrl: getAchievementIconPath('heavy_rotation') },
      { code: 'joined_the_orbit', title: 'Joined the Orbit', description: 'Follow the creator from this release.', triggerType: 'creator_followed_from_product', enabled: true, iconUrl: getAchievementIconPath('joined_the_orbit') },
      { code: 'left_your_mark', title: 'Left Your Mark', description: 'Write a review for this release.', triggerType: 'review_created', enabled: true, iconUrl: getAchievementIconPath('left_your_mark') },
      { code: 'signal_boost', title: 'Signal Boost', description: 'Get someone to open this release from your shared link.', triggerType: 'shared_link_opened', enabled: true, iconUrl: getAchievementIconPath('signal_boost') },
      { code: 'overachiever', title: 'Overachiever', description: 'Unlock every other achievement to claim the creator\'s final reward.', triggerType: 'all_achievements_unlocked', enabled: true, iconUrl: getAchievementIconPath('overachiever') },
    ];
  }

  return [];
}

export function normalizeFeatureStateForSection(state: ReleaseFeatureState, sectionId: DashboardCatalogSectionId): ReleaseFeatureState {
  const templates = achievementTemplates(sectionId);
  const existing = new Map(state.achievements.map(achievement => [achievement.code, achievement]));
  const supportsAchievements = supportsAchievementsForSection(sectionId);
  const achievements = templates.map(template => {
    const current = existing.get(template.code);
    return {
      ...template,
      enabled: supportsAchievements
        ? template.code === OVERACHIEVER_CODE || (current?.enabled ?? template.enabled)
        : false,
      iconUrl: template.iconUrl ?? current?.iconUrl ?? null,
    };
  });
  return {
    ...state,
    achievementsEnabled: supportsAchievements ? state.achievementsEnabled : false,
    bonusItems: state.bonusItems.map(item => ({
      ...item,
      visibility: supportsAchievements ? 'achievement' : 'free',
      achievementCode: supportsAchievements ? 'overachiever' : '',
    })),
    achievements,
  };
}

export function validateReleaseFeatureState(state: ReleaseFeatureState, sectionId: DashboardCatalogSectionId) {
  const supportsAchievements = supportsAchievementsForSection(sectionId);
  const selectedAchievementCount = state.achievements.filter(achievement => achievement.enabled && achievement.code !== OVERACHIEVER_CODE).length;

  if (supportsAchievements && state.achievementsEnabled && selectedAchievementCount < REQUIRED_SELECTED_ACHIEVEMENTS) {
    return `Select at least ${REQUIRED_SELECTED_ACHIEVEMENTS} achievements plus Overachiever.`;
  }

  return '';
}

export function buildAchievementRows(productId: string, state: ReleaseFeatureState, sectionId: DashboardCatalogSectionId) {
  if (!supportsAchievementsForSection(sectionId) || !state.achievementsEnabled) return [];

  return state.achievements
    .filter(achievement => achievement.enabled)
    .map((achievement, index) => {
      return {
        product_id: productId,
        code: achievement.code,
        title: achievement.title,
        description: achievement.description,
        trigger_type: achievement.triggerType,
        trigger_config: {},
        reward_product_id: null,
        reward_config: {
          commentary_enabled: state.commentaryEnabled,
          final_reward_required: achievement.code === 'overachiever',
          bonus_items: [],
        },
        points: 0,
        icon: getAchievementIconPath(achievement.code) ?? achievement.iconUrl ?? null,
        sort_order: index,
        is_secret: false,
      };
    });
}

export function buildFeatureAssetRows(_productId: string, _state: ReleaseFeatureState) {
  return [];
}

export function featureAssetTypes() {
  return ['behind_the_scenes', 'bonus_free', 'bonus_achievement'];
}

export function hydrateReleaseFeatureState(
  sectionId: DashboardCatalogSectionId,
  achievementRows: SavedProductAchievement[],
  _assetRows: SavedProductAsset[],
) {
  const base = createReleaseFeatureState(sectionId);
  const achievementByCode = new Map(achievementRows.map(achievement => [achievement.code, achievement]));
  let commentaryEnabled = false;

  achievementRows.forEach(achievement => {
    commentaryEnabled = commentaryEnabled || achievement.reward_config?.commentary_enabled === true;
  });

  return normalizeFeatureStateForSection({
    ...base,
    achievementsEnabled: supportsAchievementsForSection(sectionId) && achievementRows.length > 0,
    commentaryEnabled,
    behindTheScenesEnabled: false,
    behindTheScenesUrl: '',
    achievements: base.achievements.map(template => {
      const saved = achievementByCode.get(template.code);
      return saved ? {
        ...template,
        title: saved.title || template.title,
        description: saved.description || template.description,
        triggerType: saved.triggerType || template.triggerType,
        iconUrl: template.iconUrl || saved.iconUrl,
        enabled: true,
      } : {
        ...template,
        enabled: template.code === OVERACHIEVER_CODE,
      };
    }),
    bonusItems: [],
  }, sectionId);
}

export async function saveReleaseFeatures({
  supabaseClient,
  productId,
  sectionId,
  state,
}: {
  supabaseClient: typeof supabase;
  productId: string;
  sectionId: DashboardCatalogSectionId;
  state: ReleaseFeatureState;
}) {
  const validationError = validateReleaseFeatureState(state, sectionId);
  if (validationError) return validationError;

  const { error: deleteAchievementsError } = await supabaseClient
    .from('product_achievements')
    .delete()
    .eq('product_id', productId);
  if (deleteAchievementsError) return deleteAchievementsError.message;

  const { error: deleteAssetsError } = await supabaseClient
    .from('product_assets')
    .delete()
    .eq('product_id', productId)
    .in('asset_type', featureAssetTypes());
  if (deleteAssetsError) return deleteAssetsError.message;

  const achievementRows = buildAchievementRows(productId, state, sectionId);
  if (achievementRows.length) {
    const { error } = await supabaseClient.from('product_achievements').insert(achievementRows);
    if (error) return error.message;
  }

  const assetRows = buildFeatureAssetRows(productId, state);
  if (assetRows.length) {
    const { error } = await supabaseClient.from('product_assets').insert(assetRows);
    if (error) return error.message;
  }

  return '';
}

export function DashboardReleaseFeatures({
  sectionId,
  state,
  onChange,
}: {
  sectionId: DashboardCatalogSectionId;
  userId: string;
  state: ReleaseFeatureState;
  onChange: (next: ReleaseFeatureState) => void;
}) {
  const supportsAchievements = supportsAchievementsForSection(sectionId);
  const selectedAchievementCount = state.achievements.filter(achievement => achievement.enabled && achievement.code !== OVERACHIEVER_CODE).length;
  const achievementsOn = supportsAchievements && state.achievementsEnabled;
  const minimumSelectionReached = selectedAchievementCount >= REQUIRED_SELECTED_ACHIEVEMENTS;

  function patch(patchState: Partial<ReleaseFeatureState>) {
    onChange({ ...state, ...patchState });
  }

  function ensureMinimumAchievements(achievements: DraftAchievement[]) {
    let selectedCount = achievements.filter(achievement => achievement.enabled && achievement.code !== OVERACHIEVER_CODE).length;
    if (selectedCount >= REQUIRED_SELECTED_ACHIEVEMENTS) return achievements;

    return achievements.map(achievement => {
      if (achievement.code === OVERACHIEVER_CODE) return { ...achievement, enabled: true };
      if (achievement.enabled || selectedCount >= REQUIRED_SELECTED_ACHIEVEMENTS) return achievement;
      selectedCount += 1;
      return { ...achievement, enabled: true };
    });
  }

  function toggleAchievements() {
    if (!supportsAchievements) return;
    const nextEnabled = !state.achievementsEnabled;
    patch({
      achievementsEnabled: nextEnabled,
      achievements: nextEnabled
        ? ensureMinimumAchievements(state.achievements)
        : state.achievements.map(achievement => ({
          ...achievement,
          enabled: achievement.code === OVERACHIEVER_CODE,
        })),
    });
  }

  function toggleAchievement(code: string) {
    if (code === OVERACHIEVER_CODE) return;
    const achievement = state.achievements.find(item => item.code === code);
    if (!achievement) return;
    if (achievement.enabled && selectedAchievementCount <= REQUIRED_SELECTED_ACHIEVEMENTS) return;

    patch({
      achievements: state.achievements.map(item => (
        item.code === code ? { ...item, enabled: !item.enabled } : item.code === OVERACHIEVER_CODE ? { ...item, enabled: true } : item
      )),
    });
  }

  return (
    <section className="dashboard-form-section">
      <SectionHeader
        title="Achievements"
        description="Choose which achievements fans can earn from this music release."
        action={supportsAchievements ? (
          <button
            type="button"
            role="switch"
            aria-checked={achievementsOn}
            className={achievementsOn ? 'settings-toggle settings-toggle-on' : 'settings-toggle'}
            onClick={toggleAchievements}
          />
        ) : undefined}
      />

      <div className="dashboard-form-step">
        {!supportsAchievements ? (
          <p className="library-empty-text">Achievements are limited to music releases in v1.0.</p>
        ) : achievementsOn ? (
          <>
            <p className="dashboard-form-note">Select at least {REQUIRED_SELECTED_ACHIEVEMENTS} achievements. Overachiever is always included.</p>
            <div className="dashboard-list-surface library-achievement-list dashboard-achievement-picker">
              {state.achievements.map(achievement => (
                <label key={achievement.code} className="dashboard-list-row library-achievement-row dashboard-achievement-choice-row">
                  <span className="library-achievement-icon" aria-hidden="true">
                    <AchievementIconGlyph code={achievement.code} label={achievement.title} />
                  </span>
                  <span className="dashboard-achievement-copy">
                    <span className="os-type-card-title">{achievement.title}</span>
                    <span className="os-type-body-small">{achievement.description}</span>
                  </span>
                  <span className="dashboard-achievement-toggle">
                    <input
                      type="checkbox"
                      checked={achievement.enabled || achievement.code === OVERACHIEVER_CODE}
                      disabled={achievement.code === OVERACHIEVER_CODE || (achievement.enabled && selectedAchievementCount <= REQUIRED_SELECTED_ACHIEVEMENTS)}
                      onChange={() => toggleAchievement(achievement.code)}
                    />
                  </span>
                </label>
              ))}
            </div>
            {!minimumSelectionReached && (
              <p className="dashboard-form-note dashboard-form-note-warning">Select at least {REQUIRED_SELECTED_ACHIEVEMENTS} achievements plus Overachiever.</p>
            )}
          </>
        ) : (
          <p className="library-empty-text">Achievements are turned off for this release.</p>
        )}
      </div>
    </section>
  );
}
