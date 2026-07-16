'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { PageShell, CenteredMessage } from '@/components/Ui';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import { Ui44Textarea } from '@/components/ui44/Inputs';
import {
  SocialAuthorLine,
  SocialAvatar,
  SocialChatBubbleIcon,
  SocialHeartIcon,
  SocialPostRow,
  SocialRichText,
  SocialTrashIcon,
} from '@/components/Social';
import { useTopbarBack } from '@/components/TopbarContext';
import { hasCommunityIdentity } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import {
  authorDisplayName,
  authorHref,
  likersByPost,
  type LikeRow,
  type SocialLiker,
  type SocialPost,
  type SocialReply,
} from '@/lib/social';
import {
  createDiscussionReply,
  deleteDiscussion,
  deleteDiscussionReply,
  loadDiscussionThread,
  setDiscussionLike,
  setReplyLike,
  type ReplyLikeRow,
} from '@/lib/domain/community';

type ThreadProfileState = {
  userId: string;
  profile: StudioProfile | null;
};

export default function CommunityThreadPage() {
  const { id, replyId } = useParams<{ id: string; replyId?: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  useTopbarBack({ href: replyId ? `/community/thread/${id}` : '/community', label: replyId ? 'Post' : 'Community' });
  const [thread, setThread] = useState<SocialPost | null>(null);
  const [replies, setReplies] = useState<SocialReply[]>([]);
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [replyLikes, setReplyLikes] = useState<ReplyLikeRow[]>([]);
  const [profileState, setProfileState] = useState<ThreadProfileState | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replyComposerOpen, setReplyComposerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [inlineBody, setInlineBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [replyLiking, setReplyLiking] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [setupGateOpen, setSetupGateOpen] = useState(false);

  useEffect(() => {
    async function loadThread() {
      setLoading(true);

      let result;
      try {
        result = await loadDiscussionThread(id);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load this thread.');
        setLoading(false);
        return;
      }
      if (!result) {
        setThread(null);
        setReplies([]);
        setLikes([]);
        setReplyLikes([]);
        setLoading(false);
        return;
      }

      setThread(result.post);
      setReplies(result.replies);
      setLikes(result.likes);
      setReplyLikes(result.replyLikes);
      setLoading(false);
    }

    loadThread();
  }, [id]);

  useEffect(() => {
    if (!userId) return;
    const activeUserId = userId;
    let alive = true;
    loadStudioProfile(activeUserId).then(result => {
      if (alive) setProfileState({ userId: activeUserId, profile: result.profile });
    });
    return () => { alive = false; };
  }, [userId]);

  const profile = profileState && profileState.userId === userId ? profileState.profile : null;

  const likedByUser = useMemo(() => {
    if (!user) return false;
    return likes.some(like => like.profile_id === user.id);
  }, [likes, user]);

  const likersMap = useMemo(() => likersByPost(likes), [likes]);
  const threadLikers = thread ? (likersMap[thread.id] ?? []) : [];

  const replyLikeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    replyLikes.forEach(row => {
      map[row.reply_id] = (map[row.reply_id] ?? 0) + 1;
    });
    return map;
  }, [replyLikes]);

  const replyLikedByUser = useMemo(() => {
    const set = new Set<string>();
    if (!user) return set;
    replyLikes.forEach(row => {
      if (row.profile_id === user.id) set.add(row.reply_id);
    });
    return set;
  }, [replyLikes, user]);

  const { focusedReply, replyTree } = useMemo(() => {
    const byId = new Map<string, SocialReply>();
    replies.forEach(r => byId.set(r.id, r));
    const childrenByParent = new Map<string, SocialReply[]>();
    replies.forEach(r => {
      if (!r.parent_reply_id || !byId.has(r.parent_reply_id)) return;
      if (!childrenByParent.has(r.parent_reply_id)) childrenByParent.set(r.parent_reply_id, []);
      childrenByParent.get(r.parent_reply_id)!.push(r);
    });
    const byNewest = (a: SocialReply, b: SocialReply) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    childrenByParent.forEach(children => children.sort(byNewest));

    function descendantsOf(parentId: string) {
      const descendants: SocialReply[] = [];
      const seen = new Set<string>();
      function visit(nextParentId: string) {
        (childrenByParent.get(nextParentId) ?? []).forEach(child => {
          if (seen.has(child.id)) return;
          seen.add(child.id);
          descendants.push(child);
          visit(child.id);
        });
      }
      visit(parentId);
      return descendants;
    }

    const focused = replyId ? byId.get(replyId) ?? null : null;
    if (focused) {
      const directReplies = childrenByParent.get(focused.id) ?? [];
      return {
        focusedReply: focused,
        replyTree: directReplies.map(top => {
          const allChildren = descendantsOf(top.id);
          return { top, children: allChildren, totalChildren: allChildren.length };
        }),
      };
    }

    const tops = replies.filter(reply => !reply.parent_reply_id || !byId.has(reply.parent_reply_id)).sort(byNewest);
    return {
      focusedReply: null,
      replyTree: tops.map(top => {
        const allChildren = descendantsOf(top.id);
        return {
          top,
          children: allChildren.slice(0, 3),
          totalChildren: allChildren.length,
        };
      }),
    };
  }, [replies, replyId]);

  const canInteract = hasCommunityIdentity(profile);
  const isThreadAuthor = Boolean(user && thread && thread.author_id === user.id);

  function requireCommunityInteraction(action: () => void) {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }
    action();
  }

  async function toggleLike() {
    if (!thread || liking) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }

    setLiking(true);
    setError('');

    if (likedByUser) {
      try {
        await setDiscussionLike(thread.id, user.id, false);
        setLikes(current => current.filter(entry => !(entry.post_id === thread.id && entry.profile_id === user.id)));
      } catch (likeError) { setError(likeError instanceof Error ? likeError.message : 'Could not update this like.'); }
    } else {
      try {
        await setDiscussionLike(thread.id, user.id, true);
        const nextLike: LikeRow = {
          post_id: thread.id,
          profile_id: user.id,
          profiles: profile ? { id: profile.id, display_name: profile.display_name, username: profile.username, avatar_url: profile.avatar_url } : null,
        };
        setLikes(current => [nextLike, ...current]);
      } catch (likeError) { setError(likeError instanceof Error ? likeError.message : 'Could not update this like.'); }
    }

    setLiking(false);
  }

  async function toggleReplyLike(reply: SocialReply) {
    if (replyLiking) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }
    setReplyLiking(reply.id);
    setError('');

    const alreadyLiked = replyLikedByUser.has(reply.id);
    if (alreadyLiked) {
      try {
        await setReplyLike(reply.id, user.id, false);
        setReplyLikes(current => current.filter(entry => !(entry.reply_id === reply.id && entry.profile_id === user.id)));
      } catch (likeError) { setError(likeError instanceof Error ? likeError.message : 'Could not update this reply like.'); }
    } else {
      try {
        await setReplyLike(reply.id, user.id, true);
        const nextLike: ReplyLikeRow = {
          reply_id: reply.id,
          profile_id: user.id,
          profiles: profile ? { id: profile.id, display_name: profile.display_name, username: profile.username, avatar_url: profile.avatar_url } : null,
        };
        setReplyLikes(current => [nextLike, ...current]);
      } catch (likeError) { setError(likeError instanceof Error ? likeError.message : 'Could not update this reply like.'); }
    }

    setReplyLiking('');
  }

  async function insertReply(body: string, parentReplyId: string | null) {
    if (!thread || !user) return null;
    const trimmedBody = body.trim();
    try {
      return await createDiscussionReply({ postId: thread.id, authorId: user.id, parentReplyId, body: trimmedBody });
    } catch (insertError) {
      setError(insertError instanceof Error ? insertError.message : 'Could not create this reply.');
      return null;
    }
  }

  async function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!thread || !user || !replyBody.trim() || submitting) return;
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }
    setSubmitting(true);
    setError('');
    const created = await insertReply(replyBody, null);
    if (created) {
      setReplies(current => [...current, created]);
      setReplyBody('');
      setReplyComposerOpen(false);
    }
    setSubmitting(false);
  }

  async function submitInlineReply(event: React.FormEvent<HTMLFormElement>, parentReplyId: string) {
    event.preventDefault();
    if (!thread || !user || !inlineBody.trim() || submitting) return;
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }
    setSubmitting(true);
    setError('');
    const created = await insertReply(inlineBody, parentReplyId);
    if (created) {
      setReplies(current => [...current, created]);
      setInlineBody('');
      setReplyingTo(null);
    }
    setSubmitting(false);
  }

  async function deleteThread() {
    if (!thread || !user || !isThreadAuthor) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await deleteDiscussion(thread.id, user.id);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this thread.');
      return;
    }
    router.push('/community');
  }

  async function deleteReply(reply: SocialReply) {
    if (!user || reply.author_id !== user.id) return;
    if (!window.confirm('Delete this reply? This cannot be undone.')) return;
    try {
      await deleteDiscussionReply(reply.id, user.id);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this reply.');
      return;
    }
    setReplies(current => current.filter(r => r.id !== reply.id));
  }

  if (loading || authLoading) {
    return <PageShell><CenteredMessage status>Loading thread...</CenteredMessage></PageShell>;
  }

  if (!thread) {
    return <PageShell><CenteredMessage>Thread not found.</CenteredMessage></PageShell>;
  }

  const repliers: SocialLiker[] = [];
  const seenReplyAuthors = new Set<string>();
  [...replies].reverse().forEach(r => {
    if (r.authors && !seenReplyAuthors.has(r.authors.id)) {
      seenReplyAuthors.add(r.authors.id);
      repliers.push(r.authors);
    }
  });

  return (
    <PageShell>
      <main className="social-shell social-thread-page">
        <section aria-label="Replies">
          {error && <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error ui44-field-error" role="alert">{error}</div>}

          <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip social-feed social-feed-list" aria-label="Thread replies">
            {!focusedReply && (
              <>
                <SocialPostRow
                  post={thread}
                  replyCount={replies.length}
                  likeCount={likes.length}
                  liked={likedByUser}
                  likers={threadLikers}
                  repliers={repliers}
                  onLike={toggleLike}
                  onReplyClick={() => requireCommunityInteraction(() => setReplyComposerOpen(open => !open))}
                  replyActionLabel="Reply"
                  canDelete={isThreadAuthor}
                  onDelete={deleteThread}
                  disabled={liking}
                  titleSize="lg"
                  handleOnly
                  rowClickable={false}
                />
                {replyComposerOpen && (
                  user && canInteract ? (
                    <form className="social-composer social-composer-inline-surface" onSubmit={submitReply}>
                      <div className="social-composer-box ui44-composed-field ui44-composed-field-editor">
                        <Ui44Textarea
                          surface="bare"
                          className="os-input-textarea"
                          value={replyBody}
                          onChange={event => setReplyBody(event.target.value)}
                          placeholder="Write reply"
                          autoFocus
                        />
                        <div className="social-composer-actions">
                          <div className="social-inline-composer-actions">
                            <button type="button" className="os-button os-button-ghost os-button-compact" onClick={() => { setReplyComposerOpen(false); setReplyBody(''); }}>
                              Cancel
                            </button>
                            <button className="os-button os-button-primary os-button-compact" type="submit" disabled={submitting || !replyBody.trim()}>
                              {submitting ? 'Posting...' : 'Reply'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  ) : user ? (
                    <div className="social-composer social-composer-inline-surface">
                      <div className="social-composer-actions">
                        <div className="social-note os-type-body">Finish your community profile to reply and like posts.</div>
                        <button type="button" className="os-button os-button-primary os-button-compact" onClick={() => setSetupGateOpen(true)}>Finish Setup</button>
                      </div>
                    </div>
                  ) : (
                    <div className="social-composer social-composer-inline-surface">
                      <div className="social-composer-actions">
                        <div className="social-note os-type-body">Sign in to join this conversation.</div>
                        <Link href="/login" className="os-button os-button-primary os-button-compact">Sign In</Link>
                      </div>
                    </div>
                  )
                )}
              </>
            )}
            {focusedReply && (
              <ReplyConversation
                top={focusedReply}
                isFocusedRoot
                currentUserId={user?.id ?? null}
                canInteract={canInteract}
                replyingTo={replyingTo}
                onOpenReply={replyIdToOpen => requireCommunityInteraction(() => { setReplyingTo(replyIdToOpen); setInlineBody(''); })}
                onCancelReply={() => { setReplyingTo(null); setInlineBody(''); }}
                inlineBody={inlineBody}
                onInlineChange={setInlineBody}
                onSubmitInline={submitInlineReply}
                submitting={submitting}
                replyLikeCounts={replyLikeCounts}
                replyLikedByUser={replyLikedByUser}
                onLikeReply={toggleReplyLike}
                replyLiking={replyLiking}
                onDeleteReply={deleteReply}
                onOpenThread={reply => router.push(`/community/thread/${id}/reply/${reply.id}`)}
                onBlockedInteraction={() => requireCommunityInteraction(() => {})}
              >
                {[]}
              </ReplyConversation>
            )}
            {replyTree.length === 0 ? (
              null
            ) : (
              replyTree.map(({ top, children, totalChildren }) => (
                <ReplyConversation
                  key={top.id}
                  top={top}
                  viewAllHref={!focusedReply && totalChildren > children.length
                    ? `/community/thread/${id}/reply/${top.id}`
                    : undefined}
                  totalReplyCount={totalChildren}
                  currentUserId={user?.id ?? null}
                  canInteract={canInteract}
                  replyingTo={replyingTo}
                  onOpenReply={id => requireCommunityInteraction(() => { setReplyingTo(id); setInlineBody(''); })}
                  onCancelReply={() => { setReplyingTo(null); setInlineBody(''); }}
                  inlineBody={inlineBody}
                  onInlineChange={setInlineBody}
                  onSubmitInline={submitInlineReply}
                  submitting={submitting}
                  replyLikeCounts={replyLikeCounts}
                  replyLikedByUser={replyLikedByUser}
                  onLikeReply={toggleReplyLike}
                  replyLiking={replyLiking}
                  onDeleteReply={deleteReply}
                  onOpenThread={reply => router.push(`/community/thread/${id}/reply/${reply.id}`)}
                  onBlockedInteraction={() => requireCommunityInteraction(() => {})}
                >
                  {children}
                </ReplyConversation>
              ))
            )}
          </div>
        </section>
      </main>
      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
    </PageShell>
  );
}

function ReplyConversation({
  top,
  children,
  isFocusedRoot = false,
  viewAllHref,
  totalReplyCount,
  currentUserId,
  canInteract,
  replyingTo,
  onOpenReply,
  onCancelReply,
  inlineBody,
  onInlineChange,
  onSubmitInline,
  submitting,
  replyLikeCounts,
  replyLikedByUser,
  onLikeReply,
  replyLiking,
  onDeleteReply,
  onOpenThread,
  onBlockedInteraction,
}: {
  top: SocialReply;
  children: SocialReply[];
  isFocusedRoot?: boolean;
  viewAllHref?: string;
  totalReplyCount?: number;
  currentUserId: string | null;
  canInteract: boolean;
  replyingTo: string | null;
  onOpenReply: (id: string) => void;
  onCancelReply: () => void;
  inlineBody: string;
  onInlineChange: (value: string) => void;
  onSubmitInline: (event: React.FormEvent<HTMLFormElement>, parentReplyId: string) => void;
  submitting: boolean;
  replyLikeCounts: Record<string, number>;
  replyLikedByUser: Set<string>;
  onLikeReply: (reply: SocialReply) => void;
  replyLiking: string;
  onDeleteReply: (reply: SocialReply) => void;
  onOpenThread: (reply: SocialReply) => void;
  onBlockedInteraction: () => void;
}) {
  return (
    <div className={isFocusedRoot ? 'social-reply-group social-reply-group-focused' : 'social-reply-group'}>
      <ReplyRow
        reply={top}
        rowClickable={!isFocusedRoot}
        connectAfter={children.length > 0}
        onOpenThread={() => onOpenThread(top)}
        onReplyClick={() => (currentUserId && canInteract ? onOpenReply(top.id) : onBlockedInteraction())}
        likeCount={replyLikeCounts[top.id] ?? 0}
        liked={replyLikedByUser.has(top.id)}
        onLike={() => onLikeReply(top)}
        likeDisabled={replyLiking === top.id}
        canDelete={Boolean(currentUserId && top.author_id === currentUserId)}
        onDelete={() => onDeleteReply(top)}
      />
      {replyingTo === top.id && (
        <InlineReplyForm
          value={inlineBody}
          onChange={onInlineChange}
          onCancel={onCancelReply}
          onSubmit={event => onSubmitInline(event, top.id)}
          submitting={submitting}
        />
      )}
      {children.map((child, index) => (
        <div key={child.id} className="social-reply-item">
          <ReplyRow
            reply={child}
            connectBefore
            connectAfter={index < children.length - 1}
            onOpenThread={() => onOpenThread(child)}
            onReplyClick={() => (currentUserId && canInteract ? onOpenReply(child.id) : onBlockedInteraction())}
            likeCount={replyLikeCounts[child.id] ?? 0}
            liked={replyLikedByUser.has(child.id)}
            onLike={() => onLikeReply(child)}
            likeDisabled={replyLiking === child.id}
            canDelete={Boolean(currentUserId && child.author_id === currentUserId)}
            onDelete={() => onDeleteReply(child)}
          />
          {replyingTo === child.id && (
            <InlineReplyForm
              value={inlineBody}
              onChange={onInlineChange}
              onCancel={onCancelReply}
              onSubmit={event => onSubmitInline(event, child.id)}
              submitting={submitting}
            />
          )}
        </div>
      ))}
      {viewAllHref ? (
        <Link className="social-reply-view-all" href={viewAllHref}>
          View all {totalReplyCount ?? children.length} replies
        </Link>
      ) : null}
    </div>
  );
}

function ReplyRow({
  reply,
  rowClickable = true,
  connectBefore = false,
  connectAfter = false,
  onOpenThread,
  onReplyClick,
  likeCount,
  liked,
  onLike,
  likeDisabled,
  canDelete,
  onDelete,
}: {
  reply: SocialReply;
  rowClickable?: boolean;
  connectBefore?: boolean;
  connectAfter?: boolean;
  onOpenThread: () => void;
  onReplyClick: () => void;
  likeCount: number;
  liked: boolean;
  onLike: () => void;
  likeDisabled: boolean;
  canDelete: boolean;
  onDelete: () => void;
}) {
  return (
    <article
      className={`social-row ui44-list-row ui44-list-row-reply${rowClickable ? ' ui44-list-row-interactive' : ''}${connectBefore ? ' social-reply-connect-before' : ''}${connectAfter ? ' social-reply-connect-after' : ''}`}
      role={rowClickable ? 'link' : undefined}
      tabIndex={rowClickable ? 0 : undefined}
      onClick={rowClickable ? onOpenThread : undefined}
      onKeyDown={rowClickable ? event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenThread();
        }
      } : undefined}
    >
      <Link
        className="ui44-reply-avatar-link"
        href={authorHref(reply.authors)}
        aria-label={authorDisplayName(reply.authors)}
        onClick={event => event.stopPropagation()}
      >
        <SocialAvatar profile={reply.authors} />
      </Link>
      <div className="social-row-main ui44-reply-copy">
        <div className="ui44-community-author-line ui44-reply-author-line">
          <SocialAuthorLine author={reply.authors} createdAt={reply.created_at} handleOnly />
        </div>
        <p className="social-row-body"><SocialRichText text={reply.body} /></p>
        <div className="social-actions" onClick={event => event.stopPropagation()}>
          <button
            type="button"
            className="social-action social-action-like ui44-row-action"
            data-liked={liked ? 'true' : 'false'}
            onClick={onLike}
            disabled={likeDisabled}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <span className={likeCount > 0 ? 'social-action-like-hit social-action-like-hit-count' : 'social-action-like-hit'}>
              <SocialHeartIcon filled={liked} />
              {likeCount > 0 && <span className="social-action-count">{likeCount}</span>}
            </span>
          </button>
          <button
            type="button"
            className="social-action social-action-reply-label ui44-row-action"
            onClick={onReplyClick}
            aria-label="Reply"
          >
            <SocialChatBubbleIcon />
            <span className="social-action-label">Reply</span>
          </button>
          {canDelete && (
            <button
              type="button"
              className="social-action social-action-danger social-action-flush ui44-row-action ui44-row-action-delete"
              onClick={onDelete}
              aria-label="Delete reply"
            >
              <SocialTrashIcon />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function InlineReplyForm({
  value,
  onChange,
  onCancel,
  onSubmit,
  submitting,
}: {
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
}) {
  return (
    <form
      className="social-inline-composer"
      onSubmit={onSubmit}
    >
      <div className="social-inline-composer-box ui44-composed-field ui44-composed-field-editor">
        <Ui44Textarea
          surface="bare"
          className="os-input-textarea"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder="Write reply"
          autoFocus
        />
        <div className="social-inline-composer-actions">
          <button type="button" className="os-button os-button-ghost os-button-compact" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="submit"
            className="os-button os-button-primary os-button-compact"
            disabled={submitting || !value.trim()}
          >
            {submitting ? 'Posting...' : 'Reply'}
          </button>
        </div>
      </div>
    </form>
  );
}
