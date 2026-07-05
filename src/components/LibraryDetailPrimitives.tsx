'use client';

import Link from 'next/link';
import { creatorHref, type ProductAchievement } from '@/lib/platform';
import type { Product } from '@/lib/products';

type ProductCreator = Product['creators'];

export function LibraryCreatorChip({
  creator,
  fallbackName,
  sourceProductId,
}: {
  creator: ProductCreator;
  fallbackName?: string | null;
  sourceProductId?: string | null;
}) {
  const name = creator?.display_name || creator?.username || fallbackName || '44 Creator';
  const avatarUrl = creator?.avatar_url;
  const href = withSourceProduct(creatorHref(creator ?? fallbackName ?? '44 Creator'), sourceProductId);

  return (
    <Link className="library-creator-chip" href={href} aria-label={`View ${name}`}>
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '44';
}
