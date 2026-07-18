'use client';

import { AchievementIconGlyph } from '@/components/AchievementIconGlyph';
import { SectionHeader } from '@/components/Ui';
import type { StudioCatalogSectionId } from '@/lib/studioCatalog';
import { getAchievementIconPath } from '@/lib/achievementIcons';
import { replaceStudioReleaseFeatures } from '@/lib/domain/studioPublishing';
import { replaceStudioReleaseVideoEmbeds, type ReleaseVideoEmbed } from '@/lib/domain/releaseFeatures';
import { Ui44CheckboxInput, Ui44TextInput } from '@/components/ui44/Inputs';

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

export type DraftVideoEmbed = {
  url: string;
};

export type ReleaseFeatureState = {
  achievementsEnabled: boolean;
  commentaryEnabled: boolean;
  behindTheScenesEnabled: boolean;
  behindTheScenesUrl: string;
  videoEmbedsEnabled: boolean;
  videoEmbeds: DraftVideoEmbed[];
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
  storage_path?: string | null;
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
const MAX_RELEASE_VIDEOS = 10;
const EMPTY_VIDEO_EMBED: DraftVideoEmbed = { url: '' };

export function createReleaseFeatureState(sectionId: StudioCatalogSectionId): ReleaseFeatureState {
  const achievements = achievementTemplates(sectionId);
  return {
    achievementsEnabled: supportsAchievementsForSection(sectionId),
    commentaryEnabled: false,
    behindTheScenesEnabled: false,
    behindTheScenesUrl: '',
    videoEmbedsEnabled: false,
    videoEmbeds: [EMPTY_VIDEO_EMBED],
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
      { code: 'overachiever', title: 'Overachiever', description: 'Unlock every other achievement.', triggerType: 'all_achievements_unlocked', enabled: true, iconUrl: getAchievementIconPath('overachiever') },
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
    videoEmbedsEnabled: supportsAchievements ? state.videoEmbedsEnabled : false,
    videoEmbeds: normalizeVideoEmbeds(state.videoEmbeds),
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

function normalizeVideoEmbeds(items: DraftVideoEmbed[] | undefined) {
  const normalized = items?.length ? items : [EMPTY_VIDEO_EMBED];
  return normalized.slice(0, MAX_RELEASE_VIDEOS).map(item => ({ url: item.url ?? '' }));
}

function enabledVideoEmbeds(state: ReleaseFeatureState) {
  return state.videoEmbedsEnabled
    ? normalizeVideoEmbeds(state.videoEmbeds)
      .filter(embed => embed.url.trim())
      .map(embed => ({ url: embed.url.trim() }))
    : [];
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
  if (supportsAchievementsForSection(sectionId) && state.videoEmbedsEnabled) {
    for (const embed of normalizeVideoEmbeds(state.videoEmbeds)) {
      const url = embed.url.trim();
      if (!url) continue;
      if (!isSupportedYouTubeUrl(url)) return 'Use a valid HTTPS YouTube watch, short, or Shorts URL.';
    }
  }
  return '';
}

function isSupportedYouTubeUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') return /^[A-Za-z0-9_-]{11}$/.test(url.pathname.slice(1).split('/')[0]);
    if (host !== 'youtube.com') return false;
    if (url.pathname === '/watch') return /^[A-Za-z0-9_-]{11}$/.test(url.searchParams.get('v') ?? '');
    if (url.pathname.startsWith('/embed/')) return /^[A-Za-z0-9_-]{11}$/.test(url.pathname.split('/')[2] ?? '');
    if (url.pathname.startsWith('/shorts/')) return /^[A-Za-z0-9_-]{11}$/.test(url.pathname.split('/')[2] ?? '');
    return false;
  } catch {
    return false;
  }
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

export function featureAssetTypes() {
  return ['bonus_content', 'commentary_audio', 'behind_the_scenes', 'bonus_free', 'bonus_achievement'];
}

export function hydrateReleaseFeatureState(
  sectionId: StudioCatalogSectionId,
  achievementRows: SavedProductAchievement[],
  assetRows: SavedProductAsset[],
  videoEmbeds: ReleaseVideoEmbed[] = [],
) {
  const base = createReleaseFeatureState(sectionId);
  const achievementByCode = new Map(achievementRows.map(achievement => [achievement.code, achievement]));
  const savedBonusItems = assetRows
    .filter(asset => ['bonus_content', 'bonus_achievement', 'bonus_free'].includes(asset.asset_type ?? ''))
    .map(asset => ({
      title: asset.title ?? 'Bonus Content',
      fileUrl: asset.storage_path ?? asset.file_url ?? '',
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
    videoEmbedsEnabled: videoEmbeds.length > 0,
    videoEmbeds: videoEmbeds.length > 0
      ? videoEmbeds.map(embed => ({ url: `https://www.youtube.com/watch?v=${embed.youtube_video_id}` }))
      : [EMPTY_VIDEO_EMBED],
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
  try {
    // Bonus Content editing is hidden during trusted testing. Preserve any
    // existing protected bonus assets while saving achievement selections.
    await replaceStudioReleaseFeatures(productId, [], achievementRows, []);
    await replaceStudioReleaseVideoEmbeds(productId, enabledVideoEmbeds(state));
  } catch (saveError) {
    return saveError instanceof Error ? saveError.message : 'Could not save release features.';
  }

  return '';
}

export function StudioReleaseFeatures({
  sectionId,
  state,
  onChange,
}: {
  sectionId: StudioCatalogSectionId;
  state: ReleaseFeatureState;
  onChange: (next: ReleaseFeatureState) => void;
}) {
  const supportsAchievements = supportsAchievementsForSection(sectionId);
  const achievementsOn = supportsAchievements && state.achievementsEnabled;

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

  function toggleVideoEmbeds() {
    patch({ videoEmbedsEnabled: !state.videoEmbedsEnabled });
  }

  function updateVideoEmbed(index: number, next: Partial<DraftVideoEmbed>) {
    patch({
      videoEmbeds: normalizeVideoEmbeds(state.videoEmbeds).map((embed, embedIndex) => (
        embedIndex === index ? { ...embed, ...next } : embed
      )),
    });
  }

  function addVideoEmbed() {
    if (state.videoEmbeds.length >= MAX_RELEASE_VIDEOS) return;
    patch({ videoEmbeds: [...normalizeVideoEmbeds(state.videoEmbeds), { ...EMPTY_VIDEO_EMBED }] });
  }

  function removeVideoEmbed(index: number) {
    const next = normalizeVideoEmbeds(state.videoEmbeds).filter((_, embedIndex) => embedIndex !== index);
    patch({ videoEmbeds: next.length > 0 ? next : [{ ...EMPTY_VIDEO_EMBED }] });
  }

  return (
    <>
      <section className="dashboard-form-section studio-achievements-section">
      <SectionHeader
        title="Achievements"
        description="Let listeners unlock achievements."
        action={supportsAchievements ? (
          <button
            type="button"
            role="switch"
            aria-checked={achievementsOn}
            className={achievementsOn ? 'settings-toggle settings-toggle-on ui44-switch ui44-switch-on' : 'settings-toggle ui44-switch'}
            onClick={toggleAchievements}
          />
        ) : undefined}
      />

      {!supportsAchievements ? (
        <p className="library-empty-text">Achievements are limited to music releases in v1.0.</p>
      ) : achievementsOn ? (
        <div className="studio-achievements-content">
          <div className="dashboard-achievement-picker dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip library-achievement-list ui44-achievement-list ui44-achievement-list-studio">
            {state.achievements.map(achievement => (
              <label key={achievement.code} className={`dashboard-achievement-choice-row dashboard-list-row library-achievement-row ui44-achievement-row ui44-achievement-row-choice${achievement.enabled || achievement.code === OVERACHIEVER_CODE ? ' ui44-achievement-row-unlocked' : ' ui44-achievement-row-locked'}`}>
                <span className="library-achievement-icon studio-achievement-icon ui44-achievement-icon" aria-hidden="true">
                  <AchievementIconGlyph code={achievement.code} label={achievement.title} />
                </span>
                <span className="dashboard-achievement-copy ui44-achievement-copy">
                  <span className="os-type-card-title ui44-achievement-title">{achievement.title}</span>
                  <span className="os-type-body-small ui44-achievement-secondary">{achievement.description}</span>
                </span>
                <span className="dashboard-achievement-toggle ui44-achievement-control">
                  <Ui44CheckboxInput
                    checked={achievement.enabled || achievement.code === OVERACHIEVER_CODE}
                    disabled={achievement.code === OVERACHIEVER_CODE}
                    onChange={() => toggleAchievement(achievement.code)}
                  />
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
      </section>

      {supportsAchievements && (
        <section className="dashboard-form-section studio-video-embeds-section">
          <SectionHeader
            title="Videos"
            description="Add up to ten YouTube videos to this release."
            action={<button type="button" role="switch" aria-checked={state.videoEmbedsEnabled} className={state.videoEmbedsEnabled ? 'settings-toggle settings-toggle-on ui44-switch ui44-switch-on' : 'settings-toggle ui44-switch'} onClick={toggleVideoEmbeds} />}
          />
          {state.videoEmbedsEnabled && (
            <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-visible studio-feature-panel"><div className="studio-video-embed-fields">
              {normalizeVideoEmbeds(state.videoEmbeds).map((embed, index) => (
                <div className="studio-video-embed-row" key={`video-embed-${index}`}>
                  <label className="dashboard-field">
                    <span className="dashboard-field-label">YouTube Video URL</span>
                    <Ui44TextInput className="os-input-field" type="url" value={embed.url} placeholder="Enter YouTube video URL" onChange={event => updateVideoEmbed(index, { url: event.target.value })} />
                  </label>
                  {state.videoEmbeds.length > 1 && <button type="button" className="os-button os-button-ghost os-button-compact" onClick={() => removeVideoEmbed(index)}>Remove</button>}
                </div>
              ))}
              {state.videoEmbeds.length < MAX_RELEASE_VIDEOS && <button type="button" className="os-button os-button-secondary os-button-compact" onClick={addVideoEmbed}>Add another video</button>}
            </div></div>
          )}
        </section>
      )}
    </>
  );
}
