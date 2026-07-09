'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useContextMenu, type ContextMenuEntry } from '@/components/ContextMenu';
import { authorDisplayName, authorHandle, authorHref, compactDate, initials, type SocialAuthor, type SocialLiker, type SocialPost } from '@/lib/social';
import { communityThreadHref } from '@/lib/platform';
import { pinDockItem } from '@/lib/dockPreferences';

function socialTokenHref(token: string) {
  if (token.startsWith('@')) return `/profile/${token.slice(1)}`;
  if (token.startsWith('#')) return `/community?topic=${encodeURIComponent(token.slice(1).toLowerCase())}`;
  return '';
}

export function SocialRichText({ text }: { text: string }) {
  const parts = text.split(/([@#][a-zA-Z0-9_]+)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        const href = socialTokenHref(part);
        return href ? (
          <Link
            key={`${part}-${index}`}
            href={href}
            className="social-rich-link"
            onClick={event => event.stopPropagation()}
          >
            {part}
          </Link>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        );
      })}
    </>
  );
}

export function SocialAvatar({
  profile,
  size = 'default',
}: {
  profile?: Partial<SocialAuthor> | null;
  size?: 'default' | 'large';
}) {
  const name = authorDisplayName(profile);
  return (
    <span className={size === 'large' ? 'social-avatar social-avatar-large' : 'social-avatar'} aria-hidden="true">
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt="" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function SocialAuthorLine({
  author,
  createdAt,
  meta,
  handleOnly = false,
}: {
  author?: Partial<SocialAuthor> | null;
  createdAt?: string | null;
  meta?: ReactNode;
  handleOnly?: boolean;
}) {
  const handle = authorHandle(author);
  const href = authorHref(author);
  const nameContent = handleOnly && handle ? `@${handle}` : authorDisplayName(author);
  return (
    <div className="social-row-meta">
      {handleOnly && handle ? (
        <Link className="social-author-name" href={href} onClick={event => event.stopPropagation()}>
          {nameContent}
        </Link>
      ) : (
        <>
          <Link className="social-author-name" href={href} onClick={event => event.stopPropagation()}>
            {nameContent}
          </Link>
          {handle && <span className="social-handle">@{handle}</span>}
        </>
      )}
      {createdAt && (
        <>
          <span className="social-dot" />
          <span className="social-time">{compactDate(createdAt)}</span>
        </>
      )}
      {meta && (
        <>
          <span className="social-dot" />
          {meta}
        </>
      )}
    </div>
  );
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg className="social-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.5s-7.5-4.35-9.5-9.4C1.2 7.9 3.3 5 6.4 5c1.9 0 3.5 1.1 4.4 2.7l1.2.1C12.9 6.1 14.5 5 16.4 5c3.1 0 5.2 2.9 3.9 6.1-2 5.05-9.5 9.4-9.5 9.4z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg className="social-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8c-1.2 0-2.3-.2-3.3-.7L4 20l1-4.2C4.4 14.7 4 13.4 4 12z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="social-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function LikerAvatar({ liker }: { liker: SocialLiker }) {
  const name = liker.display_name || liker.username || 'M';
  return (
    <span className="social-liker-avatar" aria-hidden="true">
      {liker.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={liker.avatar_url} alt="" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function SocialEngagementRow({
  likers,
  likeCount,
  repliers = [],
  replyCount = 0,
}: {
  likers: SocialLiker[];
  likeCount: number;
  repliers?: SocialLiker[];
  replyCount?: number;
}) {
  const useLikers = likeCount > 0 && likers.length > 0;
  const source = useLikers ? likers : repliers;
  const total = useLikers ? likeCount : replyCount;
  if (source.length === 0 || total === 0) return null;

  const first = source[0];
  const firstName = first.display_name || first.username || 'Someone';
  const shown = source.slice(0, Math.min(2, total));
  const showOthers = total > 1;

  return (
    <span className="social-engagement">
      <span className="social-engagement-stack">
        {shown.map(liker => (
          <LikerAvatar key={liker.id} liker={liker} />
        ))}
      </span>
      <span className="social-engagement-text">
        <strong>{firstName}</strong>{showOthers && <> and others</>}
      </span>
    </span>
  );
}

export function SocialPostRow({
  post,
  replyCount = 0,
  likeCount = 0,
  liked = false,
  likers = [],
  repliers = [],
  onLike,
  onDelete,
  canDelete = false,
  disabled,
  showTitle = false,
  titleSize = 'default',
  handleOnly = true,
  meta,
  onOpenClick,
  onReplyClick,
  repliesOpen = false,
  rowClickable = true,
}: {
  post: SocialPost;
  replyCount?: number;
  likeCount?: number;
  liked?: boolean;
  likers?: SocialLiker[];
  repliers?: SocialLiker[];
  onLike?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  disabled?: boolean;
  showTitle?: boolean;
  titleSize?: 'default' | 'lg';
  handleOnly?: boolean;
  meta?: ReactNode;
  onOpenClick?: () => void;
  onReplyClick?: () => void;
  repliesOpen?: boolean;
  rowClickable?: boolean;
}) {
  const router = useRouter();
  const { openContextMenu } = useContextMenu();
  const body = post.body || '';
  const href = communityThreadHref(post);
  const authorLink = authorHref(post.creators);
  const authorName = authorDisplayName(post.creators);

  function openThread() {
    if (!rowClickable) return;
    if (onOpenClick) {
      onOpenClick();
      return;
    }
    router.push(href);
  }

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!rowClickable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openThread();
    }
  }

  function stopRowNavigation(event: React.SyntheticEvent) {
    event.stopPropagation();
  }

  function postMenuEntries(): ContextMenuEntry[] {
    return [
      { id: 'open', label: 'Open Post', href },
      { id: 'author', label: 'View Author', href: authorLink },
      { id: 'reply', label: 'Reply', href },
      ...(onLike ? [{ id: 'like', label: liked ? 'Unlike' : 'Like', onSelect: onLike, disabled }] as ContextMenuEntry[] : []),
      ...(canDelete && onDelete
        ? [
            { kind: 'divider', id: 'post-actions' },
            { id: 'delete', label: 'Delete Post', onSelect: onDelete, danger: true },
          ] as ContextMenuEntry[]
        : []),
    ];
  }

  function authorMenuEntries(): ContextMenuEntry[] {
    return [
      { id: 'open-author', label: 'View Creator', href: authorLink },
      { id: 'pin-author', label: 'Pin to Dock', onSelect: () => pinDockItem({
        id: `profile:${post.creators?.id ?? authorLink}`,
        label: authorName,
        href: authorLink,
        iconClass: 'os-icon-user',
        kind: 'profile',
        imageUrl: post.creators?.avatar_url ?? null,
      }) },
    ];
  }

  return (
    <article
      className={rowClickable ? 'social-row social-row-interactive' : 'social-row'}
      onContextMenu={event => openContextMenu(event, postMenuEntries())}
    >
      <Link
        href={authorLink}
        aria-label={authorName}
        onClick={stopRowNavigation}
        onContextMenu={event => openContextMenu(event, authorMenuEntries())}
      >
        <SocialAvatar profile={post.creators} />
      </Link>

      <div
        className={rowClickable ? 'social-row-main social-row-main-clickable' : 'social-row-main'}
        role={rowClickable ? 'link' : undefined}
        tabIndex={rowClickable ? 0 : undefined}
        onClick={rowClickable ? openThread : undefined}
        onKeyDown={rowClickable ? handleRowKeyDown : undefined}
      >
        <SocialAuthorLine author={post.creators} createdAt={post.created_at} handleOnly={handleOnly} meta={meta} />
        <div style={{ color: 'inherit', textDecoration: 'none', display: 'grid', gap: 6 }}>
          {showTitle && (
            <h2 className={titleSize === 'lg' ? 'social-row-title social-row-title-lg' : 'social-row-title'}>
              {post.title}
            </h2>
          )}
          {body && <p className="social-row-body"><SocialRichText text={body} /></p>}
        </div>
        <div className="social-actions" onClick={stopRowNavigation}>
          {onReplyClick ? (
            <button
              type="button"
              className="social-action"
              onClick={onReplyClick}
              aria-label={`${replyCount} replies`}
              aria-expanded={repliesOpen}
            >
              <ChatBubbleIcon />
              {replyCount > 0 && <span className="social-action-count">{replyCount}</span>}
            </button>
          ) : (
            <Link href={href} className="social-action" aria-label={`${replyCount} replies`} onClick={stopRowNavigation}>
              <ChatBubbleIcon />
              {replyCount > 0 && <span className="social-action-count">{replyCount}</span>}
            </Link>
          )}
          {onLike ? (
            <button
              type="button"
              className="social-action social-action-like"
              data-liked={liked ? 'true' : 'false'}
              onClick={onLike}
              disabled={disabled}
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              <HeartIcon filled={liked} />
            </button>
          ) : (
            <span className="social-action social-action-like" data-liked={liked ? 'true' : 'false'} aria-hidden="true">
              <HeartIcon filled={liked} />
            </span>
          )}
          <SocialEngagementRow likers={likers} likeCount={likeCount} repliers={repliers} replyCount={replyCount} />
          {canDelete && onDelete && (
            <button
              type="button"
              className="social-action social-action-danger"
              onClick={onDelete}
              aria-label="Delete post"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function SocialProfileRow({
  profile,
  aside,
  subtitle,
}: {
  profile: Partial<SocialAuthor>;
  aside?: ReactNode;
  subtitle?: ReactNode;
}) {
  const handle = authorHandle(profile);
  const { openContextMenu } = useContextMenu();
  const href = authorHref(profile);
  const name = authorDisplayName(profile);
  const entries: ContextMenuEntry[] = [
    { id: 'open-profile', label: 'View Creator', href },
    { id: 'pin-profile', label: 'Pin to Dock', onSelect: () => pinDockItem({
      id: `profile:${profile.id ?? href}`,
      label: name,
      href,
      iconClass: 'os-icon-user',
      kind: 'profile',
      imageUrl: profile.avatar_url ?? null,
    }) },
  ];
  return (
    <div className="social-row">
      <Link href={href} aria-label={name} onContextMenu={event => openContextMenu(event, entries)}>
        <SocialAvatar profile={profile} />
      </Link>
      <div className="social-row-main">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <Link href={authorHref(profile)} className="social-author-name">
              {authorDisplayName(profile)}
            </Link>
            {handle && <div className="social-handle">@{handle}</div>}
          </div>
          {aside}
        </div>
        {subtitle && <div className="social-note os-type-body-small">{subtitle}</div>}
      </div>
    </div>
  );
}

export function SocialArtifactCard({
  href,
  title,
  meta,
  image,
}: {
  href: string;
  title: string;
  meta: string;
  image?: string | null;
}) {
  return (
    <Link href={href} className="social-artifact-card">
      <div className="social-artifact-cover">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" />
        )}
      </div>
      <div className="social-artifact-info">
        <div className="os-type-card-title">{title}</div>
        <div className="os-type-meta" style={{ color: 'var(--os-color-ink-secondary)' }}>{meta}</div>
      </div>
    </Link>
  );
}

export {
  HeartIcon as SocialHeartIcon,
  ChatBubbleIcon as SocialChatBubbleIcon,
  TrashIcon as SocialTrashIcon,
};
