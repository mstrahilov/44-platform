'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useContextMenu, type ContextMenuEntry } from '@/components/ContextMenu';
import { authorDisplayName, authorHandle, authorHref, compactDate, initials, type SocialAuthor, type SocialLiker, type SocialPost, type SocialReply } from '@/lib/social';
import { communityThreadHref } from '@/lib/platform';
import { pinDockItem } from '@/lib/dockPreferences';
import type { CommunityReference } from '@/lib/communityV11';

function socialTokenHref(token: string) {
  if (token.startsWith('@')) return `/profile/${token.slice(1)}`;
  if (token.startsWith('#')) return `/community?topic=${encodeURIComponent(token.slice(1).toLowerCase())}`;
  return '';
}

function escapeSocialReference(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function SocialFallbackRichText({ text, keyPrefix = '' }: { text: string; keyPrefix?: string }) {
  const parts = text.split(/([@#][a-zA-Z0-9_]+)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        const href = socialTokenHref(part);
        return href ? (
          <Link
            key={`${keyPrefix}${part}-${index}`}
            href={href}
            className="social-rich-link"
            onClick={event => event.stopPropagation()}
          >
            {part}
          </Link>
        ) : (
          <span key={`${keyPrefix}${part}-${index}`}>{part}</span>
        );
      })}
    </>
  );
}

export function SocialRichText({ text, references = [] }: { text: string; references?: CommunityReference[] }) {
  if (references.length === 0) return <SocialFallbackRichText text={text} />;

  const aliases = references.flatMap(reference => (
    reference.kind === 'person'
      ? [`@${reference.label}`]
      : [`@${reference.label}`, reference.label]
  )).sort((a, b) => b.length - a.length);
  const referenceByAlias = new Map<string, CommunityReference>();
  references.forEach(reference => {
    referenceByAlias.set(`@${reference.label}`.toLocaleLowerCase(), reference);
    if (reference.kind === 'item') referenceByAlias.set(reference.label.toLocaleLowerCase(), reference);
  });
  const pattern = new RegExp(`(${aliases.map(escapeSocialReference).join('|')})`, 'giu');
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        const reference = referenceByAlias.get(part.toLocaleLowerCase());
        if (!reference) return <SocialFallbackRichText key={`plain-${index}`} text={part} keyPrefix={`${index}-`} />;
        return (
          <Link
            key={`${reference.kind}-${reference.id}-${index}`}
            href={reference.href}
            className="social-rich-link social-rich-reference"
            data-reference-kind={reference.kind}
            onClick={event => event.stopPropagation()}
          >
            {part}
          </Link>
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
    <span className={size === 'large'
      ? 'social-avatar social-avatar-large ui44-identity-avatar ui44-identity-avatar-specialized'
      : 'social-avatar ui44-identity-avatar ui44-identity-avatar-inline'} aria-hidden="true">
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
  trailing,
  handleOnly = false,
}: {
  author?: Partial<SocialAuthor> | null;
  createdAt?: string | null;
  meta?: ReactNode;
  trailing?: ReactNode;
  handleOnly?: boolean;
}) {
  const handle = authorHandle(author);
  const href = authorHref(author);
  const nameContent = handleOnly && handle ? `@${handle}` : authorDisplayName(author);
  return (
    <div className={meta ? 'social-row-meta social-row-meta-has-meta' : 'social-row-meta'}>
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
          <span className="social-dot social-time-dot" />
          <span className="social-time">{compactDate(createdAt)}</span>
        </>
      )}
      {meta && (
        <>
          <span className="social-dot social-meta-dot" />
          {meta}
        </>
      )}
      {trailing && <span className="social-row-meta-trailing">{trailing}</span>}
    </div>
  );
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg className="social-action-icon ui44-row-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.5s-7.5-4.35-9.5-9.4C1.2 7.9 3.3 5 6.4 5c1.9 0 3.5 1.1 4.4 2.7l1.2.1C12.9 6.1 14.5 5 16.4 5c3.1 0 5.2 2.9 3.9 6.1-2 5.05-9.5 9.4-9.5 9.4z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  );
}

function LikeActionContent({ filled }: { filled: boolean }) {
  return (
    <span className="social-action-like-hit">
      <HeartIcon filled={filled} />
    </span>
  );
}

function ChatBubbleIcon() {
  return (
    <svg className="social-action-icon ui44-row-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8c-1.2 0-2.3-.2-3.3-.7L4 20l1-4.2C4.4 14.7 4 13.4 4 12z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="social-action-icon ui44-row-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function SocialPencilIcon() {
  return (
    <svg className="social-action-icon ui44-row-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 20 4.2-1 10.7-10.7a2.1 2.1 0 0 0-3-3L5.2 16 4 20zM14.8 6.4l2.9 2.9" />
    </svg>
  );
}

export function SocialMoreButton({
  label,
  entries,
}: {
  label: string;
  entries: ContextMenuEntry[];
}) {
  const { openContextMenu } = useContextMenu();
  return (
    <button
      type="button"
      className="social-more-button"
      aria-label={label}
      aria-haspopup="menu"
      onClick={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        openContextMenu({
          preventDefault: () => event.preventDefault(),
          stopPropagation: () => event.stopPropagation(),
          clientX: rect.right,
          clientY: rect.bottom + 4,
        }, entries);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}

export function wasSocialContentEdited(createdAt?: string | null, updatedAt?: string | null) {
  if (!createdAt || !updatedAt) return false;
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  return Number.isFinite(created) && Number.isFinite(updated) && updated - created > 1_000;
}

export function SocialPostRow({
  post,
  replyCount = 0,
  liked = false,
  onLike,
  onDelete,
  onEdit,
  onReport,
  canDelete = false,
  canEdit = false,
  disabled,
  showTitle = false,
  titleSize = 'default',
  handleOnly = true,
  meta,
  onOpenClick,
  onReplyClick,
  replyActionLabel,
  repliesOpen = false,
  rowClickable = true,
  references = [],
  bodyClamp = false,
  bodyExpanded = false,
  onToggleBody,
  editing = false,
  editBody = '',
  editSaving = false,
  onEditBodyChange,
  onSaveEdit,
  onCancelEdit,
  hrefOverride,
  articleId,
  replyId,
  rowClassName,
  contentLabel = 'Post',
}: {
  post: SocialPost | SocialReply;
  replyCount?: number;
  likeCount?: number;
  liked?: boolean;
  likers?: SocialLiker[];
  repliers?: SocialLiker[];
  onLike?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onReport?: () => void;
  canDelete?: boolean;
  canEdit?: boolean;
  disabled?: boolean;
  showTitle?: boolean;
  titleSize?: 'default' | 'lg';
  handleOnly?: boolean;
  meta?: ReactNode;
  onOpenClick?: () => void;
  onReplyClick?: () => void;
  replyActionLabel?: string;
  repliesOpen?: boolean;
  rowClickable?: boolean;
  references?: CommunityReference[];
  bodyClamp?: boolean;
  bodyExpanded?: boolean;
  onToggleBody?: () => void;
  editing?: boolean;
  editBody?: string;
  editSaving?: boolean;
  onEditBodyChange?: (value: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  hrefOverride?: string;
  articleId?: string;
  replyId?: string;
  rowClassName?: string;
  contentLabel?: 'Post' | 'Reply';
}) {
  const router = useRouter();
  const { openContextMenu, showCopiedToast } = useContextMenu();
  const isReply = 'post_id' in post;
  const author = isReply ? post.authors : post.creators;
  const body = post.body || '';
  const href = hrefOverride ?? (isReply
    ? `/community/thread/${post.post_id}/reply/${post.id}`
    : communityThreadHref(post));
  const authorLink = authorHref(author);
  const authorName = authorDisplayName(author);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [bodyOverflowing, setBodyOverflowing] = useState(false);

  useLayoutEffect(() => {
    const element = bodyRef.current;
    if (!bodyClamp || !element || bodyExpanded) return;

    const updateOverflow = () => {
      setBodyOverflowing(element.scrollHeight > element.clientHeight + 1);
    };

    updateOverflow();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [body, bodyClamp, bodyExpanded]);

  function openThread() {
    if (!rowClickable) return;
    if (onOpenClick) {
      onOpenClick();
      return;
    }
    router.push(href);
  }

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (!rowClickable || event.target !== event.currentTarget) return;
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
      { id: 'open', label: `Open ${contentLabel}`, href },
      { id: 'author', label: 'View Author', href: authorLink },
      { id: 'reply', label: 'Reply', href },
      ...(onLike ? [{ id: 'like', label: liked ? 'Unlike' : 'Like', onSelect: onLike, disabled }] as ContextMenuEntry[] : []),
      ...(canDelete && onDelete
        ? [
            { kind: 'divider', id: 'post-actions' },
            { id: 'delete', label: `Delete ${contentLabel}`, onSelect: onDelete, danger: true },
          ] as ContextMenuEntry[]
        : []),
    ];
  }

  function authorMenuEntries(): ContextMenuEntry[] {
    return [
      { id: 'open-author', label: 'View Creator', href: authorLink },
      { id: 'pin-author', label: 'Pin to Dock', onSelect: () => pinDockItem({
        id: `profile:${author?.id ?? authorLink}`,
        label: authorName,
        href: authorLink,
        iconClass: 'os-icon-user',
        kind: 'profile',
        imageUrl: author?.avatar_url ?? null,
      }) },
    ];
  }

  function copyPostLink() {
    const absoluteHref = new URL(href, window.location.origin).href;
    void navigator.clipboard.writeText(absoluteHref)
      .then(() => showCopiedToast())
      .catch(() => showCopiedToast('Could not copy link'));
  }

  const publicMenuEntries: ContextMenuEntry[] = [
    { id: 'copy-link', label: 'Copy Link', onSelect: copyPostLink },
    ...(onReport ? [{ id: 'report', label: 'Report', onSelect: onReport }] as ContextMenuEntry[] : []),
  ];
  const edited = wasSocialContentEdited(post.created_at, post.updated_at);

  return (
    <article
      id={articleId}
      data-reply-id={replyId}
      className={rowClickable
        ? `social-row social-post-row social-row-interactive ui44-list-row ui44-list-row-community ui44-list-row-interactive${rowClassName ? ` ${rowClassName}` : ''}`
        : `social-row social-post-row ui44-list-row ui44-list-row-community${rowClassName ? ` ${rowClassName}` : ''}`}
      role={rowClickable ? 'link' : undefined}
      tabIndex={rowClickable ? 0 : undefined}
      onClick={rowClickable ? openThread : undefined}
      onKeyDown={rowClickable ? handleRowKeyDown : undefined}
      onContextMenu={event => openContextMenu(event, postMenuEntries())}
    >
      <Link
        className={isReply ? 'ui44-community-avatar-link ui44-reply-avatar-link' : 'ui44-community-avatar-link'}
        href={authorLink}
        aria-label={authorName}
        onClick={stopRowNavigation}
        onContextMenu={event => openContextMenu(event, authorMenuEntries())}
      >
        <SocialAvatar profile={author} />
      </Link>
      <div
        className={rowClickable
          ? `social-row-main social-row-main-clickable ui44-community-copy${isReply ? ' ui44-reply-copy' : ''}`
          : `social-row-main ui44-community-copy${isReply ? ' ui44-reply-copy' : ''}`}
      >
        <div className={isReply ? 'ui44-community-author-line ui44-reply-author-line' : 'ui44-community-author-line'}>
          <SocialAuthorLine
            author={author}
            createdAt={post.created_at}
            handleOnly={handleOnly}
            meta={meta}
            trailing={<SocialMoreButton label={`${contentLabel} options`} entries={publicMenuEntries} />}
          />
        </div>
        <div className="ui44-community-content">
          {showTitle && (
            <h2 className={titleSize === 'lg' ? 'social-row-title social-row-title-lg' : 'social-row-title'}>
              {'title' in post ? post.title : ''}
            </h2>
          )}
          {editing ? (
            <form
              className="community-inline-editor"
              onSubmit={event => {
                event.preventDefault();
                onSaveEdit?.();
              }}
              onClick={stopRowNavigation}
            >
              <textarea
                className="ui44-input ui44-textarea community-inline-editor-input"
                value={editBody}
                onChange={event => onEditBodyChange?.(event.target.value)}
                rows={4}
                autoFocus
                disabled={editSaving}
                aria-label={`Edit ${contentLabel.toLowerCase()}`}
              />
              <div className="community-inline-editor-actions">
                <button type="button" className="os-button os-button-secondary os-button-compact" onClick={onCancelEdit} disabled={editSaving}>
                  Cancel
                </button>
                <button type="submit" className="os-button os-button-primary os-button-compact" disabled={editSaving || !editBody.trim()}>
                  {editSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          ) : body && (
            <>
              <p
                ref={bodyRef}
                className={`social-row-body ui44-type ui44-type-body ui44-tone-secondary ui44-community-body${bodyClamp && !bodyExpanded ? ' social-row-body-clamped' : ''}`}
              >
                <SocialRichText text={body} references={references} />
              </p>
              {bodyClamp && (bodyOverflowing || bodyExpanded) && onToggleBody ? (
                <button
                  type="button"
                  className="social-row-show-more"
                  aria-expanded={bodyExpanded}
                  onClick={event => {
                    event.stopPropagation();
                    onToggleBody();
                  }}
                >
                  {bodyExpanded ? 'Show less' : 'Show more'}
                </button>
              ) : null}
            </>
          )}
        </div>
        <div className="social-actions ui44-community-actions" onClick={stopRowNavigation}>
          {onLike ? (
            <button
              type="button"
              className="social-action social-action-like ui44-row-action"
              data-liked={liked ? 'true' : 'false'}
              onClick={onLike}
              disabled={disabled}
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              <LikeActionContent filled={liked} />
            </button>
          ) : (
            <span className="social-action social-action-like ui44-row-action" data-liked={liked ? 'true' : 'false'} aria-label={liked ? 'Liked' : 'Like'}>
              <LikeActionContent filled={liked} />
            </span>
          )}
          {onReplyClick ? (
            <button
              type="button"
              className={replyActionLabel ? 'social-action social-action-reply-label ui44-row-action' : 'social-action ui44-row-action'}
              onClick={onReplyClick}
              aria-label={`${replyCount} replies`}
              aria-expanded={repliesOpen}
            >
              <ChatBubbleIcon />
              {replyActionLabel
                ? <span className="social-action-label">{replyActionLabel}</span>
                : replyCount > 0 && <span className="social-action-count">{replyCount}</span>}
            </button>
          ) : (
            <Link href={href} className="social-action social-action-icon-only ui44-row-action" aria-label={`${replyCount} replies`} onClick={stopRowNavigation}>
              <ChatBubbleIcon />
              {replyCount > 0 && <span className="social-action-count">{replyCount}</span>}
            </Link>
          )}
          {!editing && canEdit && onEdit && (
            <button
              type="button"
              className="social-action social-action-flush ui44-row-action ui44-row-action-edit"
              onClick={onEdit}
              aria-label={`Edit ${contentLabel.toLowerCase()}`}
            >
              <SocialPencilIcon />
            </button>
          )}
          {!editing && canDelete && onDelete && (
            <button
              type="button"
              className="social-action social-action-danger ui44-row-action ui44-row-action-delete"
              onClick={onDelete}
              aria-label={`Delete ${contentLabel.toLowerCase()}`}
            >
              <TrashIcon />
            </button>
          )}
          {!canEdit && edited && <span className="community-edited-label">Edited</span>}
          {!canEdit && !canDelete && (
            <span className="social-action-more-mobile">
              <SocialMoreButton label={`${contentLabel} options`} entries={publicMenuEntries} />
            </span>
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
    <div className="social-row ui44-profile-row">
      <Link href={href} aria-label={name} onContextMenu={event => openContextMenu(event, entries)}>
        <SocialAvatar profile={profile} />
      </Link>
      <div className="social-row-main">
        <div className="social-profile-row-head">
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
  shape = 'square',
}: {
  href: string;
  title: string;
  meta: string;
  image?: string | null;
  shape?: 'square' | 'portrait';
}) {
  return (
    <Link href={href} className="social-artifact-card ui44-catalog-card">
      <div className={shape === 'portrait' ? 'social-artifact-cover social-artifact-cover-portrait ui44-catalog-art' : 'social-artifact-cover ui44-catalog-art'}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" />
        )}
      </div>
      <div className="social-artifact-info ui44-catalog-copy">
        <div className="os-type-card-title ui44-catalog-title">{title}</div>
        <div className="os-type-meta ui44-catalog-meta">{meta}</div>
      </div>
    </Link>
  );
}

export {
  HeartIcon as SocialHeartIcon,
  ChatBubbleIcon as SocialChatBubbleIcon,
  TrashIcon as SocialTrashIcon,
};
