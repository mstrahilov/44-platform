'use client';

import Link from 'next/link';
import { useContextMenu } from '@/components/ContextMenu';
import { pinDockItem } from '@/lib/dockPreferences';
import { creatorHref, type ProductAchievement } from '@/lib/platform';
import type { Product } from '@/lib/products';

type ProductCreator = Product['creators'];
type ProductDetailTrack = {
  duration_seconds?: number | null;
};

export function LibraryCreatorChip({
  creator,
  fallbackName,
  sourceProductId,
}: {
  creator: ProductCreator;
  fallbackName?: string | null;
  sourceProductId?: string | null;
}) {
  const { openContextMenu } = useContextMenu();
  const name = creator?.display_name || creator?.username || fallbackName || '44 Creator';
  const avatarUrl = creator?.avatar_url;
  const href = withSourceProduct(creatorHref(creator ?? fallbackName ?? '44 Creator'), sourceProductId);

  return (
    <Link
      className="library-creator-chip"
      href={href}
      aria-label={`View ${name}`}
      onContextMenu={event => openContextMenu(event, [
        { id: 'open', label: 'View Creator', href },
        { id: 'pin', label: 'Pin to Dock', onSelect: () => pinDockItem({
          id: `profile:${creator?.id ?? href}`,
          label: name,
          href,
          iconClass: 'os-icon-user',
          kind: 'profile',
          imageUrl: avatarUrl ?? null,
        }) },
      ])}
    >
      <span className="library-creator-avatar">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" />
        ) : (
          <span>{initials(name)}</span>
        )}
      </span>
      <span>{name}</span>
    </Link>
  );
}

function withSourceProduct(href: string, productId?: string | null) {
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
    <div className="view-section">
      <div className="library-section-head">
        <h2 className="view-section-title">Achievements</h2>
      </div>

      {achievements.length === 0 ? (
        <p className="library-empty-text">{emptyMessage}</p>
      ) : (
        <div className="dashboard-list-surface library-achievement-list">
          {orderedAchievements.map(achievement => {
            const isUnlocked = unlockedAchievementIds.has(achievement.id);
            const isHidden = achievement.is_secret && !isUnlocked;
            const title = isHidden ? 'Hidden Achievement' : achievement.title;
            const description = isHidden ? 'Unlock this achievement to reveal the details.' : achievement.description;
            return (
              <div
                key={achievement.id}
                className={isUnlocked ? 'dashboard-list-row library-achievement-row library-achievement-row-unlocked' : 'dashboard-list-row library-achievement-row'}
              >
                <span className="library-achievement-icon" aria-hidden="true">
                  {!isHidden && achievement.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={achievement.icon} alt="" />
                  ) : null}
                </span>
                <span className="dashboard-row-copy">
                  <span className="dashboard-row-title">{title}</span>
                  {description && <span className="dashboard-row-subtitle">{description}</span>}
                </span>
                <span className={isUnlocked ? 'project-status-pill project-status-accepted library-achievement-status-unlocked' : 'project-status-pill'}>
                  {isUnlocked ? 'Unlocked' : isHidden ? 'Hidden' : 'Locked'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LibraryProductDetailsSection({
  product,
  tracks = [],
}: {
  product: Product;
  tracks?: ProductDetailTrack[];
}) {
  const details = buildLibraryProductDetails(product, tracks);
  if (details.length === 0) return null;

  return (
    <div className="view-section">
      <h2 className="view-section-title">Product Details</h2>
      <div>
        {details.map(detail => (
          <div className="view-row" key={detail.label}>
            <span className="view-row-label">{detail.label}</span>
            <span className="view-row-value">{detail.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildLibraryProductDetails(product: Product, tracks: ProductDetailTrack[]) {
  const creator = product.creators?.display_name || product.creator || '44 Creator';
  const uploadDate = product.created_at
    ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(product.created_at))
    : 'N/A';
  const type = product.experience_type || product.category || product.product_type || '';
  const normalizedType = type.toLowerCase();

  if (normalizedType.includes('music') || ['album', 'ep', 'single'].some(value => product.product_type?.toLowerCase().includes(value))) {
    const totalLength = tracks.reduce((sum, track) => sum + (track.duration_seconds || 0), 0);
    return [
      { label: 'Creator', value: creator },
      { label: 'Product Type', value: product.product_type || 'Release' },
      { label: 'Release Year', value: String(product.year ?? 'N/A') },
      { label: 'Total Tracks', value: String(tracks.length) },
      { label: 'Total Length', value: formatDuration(totalLength) },
      { label: 'Upload Date', value: uploadDate },
    ];
  }

  if (normalizedType.includes('book') || product.product_type?.toLowerCase().includes('book')) {
    return [
      { label: 'Creator', value: creator },
      { label: 'Book Type', value: product.product_type || 'Book' },
      { label: 'Publication Year', value: String(product.year ?? 'N/A') },
      { label: 'Upload Date', value: uploadDate },
    ];
  }

  return [
    { label: 'Creator', value: creator },
    { label: 'Product Type', value: product.product_type || 'Product' },
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '44';
}
