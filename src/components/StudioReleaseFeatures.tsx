'use client';

import { AchievementIconGlyph } from '@/components/AchievementIconGlyph';
import { SectionHeader } from '@/components/Ui';
import { UploadField } from '@/components/UploadField';
import type { StudioCatalogSectionId } from '@/lib/studioCatalog';
import { getAchievementIconPath } from '@/lib/achievementIcons';
import { replaceStudioReleaseFeatures } from '@/lib/domain/studioPublishing';

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
  visibility: 'achievement';
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

function supportsAchievementsForSection(sectionId: StudioCatalogSectionId) {
  return sectionId === 'music';
}

const OVERACHIEVER_CODE = 'overachiever';
const EMPTY_BONUS_ITEM: DraftBonusContent = {
  title: '',
  fileUrl: '',
  visibility: 'achievement',
  achievementCode: OVERACHIEVER_CODE,
};

export function createReleaseFeatureState(sectionId: StudioCatalogSectionId): ReleaseFeatureState {
  const achievements = achievementTemplates(sectionId);
  return {
    achievementsEnabled: supportsAchievementsForSection(sectionId),
    commentaryEnabled: false,
    behindTheScenesEnabled: false,
    behindTheScenesUrl: '',
    achievements,
    bonusItems: [EMPTY_BONUS_ITEM],
  };
}

export function achievementTemplates(sectionId: StudioCatalogSectionId): DraftAchievement[] {
  if (sectionId === 'music') {
    return [
      { code: 'front_to_back', title: 'Front to Back', description: 'Listen to every track on this release.', triggerType: 'all_tracks_listened', enabled: true, iconUrl: getAchievementIconPath('front_to_back') },
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

export function normalizeFeatureStateForSection(state: ReleaseFeatureState, sectionId: StudioCatalogSectionId): ReleaseFeatureState {
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
    bonusItems: normalizeBonusItems(state.bonusItems).map(item => ({
      ...item,
      visibility: 'achievement',
      achievementCode: supportsAchievements ? OVERACHIEVER_CODE : '',
    })),
    achievements,
  };
}

function normalizeBonusItems(items: DraftBonusContent[]) {
  const normalized = items.length ? items : [EMPTY_BONUS_ITEM];
  return normalized.slice(0, 1).map(item => ({
    title: item.title,
    fileUrl: item.fileUrl,
    visibility: 'achievement' as const,
    achievementCode: OVERACHIEVER_CODE,
  }));
}

function enabledBonusItems(state: ReleaseFeatureState) {
  return normalizeBonusItems(state.bonusItems)
    .filter(item => item.title.trim() && item.fileUrl.trim())
    .map(item => ({
      title: item.title.trim(),
      fileUrl: item.fileUrl.trim(),
      visibility: 'achievement' as const,
      achievementCode: OVERACHIEVER_CODE,
    }));
}

export function validateReleaseFeatureState(state: ReleaseFeatureState, sectionId: StudioCatalogSectionId) {
  void state;
  void sectionId;
  return '';
}

export function buildAchievementRows(productId: string, state: ReleaseFeatureState, sectionId: StudioCatalogSectionId) {
  if (!supportsAchievementsForSection(sectionId) || !state.achievementsEnabled) return [];
  const bonusItems = enabledBonusItems(state);

  return state.achievements
    .filter(achievement => achievement.enabled)
    .map((achievement, index) => {
      return {
        item_id: productId,
        code: achievement.code,
        title: achievement.title,
        description: achievement.description,
        trigger_type: achievement.triggerType,
        trigger_config: {},
        reward_item_id: null,
        reward_config: {
          commentary_enabled: state.commentaryEnabled,
          final_reward_required: achievement.code === OVERACHIEVER_CODE && bonusItems.length > 0,
          bonus_items: achievement.code === OVERACHIEVER_CODE ? bonusItems : [],
        },
        points: 0,
        icon: getAchievementIconPath(achievement.code) ?? achievement.iconUrl ?? null,
        sort_order: index,
        is_secret: false,
      };
    });
}

export function buildFeatureAssetRows(productId: string, state: ReleaseFeatureState) {
  return enabledBonusItems(state).map((item, index) => ({
    item_id: productId,
    asset_type: 'bonus_content',
    title: item.title,
    file_url: item.fileUrl,
    storage_path: null,
    is_downloadable: true,
    sort_order: index,
  }));
}

export function featureAssetTypes() {
  return ['bonus_content', 'commentary_audio', 'behind_the_scenes', 'bonus_free', 'bonus_achievement'];
}

export function hydrateReleaseFeatureState(
  sectionId: StudioCatalogSectionId,
  achievementRows: SavedProductAchievement[],
  assetRows: SavedProductAsset[],
) {
  const base = createReleaseFeatureState(sectionId);
  const achievementByCode = new Map(achievementRows.map(achievement => [achievement.code, achievement]));
  const savedBonusItems = assetRows
    .filter(asset => ['bonus_content', 'bonus_achievement', 'bonus_free'].includes(asset.asset_type ?? ''))
    .map(asset => ({
      title: asset.title ?? 'Bonus Content',
      fileUrl: asset.file_url ?? '',
      visibility: 'achievement' as const,
      achievementCode: OVERACHIEVER_CODE,
    }));
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
    bonusItems: normalizeBonusItems(savedBonusItems),
  }, sectionId);
}

export async function saveReleaseFeatures({
  productId,
  sectionId,
  state,
}: {
  productId: string;
  sectionId: StudioCatalogSectionId;
  state: ReleaseFeatureState;
}) {
  const validationError = validateReleaseFeatureState(state, sectionId);
  if (validationError) return validationError;

  const achievementRows = buildAchievementRows(productId, state, sectionId);
  const assetRows = buildFeatureAssetRows(productId, state);
  try {
    await replaceStudioReleaseFeatures(productId, featureAssetTypes(), achievementRows, assetRows);
  } catch (saveError) {
    return saveError instanceof Error ? saveError.message : 'Could not save release features.';
  }

  return '';
}

export function StudioReleaseFeatures({
  sectionId,
  userId,
  state,
  onChange,
}: {
  sectionId: StudioCatalogSectionId;
  userId: string;
  state: ReleaseFeatureState;
  onChange: (next: ReleaseFeatureState) => void;
}) {
  const supportsAchievements = supportsAchievementsForSection(sectionId);
  const achievementsOn = supportsAchievements && state.achievementsEnabled;
  const bonusItem = normalizeBonusItems(state.bonusItems)[0];

  function patch(patchState: Partial<ReleaseFeatureState>) {
    onChange({ ...state, ...patchState });
  }

  function toggleAchievements() {
    if (!supportsAchievements) return;
    const nextEnabled = !state.achievementsEnabled;
    patch({
      achievementsEnabled: nextEnabled,
      achievements: nextEnabled
        ? state.achievements.map(achievement => (
          achievement.code === OVERACHIEVER_CODE ? { ...achievement, enabled: true } : achievement
        ))
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
    patch({
      achievements: state.achievements.map(item => (
        item.code === code ? { ...item, enabled: !item.enabled } : item.code === OVERACHIEVER_CODE ? { ...item, enabled: true } : item
      )),
    });
  }

  function updateBonusItem(patchState: Partial<DraftBonusContent>) {
    patch({
      bonusItems: [{
        ...bonusItem,
        ...patchState,
        visibility: 'achievement',
        achievementCode: OVERACHIEVER_CODE,
      }],
    });
  }

  return (
    <section className="dashboard-form-section studio-achievements-section">
      <SectionHeader
        title="Achievements"
        description="Enable achievements for listeners to unlock."
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

      {!supportsAchievements ? (
        <p className="library-empty-text">Achievements are limited to music releases in v1.0.</p>
      ) : achievementsOn ? (
        <div className="studio-achievements-content">
          <div className="dashboard-achievement-picker">
            {state.achievements.map(achievement => (
              <label key={achievement.code} className="dashboard-achievement-choice-row">
                <span className="library-achievement-icon studio-achievement-icon" aria-hidden="true">
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
                    disabled={achievement.code === OVERACHIEVER_CODE}
                    onChange={() => toggleAchievement(achievement.code)}
                  />
                </span>
              </label>
            ))}
          </div>
          <div className="studio-bonus-content-card">
            <span className="dashboard-row-copy">
              <span className="dashboard-row-title">Overachiever Bonus Content</span>
              <span className="dashboard-row-subtitle">Optional content unlocked after every selected achievement is complete.</span>
            </span>
            <div className="dashboard-form-grid dashboard-form-grid-2">
              <label className="dashboard-field">
                <span className="dashboard-field-label">Bonus Title</span>
                <input
                  value={bonusItem.title}
                  onChange={event => updateBonusItem({ title: event.target.value })}
                  placeholder="Bonus Content"
                />
              </label>
              <UploadField
                label="Bonus File"
                folder="products/bonus-content"
                userId={userId}
                value={bonusItem.fileUrl}
                buttonLabel="Upload bonus"
                previewKind="file"
                onChange={nextValue => updateBonusItem({ fileUrl: nextValue })}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
