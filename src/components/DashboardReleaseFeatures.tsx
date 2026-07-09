'use client';

import { useMemo } from 'react';
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

export function createReleaseFeatureState(sectionId: DashboardCatalogSectionId): ReleaseFeatureState {
  const achievements = achievementTemplates(sectionId);
  return {
    achievementsEnabled: sectionId !== 'assets',
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
      { code: 'front_to_back', title: 'Front to Back', description: 'Listen to every track on this release.', triggerType: 'all_tracks_listened', enabled: false, points: 50 },
      { code: 'no_skips', title: 'No Skips', description: 'Listen from the first track to the last without skipping.', triggerType: 'album_no_skips', enabled: false, points: 75 },
      { code: 'nightbird', title: 'Nightbird', description: 'Listen to the release between 10 PM and 4 AM.', triggerType: 'release_completed_at_night', enabled: false, hidden: true, points: 50 },
      { code: 'heavy_rotation', title: 'Heavy Rotation', description: 'Listen to the full release three times.', triggerType: 'release_completed_three_sessions', enabled: false, points: 75 },
      { code: 'first_wave', title: 'First Wave', description: 'Listen to the full release within two weeks of launch.', triggerType: 'release_completed_launch_window', enabled: false, points: 50 },
      { code: 'directors_cut', title: 'Director\'s Cut', description: 'Listen to the full release in Commentary Mode.', triggerType: 'commentary_album_completed', enabled: false, points: 75 },
      { code: 'joined_the_orbit', title: 'Joined the Orbit', description: 'Follow the creator from this release.', triggerType: 'creator_followed_from_product', enabled: false, points: 50 },
      { code: 'left_your_mark', title: 'Left Your Mark', description: 'Write a review for this release.', triggerType: 'review_created', enabled: false, points: 50 },
      { code: 'signal_boost', title: 'Signal Boost', description: 'Get someone to open this release from your shared link.', triggerType: 'shared_link_opened', enabled: false, hidden: true, points: 75 },
      { code: 'overachiever', title: 'Overachiever', description: 'Unlock every other enabled achievement to claim the creator\'s final reward.', triggerType: 'all_achievements_unlocked', enabled: true, locked: true, hidden: false, points: 100 },
    ];
  }

  if (sectionId === 'books') {
    return [
      { code: 'cover_to_cover', title: 'Cover to Cover', description: 'Read the entire book.', triggerType: 'book_completed', enabled: false, points: 50 },
      { code: 'page_turner', title: 'Page-Turner', description: 'Read 25 percent of the book in one session.', triggerType: 'book_quarter_single_session', enabled: false, points: 50 },
      { code: 'no_bookmark_needed', title: 'No Bookmark Needed', description: 'Finish the book in a single reading session.', triggerType: 'book_completed_single_session', enabled: false, points: 75 },
      { code: 'night_owl', title: 'Night Owl', description: 'Read between 10 PM and 4 AM.', triggerType: 'book_read_at_night', enabled: false, hidden: true, points: 50 },
      { code: 'back_for_more', title: 'Back for More', description: 'Return on another day and keep reading.', triggerType: 'book_progress_on_second_day', enabled: false, points: 50 },
      { code: 'first_edition', title: 'First Edition', description: 'Finish the book within two weeks of launch.', triggerType: 'book_completed_launch_window', enabled: false, points: 50 },
      { code: 'joined_the_orbit', title: 'Joined the Orbit', description: 'Follow the creator from this book.', triggerType: 'creator_followed_from_product', enabled: false, points: 50 },
      { code: 'left_your_mark', title: 'Left Your Mark', description: 'Write a review for this book.', triggerType: 'review_created', enabled: false, points: 50 },
      { code: 'signal_boost', title: 'Signal Boost', description: 'Get someone to open this book from your shared link.', triggerType: 'shared_link_opened', enabled: false, hidden: true, points: 75 },
      { code: 'overachiever', title: 'Overachiever', description: 'Unlock every other enabled achievement to claim the creator\'s final reward.', triggerType: 'all_achievements_unlocked', enabled: true, locked: true, hidden: false, points: 100 },
    ];
  }

  return [];
}

export function normalizeFeatureStateForSection(state: ReleaseFeatureState, sectionId: DashboardCatalogSectionId): ReleaseFeatureState {
  const templates = achievementTemplates(sectionId);
  const existing = new Map(state.achievements.map(achievement => [achievement.code, achievement]));
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
    achievementsEnabled: sectionId === 'assets' ? false : state.achievementsEnabled,
    bonusItems: state.bonusItems.map(item => ({
      ...item,
      visibility: item.visibility === 'achievement' && sectionId === 'assets' ? 'free' : item.visibility,
    })),
    achievements,
  };
}

export function validateReleaseFeatureState(state: ReleaseFeatureState, sectionId: DashboardCatalogSectionId) {
  const supportsAchievements = sectionId !== 'assets';
  const enabledCodes = new Set(state.achievements.filter(achievement => achievement.enabled).map(achievement => achievement.code));
  const overachieverRewards = state.bonusItems.filter(item => item.visibility === 'achievement' && item.achievementCode === 'overachiever');

  if (state.behindTheScenesEnabled && !state.behindTheScenesUrl.trim()) {
    return 'Upload a behind-the-scenes file or turn that option off.';
  }

  if (overachieverRewards.length > 1) {
    return 'Only one bonus reward can be attached to Overachiever.';
  }

  if (supportsAchievements && state.achievementsEnabled && state.bonusItems.length > 0 && overachieverRewards.length === 0) {
    return 'Choose one bonus content item to unlock from Overachiever.';
  }

  for (const item of state.bonusItems) {
    if (!item.title.trim() || !item.fileUrl.trim()) {
      return 'Each bonus content item needs a title and uploaded file.';
    }

    if (item.visibility === 'achievement') {
      if (!supportsAchievements || !state.achievementsEnabled) {
        return 'Turn on achievements before locking bonus content behind one.';
      }

      if (!item.achievementCode || !enabledCodes.has(item.achievementCode)) {
        return 'Choose an enabled achievement for each locked bonus item.';
      }
    }
  }

  return '';
}

export function buildAchievementRows(productId: string, state: ReleaseFeatureState, sectionId: DashboardCatalogSectionId) {
  if (sectionId === 'assets' || !state.achievementsEnabled) return [];

  const rewardMap = new Map<string, DraftBonusContent[]>();
  state.bonusItems
    .filter(item => item.visibility === 'achievement')
    .forEach(item => {
      const current = rewardMap.get(item.achievementCode) ?? [];
      rewardMap.set(item.achievementCode, [...current, item]);
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
        icon: null,
        sort_order: index,
        is_secret: achievement.code === 'overachiever' ? false : achievement.hidden ?? false,
      };
    });
}

export function buildFeatureAssetRows(productId: string, state: ReleaseFeatureState) {
  const rows = [];

  if (state.behindTheScenesEnabled && state.behindTheScenesUrl.trim()) {
    rows.push({
      product_id: productId,
      asset_type: 'behind_the_scenes',
      title: 'Behind-the-Scenes',
      file_url: state.behindTheScenesUrl.trim(),
      storage_path: null,
      is_downloadable: true,
      sort_order: 100,
    });
  }

  state.bonusItems.forEach((item, index) => {
    rows.push({
      product_id: productId,
      asset_type: item.visibility === 'achievement' ? 'bonus_achievement' : 'bonus_free',
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

  const behindTheScenes = assetRows.find(asset => asset.asset_type === 'behind_the_scenes');
  const bonusItems = assetRows
    .filter(asset => asset.asset_type === 'bonus_free' || asset.asset_type === 'bonus_achievement')
    .map(asset => ({
      title: asset.title ?? '',
      fileUrl: asset.file_url ?? '',
      visibility: asset.asset_type === 'bonus_achievement' ? 'achievement' as const : 'free' as const,
      achievementCode: asset.file_url ? rewardByFileUrl.get(asset.file_url) ?? '' : '',
    }));

  return normalizeFeatureStateForSection({
    ...base,
    achievementsEnabled: sectionId !== 'assets' && achievementRows.length > 0,
    commentaryEnabled,
    behindTheScenesEnabled: Boolean(behindTheScenes?.file_url),
    behindTheScenesUrl: behindTheScenes?.file_url ?? '',
    achievements: base.achievements.map(template => {
      const saved = achievementByCode.get(template.code);
      return saved ? { ...template, enabled: true, hidden: saved.is_secret ?? saved.hidden ?? template.hidden ?? false } : template;
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
  const supportsAchievements = sectionId !== 'assets';
  const enabledAchievements = state.achievements.filter(achievement => achievement.enabled);
  const overachieverAssigned = state.bonusItems.some(item => item.visibility === 'achievement' && item.achievementCode === 'overachiever');
  const achievementChoices = useMemo(() => enabledAchievements, [enabledAchievements]);

  function patch(patchState: Partial<ReleaseFeatureState>) {
    onChange({ ...state, ...patchState });
  }

  function toggleAchievement(code: string) {
    const achievements = state.achievements.map(achievement =>
      achievement.code === code && !achievement.locked ? { ...achievement, enabled: !achievement.enabled } : achievement,
    );
    patch({ achievements });
  }

  function toggleHiddenAchievement(code: string) {
    const achievements = state.achievements.map(achievement =>
      achievement.code === code && achievement.code !== 'overachiever' ? { ...achievement, hidden: !achievement.hidden } : achievement,
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
    const firstAchievement = achievementChoices[0]?.code ?? '';
    patch({
      bonusItems: [
        ...state.bonusItems,
        { title: '', fileUrl: '', visibility: 'free', achievementCode: firstAchievement },
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
            <div className="dashboard-field-label">Release Features</div>
            <p>Enable achievements and optional creator features before publishing.</p>
          </div>
        </div>

        <div className="settings-field">
          <div className="settings-row">
            <div className="settings-row-copy">
              <div className="os-type-card-title">Achievements</div>
              <p className="os-type-body-small">
                {supportsAchievements ? 'Music and books can include achievements.' : 'Sample packs do not support achievements.'}
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
                  <label className="dashboard-achievement-enable">
                    <input
                      type="checkbox"
                      checked={achievement.enabled}
                      disabled={achievement.locked}
                      onChange={() => toggleAchievement(achievement.code)}
                    />
                    <span className="dashboard-achievement-copy">
                      <span className="os-type-card-title">{achievement.title}</span>
                      <span className="os-type-body-small">{achievement.description}</span>
                    </span>
                  </label>
                  <label className="dashboard-achievement-secret">
                    <input
                      type="checkbox"
                      checked={Boolean(achievement.hidden)}
                      disabled={!achievement.enabled || achievement.code === 'overachiever'}
                      onChange={() => toggleHiddenAchievement(achievement.code)}
                    />
                    Hidden
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="settings-field">
          <div className="settings-row">
            <div className="settings-row-copy">
              <div className="os-type-card-title">Commentary Mode</div>
              <p className="os-type-body-small">Mark this release as having creator commentary.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state.commentaryEnabled}
              className={state.commentaryEnabled ? 'settings-toggle settings-toggle-on' : 'settings-toggle'}
              onClick={() => patch({ commentaryEnabled: !state.commentaryEnabled })}
            />
          </div>

          <div className="settings-row">
            <div className="settings-row-copy">
              <div className="os-type-card-title">Behind-the-Scenes Content</div>
              <p className="os-type-body-small">Attach extra media for owners.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state.behindTheScenesEnabled}
              className={state.behindTheScenesEnabled ? 'settings-toggle settings-toggle-on' : 'settings-toggle'}
              onClick={() => patch({ behindTheScenesEnabled: !state.behindTheScenesEnabled })}
            />
          </div>

          {state.behindTheScenesEnabled && (
            <UploadField
              label="Behind-the-Scenes File"
              folder="products/bonus"
              userId={userId}
              value={state.behindTheScenesUrl}
              accept="video/*,audio/*,application/pdf,.pdf,.zip"
              buttonLabel="Upload behind-the-scenes file"
              onChange={nextValue => patch({ behindTheScenesUrl: nextValue })}
            />
          )}
        </div>
      </section>

      <section className="dashboard-form-step">
        <div className="dashboard-form-section-head">
          <div className="dashboard-form-section-copy">
            <div className="dashboard-field-label">Bonus Content</div>
            <p>Add extras for everyone or lock them behind achievements.</p>
          </div>
          <button className="os-button os-button-secondary os-button-compact" type="button" onClick={addBonusItem}>
            Add Bonus Content
          </button>
        </div>

        {state.bonusItems.length === 0 ? (
          <p className="library-empty-text">No bonus content yet.</p>
        ) : (
          <div className="dashboard-feature-list">
            {state.bonusItems.map((item, index) => {
              const assigningOverachiever = item.visibility === 'achievement' && item.achievementCode === 'overachiever';
              const overachieverDisabled = overachieverAssigned && !assigningOverachiever;
              return (
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
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Visibility</div>
                    <select
                      className="os-input-field"
                      value={item.visibility}
                      onChange={event => updateBonus(index, { visibility: event.target.value as DraftBonusContent['visibility'] })}
                    >
                      <option value="free">Available to all Library owners</option>
                      <option value="achievement" disabled={!achievementChoices.length}>Locked behind achievement</option>
                    </select>
                  </label>
                  {item.visibility === 'achievement' && (
                    <label className="dashboard-field">
                      <div className="dashboard-field-label">Unlock Achievement</div>
                      <select
                        className="os-input-field"
                        value={item.achievementCode}
                        onChange={event => updateBonus(index, { achievementCode: event.target.value })}
                      >
                        {achievementChoices.map(achievement => (
                          <option key={achievement.code} value={achievement.code} disabled={achievement.code === 'overachiever' && overachieverDisabled}>
                            {achievement.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button className="os-button os-button-ghost os-button-compact" type="button" onClick={() => removeBonusItem(index)}>
                    Remove Bonus
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
