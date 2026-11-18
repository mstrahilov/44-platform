'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { SectionHeader } from '@/components/Ui';
import type { ProductAchievement } from '@/lib/platform';
import type { Product } from '@/lib/products';
import { ExternalLinkActions } from '@/components/ExternalLinkActions';
import type { ReleaseCreatorVideo } from '@/lib/domain/releaseFeatures';
import { OS44Button } from '@/components/OS44Button';
import { CreatorVideoTitle } from '@/components/CreatorVideoTitle';
import { artworkBackdrop, DETAIL_ARTWORK_SIZES, PublicArtwork } from '@/components/PublicArtwork';

export type ProductDetailAction = {
  label: string;
  href?: string;
  opensInNewWindow?: boolean;
  onClick?: () => void;
  secondary?: boolean;
  active?: boolean;
  disabled?: boolean;
};

export type LibraryBonusAsset = {
  title: string | null;
  file_url: string | null;
  asset_type: string | null;
  is_unlocked?: boolean | null;
};

export type LibraryFileAsset = LibraryBonusAsset & {
  id?: string | null;
  is_downloadable?: boolean | null;
};

export function ProductDetailHeader({
  product,
  creatorName,
  creatorHrefValue,
  meta,
  actions,
  externalLinks = [],
  coverClassName = '',
  showCreatorAvatar = false,
  showCreatorIdentity = true,
  imageUrlOverride,
  className = '',
  beforeActions,
  afterActions,
  mediaFooter,
}: {
  product: Product;
  creatorName: string;
  creatorHrefValue: string;
  meta: string[];
  actions: ProductDetailAction[];
  externalLinks?: Product['external_links'];
  coverClassName?: string;
  showCreatorAvatar?: boolean;
  showCreatorIdentity?: boolean;
  imageUrlOverride?: string | null;
  className?: string;
  beforeActions?: ReactNode;
  afterActions?: ReactNode;
  mediaFooter?: ReactNode;
}) {
  const heroImage = imageUrlOverride || product.hero_url || product.cover_url;
  const coverClasses = ['view-album-cover', coverClassName].filter(Boolean).join(' ');

  return (
    <div
      className={`${heroImage ? 'view-album-header' : 'view-album-header view-album-header-fallback'}${className ? ` ${className}` : ''}`}
      style={heroImage ? { '--release-artwork': artworkBackdrop(heroImage) } as CSSProperties : undefined}
    >
      <div className="view-album-media">
        <div className={coverClasses}>
          {heroImage && (
            <PublicArtwork src={heroImage} alt={product.title} sizes={DETAIL_ARTWORK_SIZES} loading="eager" fetchPriority="high" />
          )}
        </div>
        {mediaFooter}
      </div>
      <div className="view-album-copy">
        <h1 className="view-album-title">{product.title}</h1>
        {showCreatorIdentity ? <Link className="library-creator-chip" href={creatorHrefValue} aria-label={`View ${creatorName}`} style={{ color: 'var(--os-color-accent)' }}>
          {showCreatorAvatar ? <span className="library-creator-avatar ui44-identity-avatar ui44-identity-avatar-inline">
            {product.creators?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.creators.avatar_url} alt="" />
            ) : (
              <span>{initials(creatorName)}</span>
            )}
          </span> : null}
          <span>{creatorName}</span>
        </Link> : null}
        {meta.length > 0 && (
          <div className="view-album-eyebrow view-product-meta-line">
            {meta.map((item, index) => (
              <span className="view-album-meta-token" key={`${item}-${index}`}>
                {index > 0 && <span className="view-album-meta-sep" aria-hidden="true" />}
                <span>{item}</span>
              </span>
            ))}
          </div>
        )}
        <ExternalLinkActions links={externalLinks ?? []} context="item" variant="icons" label={`Open ${product.title} on other platforms`} />
        {beforeActions}
        <div className="view-album-actions">
          {actions.map((action, index) =>
            action.href ? (
              <OS44Button
                key={`${action.label}-${index}`}
                href={action.href}
                target={action.opensInNewWindow ? '_blank' : undefined}
                rel={action.opensInNewWindow ? 'noopener noreferrer' : undefined}
                aria-label={action.opensInNewWindow ? `${action.label} (opens in a new window)` : undefined}
              >
                {action.label}
              </OS44Button>
            ) : (
              <OS44Button key={`${action.label}-${index}`} onClick={action.onClick} disabled={action.disabled} aria-pressed={action.label === 'Shuffle' ? action.active : undefined}>
                {action.label}
              </OS44Button>
            ),
          )}
        </div>
        {afterActions}
        <div className="view-album-atmosphere-handoff" aria-hidden="true" />
      </div>
    </div>
  );
}

export function withSourceProduct(href: string, productId?: string | null) {
  if (!productId) return href;
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}fromProduct=${encodeURIComponent(productId)}`;
}

const MUSIC_ACHIEVEMENT_DESCRIPTIONS: Record<string, string> = {
  front_to_back: 'Listen to every track on this release.',
  no_skips: 'Listen from the first track to the last without skipping.',
  nightbird: 'Listen to the release between 10 PM and 4 AM.',
  heavy_rotation: 'Listen to the full release three times.',
  joined_the_orbit: 'Follow the creator from this release.',
  signal_boost: 'Get someone to open this release from your shared link.',
  overachiever: 'Unlock every other achievement.',
};

export function LibraryAchievementsSection({
  achievements,
  unlockedAchievementIds,
  emptyMessage = 'Achievements will appear here when this item supports them.',
}: {
  achievements: ProductAchievement[];
  unlockedAchievementIds: Set<string>;
  emptyMessage?: string;
}) {
  const trophy = achievements.find(item => item.code === 'overachiever');
  const trackedAchievements = achievements.filter(item => item.code !== 'overachiever');
  const unlockedCount = trackedAchievements.filter(item => unlockedAchievementIds.has(item.id)).length;
  const progress = trackedAchievements.length ? unlockedCount / trackedAchievements.length : 0;
  const orderedAchievements = [
    ...trackedAchievements.filter(item => unlockedAchievementIds.has(item.id)),
    ...trackedAchievements.filter(item => !unlockedAchievementIds.has(item.id)),
  ];

  return (
    <div className="view-section library-achievements-section">
      <SectionHeader title="Achievements" />

      {achievements.length === 0 ? (
        <p className="app-empty-text library-empty-text">{emptyMessage}</p>
      ) : (
        <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip library-achievement-list ui44-achievement-list">
          {trophy && <div className="library-achievement-trophy">
            <div className="library-achievement-trophy-heading">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v3h4v3c0 3.1-2.1 5.6-5.1 6.4A5.5 5.5 0 0 1 13 17v2h4v2H7v-2h4v-2a5.5 5.5 0 0 1-2.9-1.6C5.1 14.6 3 12.1 3 9V6h4V3Zm-2 5v1c0 1.8 1.1 3.4 2.7 4.1A8 8 0 0 1 7 9V8H5Zm14 0h-2v1a8 8 0 0 1-.7 4.1A4.5 4.5 0 0 0 19 9V8Z" /></svg>
              <strong>{trophy.title}</strong>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="library-achievement-progress" role="progressbar" aria-label="Trophy progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
              <span style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </div>}
          {orderedAchievements.map(achievement => {
            const isUnlocked = unlockedAchievementIds.has(achievement.id);
            return (
              <div
                key={achievement.id}
                className={isUnlocked ? 'dashboard-list-row library-achievement-row library-achievement-row-unlocked ui44-list-row ui44-list-row-achievement ui44-achievement-row ui44-achievement-row-unlocked' : 'dashboard-list-row library-achievement-row ui44-list-row ui44-list-row-achievement ui44-achievement-row ui44-achievement-row-locked'}
              >
                <span className="library-achievement-status" aria-label={isUnlocked ? 'Completed' : 'Not completed'}>
                  {isUnlocked ? <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m7.5 12.3 3 3 6-6.3" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /></svg>}
                </span>
                <span className="dashboard-row-copy ui44-achievement-copy">
                  <span className="dashboard-row-title ui44-achievement-title">{achievement.title}</span>
                  {(MUSIC_ACHIEVEMENT_DESCRIPTIONS[achievement.code] || achievement.description) && <span className="dashboard-row-subtitle ui44-achievement-secondary">{MUSIC_ACHIEVEMENT_DESCRIPTIONS[achievement.code] || achievement.description}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LibraryBonusContentSection({
  bonusAssets,
  unlocked,
}: {
  bonusAssets: LibraryBonusAsset[];
  unlocked: boolean;
}) {
  if (bonusAssets.length === 0) return null;

  return (
    <div className="view-section">
      <SectionHeader
        title="Bonus Content"
        description="Trophy unlocks creator-selected extras for this item."
      />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        {bonusAssets.map((asset, index) => {
          const title = asset.title || `Bonus Content ${index + 1}`;
          const assetUnlocked = asset.is_unlocked ?? unlocked;
          return (
            <div className="dashboard-list-row ui44-list-row ui44-list-row-dashboard" key={`${title}-${index}`}>
              <span className="dashboard-row-copy">
                <span className="dashboard-row-title">{title}</span>
                <span className="dashboard-row-subtitle">
                  {assetUnlocked ? 'Unlocked and ready to download.' : 'Locked until Trophy is unlocked.'}
                </span>
              </span>
              {assetUnlocked && asset.file_url ? (
                <OS44Button href={asset.file_url} target="_blank" rel="noreferrer">
                  Download
                </OS44Button>
              ) : (
                <span className="project-status-pill library-achievement-status-locked ui44-badge">Locked</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LibraryVideosSection({ videos, title = 'Visuals' }: { videos: ReleaseCreatorVideo[]; title?: string }) {
  if (videos.length === 0) return null;

  return (
    <div className="view-section library-video-embeds-section library-videos-section">
      <SectionHeader title={title} />
      <div className="library-video-card-list">
        {videos.map(video => (
          <Link className="library-video-card" key={video.id} href={`/videos/${video.id}`} aria-label={`Open video: ${video.title}`}>
            <span className="library-video-card-artwork" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg`} alt="" loading="lazy" />
            </span>
            <CreatorVideoTitle className="library-video-card-title" videoId={video.youtube_video_id} storedTitle={video.title} />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function LibraryFilesSection({ assets }: { assets: LibraryFileAsset[] }) {
  const files = assets.filter(asset => !['bonus_content', 'bonus_achievement'].includes(asset.asset_type ?? ''));
  if (files.length === 0) return null;

  return (
    <div className="view-section">
      <SectionHeader title="Files" description="Files included with this Library item." />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        {files.map((asset, index) => (
          <div className="dashboard-list-row ui44-list-row ui44-list-row-dashboard" key={`${asset.asset_type ?? 'file'}-${asset.title ?? index}`}>
            <span className="dashboard-row-copy">
              <span className="dashboard-row-title">{asset.title || `File ${index + 1}`}</span>
              <span className="dashboard-row-subtitle">
                {asset.file_url ? 'Ready to open from your Library.' : 'This file is not included with your current access.'}
              </span>
            </span>
            {asset.file_url ? (
              <OS44Button href={asset.file_url} target="_blank" rel="noreferrer">
                {asset.asset_type === 'book' ? 'Open' : 'Download'}
              </OS44Button>
            ) : (
              <span className="project-status-pill library-achievement-status-locked ui44-badge">Unavailable</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '44';
}
