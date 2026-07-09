'use client';

import { UploadField } from '@/components/UploadField';
import type { DashboardCatalogSectionId } from '@/lib/dashboardCatalog';
import { supabase } from '@/lib/supabase';

export type DraftAchievement = {
  code: string;
  title: string;
  description: string;
  triggerType: string;
  enabled: boolean;
  hidden?: boolean;
  locked?: boolean;
  points?: number;
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

const SUPABASE_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? '';

function achievementIconUrl(fileName: string) {
  return SUPABASE_PUBLIC_URL
    ? `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/media/achievements/${fileName}`
    : null;
}

function supportsAchievementsForSection(sectionId: DashboardCatalogSectionId) {
  return sectionId === 'music';
}

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
      { code: 'front_to_back', title: 'Front to Back', description: 'Listen to every track on this release.', triggerType: 'all_tracks_listened', enabled: false, points: 50, iconUrl: achievementIconUrl('front_to_back.png') },
      { code: 'no_skips', title: 'No Skips', description: 'Listen from the first track to the last without skipping.', triggerType: 'album_no_skips', enabled: false, points: 75, iconUrl: achievementIconUrl('no_skips.png') },
      { code: 'nightbird', title: 'Nightbird', description: 'Listen to the release between 10 PM and 4 AM.', triggerType: 'release_completed_at_night', enabled: false, hidden: true, points: 50, iconUrl: achievementIconUrl('nightbird.png') },
      { code: 'heavy_rotation', title: 'Heavy Rotation', description: 'Listen to the full release three times.', triggerType: 'release_completed_three_sessions', enabled: false, points: 75, iconUrl: achievementIconUrl('heavy_rotation.png') },
      { code: 'joined_the_orbit', title: 'Joined the Orbit', description: 'Follow the creator from this release.', triggerType: 'creator_followed_from_product', enabled: false, points: 50, iconUrl: achievementIconUrl('joined_the_orbit.png') },
      { code: 'left_your_mark', title: 'Left Your Mark', description: 'Write a review for this release.', triggerType: 'review_created', enabled: false, points: 50, iconUrl: achievementIconUrl('left_your_mark.png') },
      { code: 'signal_boost', title: 'Signal Boost', description: 'Get someone to open this release from your shared link.', triggerType: 'shared_link_opened', enabled: false, hidden: true, points: 75, iconUrl: achievementIconUrl('signal_boost.png') },
      { code: 'overachiever', title: 'Overachiever', description: 'Unlock every other enabled achievement to claim the creator\'s final reward.', triggerType: 'all_achievements_unlocked', enabled: true, locked: true, hidden: false, points: 100, iconUrl: achievementIconUrl('overachiever.png') },
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
      enabled: template.locked ? true : current?.enabled ?? template.enabled,
      hidden: template.code === 'overachiever' ? false : current?.hidden ?? template.hidden ?? false,
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
  const enabledCodes = new Set(state.achievements.filter(achievement => achievement.enabled).map(achievement => achievement.code));
  const overachieverRewards = state.bonusItems.filter(item => item.visibility === 'achievement' && item.achievementCode === 'overachiever');

  if (supportsAchievements && state.achievementsEnabled && state.bonusItems.length > 0 && overachieverRewards.length !== state.bonusItems.length) {
    return 'Bonus content unlocks from Overachiever in v1.0.';
  }

  for (const item of state.bonusItems) {
    if (!item.title.trim() || !item.fileUrl.trim()) {
      return 'Each bonus content item needs a title and uploaded file.';
    }

    if (item.visibility === 'achievement') {
      if (!supportsAchievements || !state.achievementsEnabled) {
        return 'Turn on achievements before locking bonus content behind one.';
      }

      if (item.achievementCode !== 'overachiever' || !enabledCodes.has('overachiever')) {
        return 'Bonus content unlocks from Overachiever in v1.0.';
      }
    }
  }

  return '';
}

export function buildAchievementRows(productId: string, state: ReleaseFeatureState, sectionId: DashboardCatalogSectionId) {
  if (!supportsAchievementsForSection(sectionId) || !state.achievementsEnabled) return [];

  const rewardMap = new Map<string, DraftBonusContent[]>();
  state.bonusItems
    .filter(item => item.fileUrl.trim())
    .forEach(item => {
      const current = rewardMap.get('overachiever') ?? [];
      rewardMap.set('overachiever', [...current, { ...item, visibility: 'achievement', achievementCode: 'overachiever' }]);
    });

  return state.achievements
    .filter(achievement => achievement.enabled)
    .map((achievement, index) => {
      const bonusItems = rewardMap.get(achievement.code) ?? [];
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
          bonus_items: bonusItems.map(item => ({
            title: item.title.trim(),
            file_url: item.fileUrl.trim(),
          })),
        },
        points: achievement.points ?? (achievement.code === 'overachiever' ? 100 : 25),
        icon: achievement.iconUrl ?? null,
        sort_order: index,
        is_secret: achievement.hidden ?? false,
      };
    });
}

export function buildFeatureAssetRows(productId: string, state: ReleaseFeatureState) {
  if (!state.achievementsEnabled) return [];

  const rows: Array<{
    product_id: string;
    asset_type: 'bonus_achievement';
    title: string;
    file_url: string;
    storage_path: null;
    is_downloadable: boolean;
    sort_order: number;
  }> = [];

  state.bonusItems.forEach((item, index) => {
    rows.push({
      product_id: productId,
      asset_type: 'bonus_achievement',
      title: item.title.trim(),
      file_url: item.fileUrl.trim(),
      storage_path: null,
      is_downloadable: true,
      sort_order: 200 + index,
    });
  });

  return rows;
}

export function featureAssetTypes() {
  return ['behind_the_scenes', 'bonus_free', 'bonus_achievement'];
}

export function hydrateReleaseFeatureState(
  sectionId: DashboardCatalogSectionId,
  achievementRows: SavedProductAchievement[],
  assetRows: SavedProductAsset[],
) {
  const base = createReleaseFeatureState(sectionId);
  const achievementByCode = new Map(achievementRows.map(achievement => [achievement.code, achievement]));
  const rewardByFileUrl = new Map<string, string>();
  let commentaryEnabled = false;

  achievementRows.forEach(achievement => {
    commentaryEnabled = commentaryEnabled || achievement.reward_config?.commentary_enabled === true;
    const bonusItems = Array.isArray(achievement.reward_config?.bonus_items)
      ? achievement.reward_config?.bonus_items
      : [];
    bonusItems.forEach(item => {
      if (item && typeof item === 'object' && 'file_url' in item && typeof item.file_url === 'string') {
        rewardByFileUrl.set(item.file_url, achievement.code);
      }
    });
  });

  const bonusItems = assetRows
    .filter(asset => asset.asset_type === 'behind_the_scenes' || asset.asset_type === 'bonus_free' || asset.asset_type === 'bonus_achievement')
    .map(asset => ({
      title: asset.title ?? '',
      fileUrl: asset.file_url ?? '',
      visibility: 'achievement' as const,
      achievementCode: asset.file_url ? rewardByFileUrl.get(asset.file_url) ?? 'overachiever' : 'overachiever',
    }));

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
        iconUrl: saved.iconUrl || template.iconUrl,
        enabled: true,
        hidden: saved.is_secret ?? saved.hidden ?? template.hidden ?? false,
      } : template;
    }),
    bonusItems,
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
  userId,
  state,
  onChange,
}: {
  sectionId: DashboardCatalogSectionId;
  userId: string;
  state: ReleaseFeatureState;
  onChange: (next: ReleaseFeatureState) => void;
}) {
  const supportsAchievements = supportsAchievementsForSection(sectionId);
  const enabledAchievements = state.achievements.filter(achievement => achievement.enabled);
  const overachieverEnabled = enabledAchievements.some(achievement => achievement.code === 'overachiever');

  function patch(patchState: Partial<ReleaseFeatureState>) {
    onChange({ ...state, ...patchState });
  }

  function toggleAchievement(code: string) {
    const achievements = state.achievements.map(achievement =>
      achievement.code === code && !achievement.locked ? { ...achievement, enabled: !achievement.enabled } : achievement,
    );
    patch({ achievements });
  }

  function updateBonus(index: number, patchItem: Partial<DraftBonusContent>) {
    patch({
      bonusItems: state.bonusItems.map((item, itemIndex) => (
        itemIndex === index ? { ...item, ...patchItem } : item
      )),
    });
  }

  function addBonusItem() {
    patch({
      bonusItems: [
        ...state.bonusItems,
        { title: '', fileUrl: '', visibility: 'achievement', achievementCode: 'overachiever' },
      ],
    });
  }

  function removeBonusItem(index: number) {
    patch({ bonusItems: state.bonusItems.filter((_, itemIndex) => itemIndex !== index) });
  }

  return (
    <>
      <section className="dashboard-form-step">
        <div className="dashboard-form-section-head">
          <div className="dashboard-form-section-copy">
            <div className="dashboard-field-label">Release Achievements</div>
            <p>Choose the evergreen music achievements fans can earn in v1.0.</p>
          </div>
        </div>

        <div className="settings-field">
          <div className="settings-row">
            <div className="settings-row-copy">
              <div className="os-type-card-title">Achievements</div>
              <p className="os-type-body-small">
                {supportsAchievements ? 'Music releases can include the v1.0 achievement set.' : 'Achievements are limited to music releases in v1.0.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={supportsAchievements && state.achievementsEnabled}
              className={supportsAchievements && state.achievementsEnabled ? 'settings-toggle settings-toggle-on' : 'settings-toggle'}
              disabled={!supportsAchievements}
              onClick={() => supportsAchievements && patch({ achievementsEnabled: !state.achievementsEnabled })}
            />
          </div>

          {supportsAchievements && state.achievementsEnabled && (
            <div className="dashboard-feature-list">
              {state.achievements.map(achievement => (
                <div key={achievement.code} className="dashboard-feature-row dashboard-achievement-row">
                  <div className="dashboard-achievement-art" aria-hidden="true">
                    {achievement.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={achievement.iconUrl} alt="" />
                    ) : (
                      achievement.title.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="dashboard-achievement-copy">
                    <span className="os-type-card-title">{achievement.title}</span>
                    <span className="os-type-body-small">{achievement.description}</span>
                  </div>
                  <label className="dashboard-achievement-toggle">
                    <input
                      type="checkbox"
                      checked={achievement.enabled}
                      disabled={achievement.locked}
                      onChange={() => toggleAchievement(achievement.code)}
                    />
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-form-step">
        <div className="dashboard-form-section-head">
          <div className="dashboard-form-section-copy">
            <div className="dashboard-field-label">Bonus Content</div>
            <p>Upload unlockable extras. Fans receive them after earning Overachiever.</p>
          </div>
          <button className="os-button os-button-secondary os-button-compact" type="button" onClick={addBonusItem} disabled={!supportsAchievements || !state.achievementsEnabled || !overachieverEnabled}>
            Add Bonus Content
          </button>
        </div>

        {(!supportsAchievements || !state.achievementsEnabled) && (
          <p className="library-empty-text">Turn on music achievements to attach unlockable bonus content.</p>
        )}

        {state.bonusItems.length === 0 ? (
          <p className="library-empty-text">No bonus content yet.</p>
        ) : (
          <div className="dashboard-feature-list">
            {state.bonusItems.map((item, index) => (
                <div key={index} className="dashboard-feature-card">
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Bonus Title</div>
                    <input className="os-input-field" value={item.title} onChange={event => updateBonus(index, { title: event.target.value })} />
                  </label>
                  <UploadField
                    label="Bonus File"
                    folder="products/bonus"
                    userId={userId}
                    value={item.fileUrl}
                    accept="audio/*,video/*,application/pdf,.pdf,.zip,image/*"
                    buttonLabel="Upload bonus file"
                    onChange={nextValue => updateBonus(index, { fileUrl: nextValue })}
                  />
                  <div className="dashboard-bonus-unlock-note">
                    Unlocks from Overachiever
                  </div>
                  <button className="os-button os-button-ghost os-button-compact" type="button" onClick={() => removeBonusItem(index)}>
                    Remove Bonus
                  </button>
                </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
