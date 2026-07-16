'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { AchievementIconGlyph } from '@/components/AchievementIconGlyph';
import { SectionHeader } from '@/components/Ui';
import type { ProductAchievement } from '@/lib/platform';
import type { Product } from '@/lib/products';
import { ExternalLinkActions } from '@/components/ExternalLinkActions';
import type { ReleaseVideoEmbed } from '@/lib/domain/releaseFeatures';

type ProductDetailTrack = {
  id?: string | null;
  duration_seconds?: number | null;
};

export type ProductDetailAction = {
  label: string;
  href?: string;
  opensInNewWindow?: boolean;
  onClick?: () => void;
  secondary?: boolean;
  active?: boolean;
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
  showCreatorAvatar = true,
}: {
  product: Product;
  creatorName: string;
  creatorHrefValue: string;
  meta: string[];
  actions: ProductDetailAction[];
  externalLinks?: Product['external_links'];
  coverClassName?: string;
  showCreatorAvatar?: boolean;
}) {
  const heroImage = product.hero_url || product.cover_url;
  const coverClasses = ['view-album-cover', coverClassName].filter(Boolean).join(' ');

  return (
    <div
      className={heroImage ? 'view-album-header' : 'view-album-header view-album-header-fallback'}
      style={heroImage ? { '--release-artwork': `url(${heroImage})` } as CSSProperties : undefined}
    >
      <div className={coverClasses}>
        {heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImage} alt={product.title} />
        )}
      </div>
      <div className="view-album-copy">
        <h1 className="view-album-title">{product.title}</h1>
        <Link className="library-creator-chip" href={creatorHrefValue} aria-label={`View ${creatorName}`}>
          {showCreatorAvatar ? <span className="library-creator-avatar ui44-identity-avatar ui44-identity-avatar-inline">
            {product.creators?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.creators.avatar_url} alt="" />
            ) : (
              <span>{initials(creatorName)}</span>
            )}
          </span> : null}
          <span>{creatorName}</span>
        </Link>
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
        <div className="view-album-actions">
          {actions.map(action =>
            action.href ? (
              <Link
                key={action.label}
                className={`${action.secondary ? 'os-button os-button-secondary' : 'os-button os-button-primary'}${action.active ? ' os-button-active' : ''}`}
                href={action.href}
                target={action.opensInNewWindow ? '_blank' : undefined}
                rel={action.opensInNewWindow ? 'noopener noreferrer' : undefined}
                aria-label={action.opensInNewWindow ? `${action.label} (opens in a new window)` : undefined}
              >
                {action.label}
              </Link>
            ) : (
              <button key={action.label} className={`${action.secondary ? 'os-button os-button-secondary' : 'os-button os-button-primary'}${action.active && action.label !== 'Shuffle' ? ' os-button-active' : ''}`} type="button" onClick={action.onClick} aria-pressed={action.label === 'Shuffle' ? action.active : undefined}>
                {action.label}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export function withSourceProduct(href: string, productId?: string | null) {
  if (!productId) return href;
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}fromProduct=${encodeURIComponent(productId)}`;
}

export function LibraryAchievementsSection({
  achievements,
  unlockedAchievementIds,
  emptyMessage = 'Achievements will appear here when this item supports them.',
}: {
  achievements: ProductAchievement[];
  unlockedAchievementIds: Set<string>;
  emptyMessage?: string;
}) {
  const unlocked = achievements.filter(item => unlockedAchievementIds.has(item.id));
  const locked = achievements.filter(item => !unlockedAchievementIds.has(item.id));
  const orderedAchievements = [...unlocked, ...locked];

  return (
    <div className="view-section library-achievements-section">
      <SectionHeader title="Achievements" />

      {achievements.length === 0 ? (
        <p className="app-empty-text library-empty-text">{emptyMessage}</p>
      ) : (
        <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip library-achievement-list ui44-achievement-list">
          {orderedAchievements.map(achievement => {
            const isUnlocked = unlockedAchievementIds.has(achievement.id);
            return (
              <div
                key={achievement.id}
                className={isUnlocked ? 'dashboard-list-row library-achievement-row library-achievement-row-unlocked ui44-list-row ui44-list-row-achievement ui44-achievement-row ui44-achievement-row-unlocked' : 'dashboard-list-row library-achievement-row ui44-list-row ui44-list-row-achievement ui44-achievement-row ui44-achievement-row-locked'}
              >
                <span className="library-achievement-icon ui44-achievement-icon" aria-hidden="true">
                  <AchievementIconGlyph code={achievement.code} label={achievement.title} />
                </span>
                <span className="dashboard-row-copy ui44-achievement-copy">
                  <span className="dashboard-row-title ui44-achievement-title">{achievement.title}</span>
                  {achievement.description && <span className="dashboard-row-subtitle ui44-achievement-secondary">{achievement.description}</span>}
                </span>
                {isUnlocked ? <span className="ui44-achievement-check" aria-label="Unlocked">✓</span> : null}
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
        description="Overachiever unlocks creator-selected extras for this item."
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
                  {assetUnlocked ? 'Unlocked and ready to download.' : 'Locked until Overachiever is unlocked.'}
                </span>
              </span>
              {assetUnlocked && asset.file_url ? (
                <Link className="os-button os-button-secondary os-button-compact" href={asset.file_url} target="_blank" rel="noreferrer">
                  Download
                </Link>
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

export function LibraryVideoEmbedsSection({ embeds }: { embeds: ReleaseVideoEmbed[] }) {
  if (embeds.length === 0) return null;

  return (
    <div className="view-section library-video-embeds-section">
      <SectionHeader title="Videos" />
      <div className="library-video-embed-list">
        {embeds.map(embed => (
          <article className="library-video-embed" key={embed.id}>
            <h3 className="library-video-embed-title">{embed.title}</h3>
            <div className="library-video-embed-frame">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(embed.youtube_video_id)}?modestbranding=1&rel=0&playsinline=1&iv_load_policy=3`}
                title={embed.title}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </article>
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
              <Link className="os-button os-button-secondary os-button-compact" href={asset.file_url} target="_blank" rel="noreferrer">
                {asset.asset_type === 'book' ? 'Open' : 'Download'}
              </Link>
            ) : (
              <span className="project-status-pill library-achievement-status-locked ui44-badge">Unavailable</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LibraryProductDetailsSection({
  product,
  tracks = [],
  inferredTrackDurations = {},
}: {
  product: Product;
  tracks?: ProductDetailTrack[];
  inferredTrackDurations?: Record<string, number>;
}) {
  const details = buildLibraryProductDetails(product, tracks, inferredTrackDurations);
  if (details.length === 0) return null;

  return (
    <div className="view-section">
      <h2 className="view-section-title">Product Details</h2>
      <div className="ui44-panel ui44-panel-glass ui44-panel-overflow-clip ui44-detail-list">
        {details.map(detail => (
          <div className="view-row ui44-list-row ui44-list-row-detail" key={detail.label}>
            <span className="view-row-label">{detail.label}</span>
            <span className="view-row-value">{detail.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildLibraryProductDetails(product: Product, tracks: ProductDetailTrack[], inferredTrackDurations: Record<string, number>) {
  const creator = product.creators?.display_name || product.creator || '44 Creator';
  const uploadDate = product.created_at
    ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(product.created_at))
    : 'N/A';
  const type = product.experience_type || product.item_type || '';
  const normalizedType = type.toLowerCase();
  const taxonomy = [
    { label: 'Category', value: product.browse_category?.label || 'Unassigned' },
    { label: 'Type', value: product.browse_type?.label || product.item_type || 'Unassigned' },
  ];

  if (normalizedType.includes('music') || ['album', 'ep', 'single'].some(value => product.item_type?.toLowerCase().includes(value))) {
    const totalLength = tracks.reduce((sum, track) => sum + getTrackDurationSeconds(track, inferredTrackDurations), 0);
    return [
      { label: 'Creator', value: creator },
      ...taxonomy,
      { label: 'Release Date', value: product.release_date
        ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${product.release_date}T00:00:00`))
        : String(product.year ?? 'N/A') },
      { label: 'Total Tracks', value: String(tracks.length) },
      { label: 'Total Length', value: formatDuration(totalLength) },
      { label: 'Upload Date', value: uploadDate },
    ];
  }

  if (normalizedType.includes('book') || product.item_type?.toLowerCase().includes('book')) {
    return [
      { label: 'Creator', value: creator },
      ...taxonomy,
      { label: 'Publication Year', value: String(product.year ?? 'N/A') },
      { label: 'Upload Date', value: uploadDate },
    ];
  }

  return [
    { label: 'Creator', value: creator },
    ...taxonomy,
    { label: 'Year', value: String(product.year ?? 'N/A') },
    { label: 'Upload Date', value: uploadDate },
  ];
}

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return '-:--';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

function getTrackDurationSeconds(track: ProductDetailTrack, inferredTrackDurations: Record<string, number>) {
  if (track.duration_seconds && track.duration_seconds > 0) return track.duration_seconds;
  return track.id ? inferredTrackDurations[track.id] ?? 0 : 0;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '44';
}
