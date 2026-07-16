'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { Ui44Text } from '@/components/ui44/Typography';

type PanelVariant = 'paper' | 'glass';
type PanelOverflow = 'clip' | 'visible';

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Ui44Section({
  title,
  trailingAction,
  children,
  className = '',
}: {
  title: ReactNode;
  description?: ReactNode;
  trailingAction?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return <section className={joinClasses('ui44-spacing-section', className)}>
    <header className="ui44-spacing-section-header">
      <Ui44Text as="h3" variant="section-title" className="ui44-spacing-section-title">{title}</Ui44Text>
      {trailingAction ? <div className="ui44-spacing-section-action">{trailingAction}</div> : null}
    </header>
    <div className="ui44-spacing-section-content">{children}</div>
  </section>;
}

export function Ui44Panel({
  variant = 'glass',
  overflow = 'clip',
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLElement> & { variant?: PanelVariant; overflow?: PanelOverflow }) {
  return <section
    className={joinClasses(
      'ui44-panel',
      `ui44-panel-${variant}`,
      `ui44-panel-overflow-${overflow}`,
      'ui44-layout-panel',
      className,
    )}
    {...props}
  >{children}</section>;
}

export function Ui44PanelContent({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={joinClasses('ui44-panel-content', className)} {...props}>{children}</div>;
}

export function Ui44ListRow({
  leading,
  copy,
  trailing,
  interactive = true,
  className = '',
  ariaLabel,
}: {
  leading?: ReactNode;
  copy: ReactNode;
  trailing?: ReactNode;
  interactive?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const classes = joinClasses(
    'ui44-list-row',
    Boolean(leading) && 'ui44-list-row-has-leading',
    Boolean(trailing) && 'ui44-list-row-has-trailing',
    interactive && 'ui44-list-row-interactive',
    className,
  );
  const content = <>
    {leading ? <span className="ui44-list-row-leading">{leading}</span> : null}
    <span className="ui44-list-row-copy">{copy}</span>
    {trailing ? <span className="ui44-list-row-trailing">{trailing}</span> : null}
  </>;

  if (interactive) {
    return <button type="button" className={classes} aria-label={ariaLabel}>{content}</button>;
  }
  return <div className={classes}>{content}</div>;
}

function RowCopy({ title, secondary, body }: { title: ReactNode; secondary?: ReactNode; body?: ReactNode }) {
  return <>
    <Ui44Text variant="headline" className="ui44-list-row-title">{title}</Ui44Text>
    {secondary ? <Ui44Text variant="subheadline" tone="secondary" className="ui44-list-row-secondary">{secondary}</Ui44Text> : null}
    {body ? <Ui44Text variant="body" tone="secondary" className="ui44-list-row-body">{body}</Ui44Text> : null}
  </>;
}

export function Ui44StudioReleaseRow({
  title,
  itemType,
  status,
  issueLabel,
  missingArtwork = false,
  statusTone = 'published',
}: {
  title: ReactNode;
  itemType: ReactNode;
  status: ReactNode;
  issueLabel?: ReactNode;
  missingArtwork?: boolean;
  statusTone?: 'published' | 'review' | 'draft';
}) {
  return <Ui44ListRow
    className="ui44-list-row-artwork ui44-list-row-studio"
    leading={<span className={joinClasses('ui44-row-artwork', missingArtwork && 'ui44-row-artwork-missing')} aria-hidden="true">{missingArtwork ? '44' : ''}</span>}
    copy={<RowCopy title={title} secondary={itemType} body={<Ui44Text variant="subheadline" tone={statusTone === 'published' ? 'success' : statusTone === 'review' ? 'warning' : 'secondary'} className={`ui44-row-publication-status ui44-row-publication-status-${statusTone}`}>{status}</Ui44Text>} />}
    trailing={issueLabel ? <Ui44Text variant="caption" tone="secondary" className="ui44-row-issue-status">{issueLabel}</Ui44Text> : undefined}
    ariaLabel={typeof title === 'string' ? title : undefined}
  />;
}

export function Ui44AchievementRow({
  title,
  secondary,
  icon = '★',
  unlocked = true,
}: {
  title: ReactNode;
  secondary?: ReactNode;
  icon?: ReactNode;
  unlocked?: boolean;
}) {
  return <Ui44ListRow
    className="ui44-list-row-achievement"
    leading={<span className={joinClasses('ui44-row-achievement-icon', !unlocked && 'ui44-row-achievement-icon-locked')} aria-hidden="true">{icon}</span>}
    copy={<RowCopy title={title} secondary={secondary} />}
    trailing={unlocked ? <span className="ui44-row-check" aria-hidden="true">✓</span> : undefined}
    ariaLabel={typeof title === 'string' ? title : undefined}
  />;
}

function HeartIcon() {
  return <svg className="ui44-row-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.35-9.5-9.4C1.2 7.9 3.3 5 6.4 5c1.9 0 3.5 1.1 4.4 2.7C11.7 6.1 13.4 5 15.3 5c3.2 0 5.3 2.9 4 6.1-2 5.05-7.3 9.4-7.3 9.4Z" /></svg>;
}

function CommentIcon() {
  return <svg className="ui44-row-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8c-1.2 0-2.3-.2-3.3-.7L4 20l1-4.2A7.8 7.8 0 0 1 4 12Z" /></svg>;
}

function TrashIcon() {
  return <svg className="ui44-row-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3m2 0-1 13H8L7 7m4 4v5m2-5v5" /></svg>;
}

export function Ui44CommunityPostRow({
  author,
  time,
  body,
  initials,
  likeCount = 0,
  replyCount = 0,
  canDelete = false,
}: {
  author: string;
  time: string;
  body: ReactNode;
  initials?: string;
  likeCount?: number;
  replyCount?: number;
  canDelete?: boolean;
}) {
  return <Ui44ListRow
    className="ui44-list-row-community"
    interactive={false}
    copy={<span className="ui44-community-copy">
      <span className="ui44-community-author-line">
        <span className="ui44-review-avatar" aria-hidden="true">{initials ?? '44'}</span>
        <Ui44Text variant="subheadline" tone="secondary" className="ui44-community-meta">
          <Ui44Text variant="subheadline" as="strong">{author}</Ui44Text>
          <span aria-hidden="true">·</span>
          <span>{time}</span>
        </Ui44Text>
      </span>
      <Ui44Text variant="body" tone="secondary" className="ui44-community-body">{body}</Ui44Text>
      <span className="ui44-community-actions">
        <button type="button" className="ui44-row-action" aria-label="Like post"><HeartIcon />{likeCount > 0 ? <span>{likeCount}</span> : null}</button>
        <button type="button" className="ui44-row-action" aria-label="Comment on post"><CommentIcon />{replyCount > 0 ? <span>{replyCount}</span> : null}</button>
        {canDelete ? <button type="button" className="ui44-row-action ui44-row-action-delete" aria-label="Delete post"><TrashIcon /></button> : null}
      </span>
    </span>}
  />;
}

export function Ui44ReviewRow({
  author,
  body,
  initials,
}: {
  author: ReactNode;
  body: ReactNode;
  initials?: string;
}) {
  return <Ui44ListRow
    className="ui44-list-row-review"
    interactive={false}
    copy={<span className="ui44-review-copy">
      <span className="ui44-review-author"><span className="ui44-review-avatar" aria-hidden="true">{initials ?? '44'}</span><Ui44Text variant="subheadline" as="strong">{author}</Ui44Text></span>
      <Ui44Text variant="body" tone="secondary" className="ui44-review-body">{body}</Ui44Text>
    </span>}
  />;
}

export function Ui44DetailRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return <Ui44ListRow
    className="ui44-list-row-detail"
    interactive={false}
    copy={<Ui44Text variant="subheadline" className="ui44-detail-label">{label}</Ui44Text>}
    trailing={<Ui44Text variant="subheadline" tone="secondary" className="ui44-detail-value">{value}</Ui44Text>}
  />;
}

export function Ui44TrackRow({
  number,
  title,
  duration,
}: {
  number: number;
  title: ReactNode;
  duration?: ReactNode;
}) {
  return <Ui44ListRow
    className="ui44-list-row-track"
    leading={<span className="ui44-track-number"><span>{number}</span><span className="ui44-track-play" aria-hidden="true">▶</span></span>}
    copy={<Ui44Text variant="headline" className="ui44-list-row-title ui44-track-title">{title}</Ui44Text>}
    trailing={duration ? <Ui44Text variant="meta" tone="secondary" className="ui44-track-duration">{duration}</Ui44Text> : undefined}
    ariaLabel={typeof title === 'string' ? `Play ${title}` : undefined}
  />;
}
