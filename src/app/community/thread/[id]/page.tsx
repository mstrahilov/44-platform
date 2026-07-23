'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { CenteredMessage, PageShell } from '@/components/Ui';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import {
  CommunityReportDialog,
  type CommunityReportTarget,
} from '@/components/CommunityReportDialog';
import {
  SocialPostRow,
} from '@/components/Social';
import { useTopbarBack } from '@/components/TopbarContext';
import { hasCommunityIdentity } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import {
  authorDisplayName,
  authorHandle,
  likersByPost,
  type LikeRow,
  type SocialLiker,
  type SocialReply,
} from '@/lib/social';
import {
  createDiscussionReply,
  deleteDiscussion,
  deleteDiscussionReply,
  loadDiscussionThread,
  setDiscussionLike,
  setReplyLike,
  updateDiscussion,
  updateDiscussionReply,
  type ReplyLikeRow,
} from '@/lib/domain/community';
import {
  COMMUNITY_INTENT_LABELS,
  createLocalCommunityReply,
  inferCommunityIntent,
  removeLocalCommunityPost,
  removeLocalCommunityReply,
  updateLocalCommunityPost,
  updateLocalCommunityReply,
  type CommunityV11Post,
  type CommunityV11Reply,
} from '@/lib/communityV11';
import {
  buildCommunityThreadModel,
  COMMUNITY_BRANCH_PAGE_SIZE,
  COMMUNITY_BRANCH_PREVIEW_SIZE,
  COMMUNITY_THREAD_PAGE_SIZE,
  visibleBranchReplies,
  visibleDirectReplies,
  type CommunityThreadBranch,
} from '@/lib/communityThreadModel';

type ThreadProfileState = {
  userId: string;
  profile: StudioProfile | null;
};

function roundUp(value: number, pageSize: number) {
  return Math.ceil(Math.max(1, value) / pageSize) * pageSize;
}

function isLocalPost(post: CommunityV11Post) {
  return Boolean(post.local_only);
}

function isLocalReply(reply: CommunityV11Reply) {
  return Boolean(reply.local_only || reply.id.startsWith('optimistic-'));
}

export default function CommunityThreadPage() {
  const { id, replyId } = useParams<{ id: string; replyId?: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  useTopbarBack({ href: '/community', label: 'Community' });

  const [thread, setThread] = useState<CommunityV11Post | null>(null);
  const [replies, setReplies] = useState<CommunityV11Reply[]>([]);
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [replyLikes, setReplyLikes] = useState<ReplyLikeRow[]>([]);
  const [profileState, setProfileState] = useState<ThreadProfileState | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [replyLiking, setReplyLiking] = useState('');
  const [directLimit, setDirectLimit] = useState(COMMUNITY_THREAD_PAGE_SIZE);
  const [expandedBranchIds, setExpandedBranchIds] = useState<Set<string>>(new Set());
  const [branchLimits, setBranchLimits] = useState<Record<string, number>>({});
  const [highlightedReplyId, setHighlightedReplyId] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [editingThread, setEditingThread] = useState(false);
  const [threadEditBody, setThreadEditBody] = useState('');
  const [threadEditSaving, setThreadEditSaving] = useState(false);
  const [reportTarget, setReportTarget] = useState<CommunityReportTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let alive = true;
    async function loadThread() {
      setLoading(true);
      setError('');
      try {
        const result = await loadDiscussionThread(id);
        if (!alive) return;
        if (!result) {
          setThread(null);
          setReplies([]);
          setLikes([]);
          setReplyLikes([]);
        } else {
          setThread(result.post);
          setReplies(result.replies);
          setLikes(result.likes);
          setReplyLikes(result.replyLikes);
        }
      } catch (loadError) {
        if (alive) setError(loadError instanceof Error ? loadError.message : 'Could not load this thread.');
      } finally {
        if (alive) setLoading(false);
      }
    }
    void loadThread();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setDirectLimit(COMMUNITY_THREAD_PAGE_SIZE);
      setExpandedBranchIds(new Set());
      setBranchLimits({});
      setHighlightedReplyId(null);
      setComposerOpen(false);
      setReplyingTo(null);
      setReplyBody('');
    });
  }, [id]);

  useEffect(() => {
    if (!userId) return;
    const activeUserId = userId;
    let alive = true;
    void loadStudioProfile(activeUserId).then(result => {
      if (alive) setProfileState({ userId: activeUserId, profile: result.profile });
    });
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    function updateKeyboardInset() {
      const inset = Math.max(0, window.innerHeight - viewport!.height - viewport!.offsetTop);
      setKeyboardInset(inset > 80 ? Math.round(inset) : 0);
    }
    updateKeyboardInset();
    viewport.addEventListener('resize', updateKeyboardInset);
    viewport.addEventListener('scroll', updateKeyboardInset);
    return () => {
      viewport.removeEventListener('resize', updateKeyboardInset);
      viewport.removeEventListener('scroll', updateKeyboardInset);
    };
  }, []);

  const profile = profileState && profileState.userId === userId ? profileState.profile : null;
  const canInteract = hasCommunityIdentity(profile);
  const threadModel = useMemo(() => buildCommunityThreadModel(replies), [replies]);
  const directReplies = threadModel.directReplies;
  const visibleReplies = useMemo(
    () => visibleDirectReplies(threadModel, directLimit),
    [directLimit, threadModel],
  );

  useEffect(() => {
    if (!replyId || loading) return;
    const target = threadModel.byId.get(replyId);
    if (!target) return;

    let root = target;
    const visited = new Set<string>();
    while (root.parent_reply_id && threadModel.byId.has(root.parent_reply_id) && !visited.has(root.id)) {
      visited.add(root.id);
      root = threadModel.byId.get(root.parent_reply_id)!;
    }

    const directIndex = directReplies.findIndex(reply => reply.id === root.id);
    const branch = target.id !== root.id ? threadModel.branches.get(root.id) : undefined;
    const descendantIndex = branch?.descendants.findIndex(row => row.reply.id === target.id) ?? -1;
    let nestedFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      if (directIndex >= 0) {
        setDirectLimit(current => Math.max(current, roundUp(directIndex + 1, COMMUNITY_THREAD_PAGE_SIZE)));
      }
      if (target.id !== root.id) {
        setExpandedBranchIds(current => {
          if (current.has(root.id)) return current;
          const next = new Set(current);
          next.add(root.id);
          return next;
        });
        if (descendantIndex >= 0) {
          setBranchLimits(current => ({
            ...current,
            [root.id]: Math.max(
              current[root.id] ?? COMMUNITY_BRANCH_PAGE_SIZE,
              roundUp(descendantIndex + 1, COMMUNITY_BRANCH_PAGE_SIZE),
            ),
          }));
        }
      }
      nestedFrame = window.requestAnimationFrame(() => {
        document.getElementById(`community-reply-${replyId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setHighlightedReplyId(replyId);
      });
    });
    const timer = window.setTimeout(() => setHighlightedReplyId(current => current === replyId ? null : current), 2_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(nestedFrame);
      window.clearTimeout(timer);
    };
  }, [directReplies, loading, replyId, threadModel]);

  const likedByUser = useMemo(
    () => Boolean(user && likes.some(like => like.profile_id === user.id)),
    [likes, user],
  );
  const threadLikers = useMemo(
    () => thread ? (likersByPost(likes)[thread.id] ?? []) : [],
    [likes, thread],
  );
  const replyLikeCounts = useMemo(() => replyLikes.reduce<Record<string, number>>((counts, row) => {
    counts[row.reply_id] = (counts[row.reply_id] ?? 0) + 1;
    return counts;
  }, {}), [replyLikes]);
  const replyLikedByUser = useMemo(() => new Set(
    user
      ? replyLikes.filter(row => row.profile_id === user.id).map(row => row.reply_id)
      : [],
  ), [replyLikes, user]);

  const repliers = useMemo(() => {
    const rows: SocialLiker[] = [];
    const seen = new Set<string>();
    [...directReplies].reverse().forEach(reply => {
      if (reply.authors && !seen.has(reply.authors.id)) {
        seen.add(reply.authors.id);
        rows.push(reply.authors);
      }
    });
    return rows;
  }, [directReplies]);

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

  function focusComposer(parentReplyId: string | null) {
    requireCommunityInteraction(() => {
      setComposerOpen(true);
      setReplyingTo(parentReplyId);
      window.requestAnimationFrame(() => {
        composerRef.current?.focus({ preventScroll: true });
      });
    });
  }

  function closeComposer() {
    setComposerOpen(false);
    setReplyingTo(null);
    setReplyBody('');
    composerRef.current?.blur();
  }

  function directRootFor(replyIdToFind: string) {
    let current = threadModel.byId.get(replyIdToFind) ?? null;
    const seen = new Set<string>();
    while (current?.parent_reply_id && threadModel.byId.has(current.parent_reply_id) && !seen.has(current.id)) {
      seen.add(current.id);
      current = threadModel.byId.get(current.parent_reply_id) ?? null;
    }
    return current;
  }

  async function toggleLike() {
    if (!thread || liking) return;
    requireCommunityInteraction(() => { void toggle(); });

    async function toggle() {
      if (!thread || !user) return;
      setLiking(true);
      setError('');
      const wasLiked = likedByUser;
      const optimistic: LikeRow = {
        post_id: thread.id,
        profile_id: user.id,
        profiles: profile ? {
          id: profile.id,
          display_name: profile.display_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
        } : null,
      };
      setLikes(current => wasLiked
        ? current.filter(row => !(row.post_id === thread.id && row.profile_id === user.id))
        : [optimistic, ...current]);
      try {
        if (!isLocalPost(thread)) await setDiscussionLike(thread.id, user.id, !wasLiked);
      } catch (likeError) {
        setLikes(current => wasLiked
          ? [optimistic, ...current]
          : current.filter(row => !(row.post_id === thread.id && row.profile_id === user.id)));
        setError(likeError instanceof Error ? likeError.message : 'Could not update this like.');
      } finally {
        setLiking(false);
      }
    }
  }

  async function toggleReplyLike(reply: CommunityV11Reply) {
    if (replyLiking) return;
    requireCommunityInteraction(() => { void toggle(); });

    async function toggle() {
      if (!user) return;
      setReplyLiking(reply.id);
      setError('');
      const wasLiked = replyLikedByUser.has(reply.id);
      const optimistic: ReplyLikeRow = {
        reply_id: reply.id,
        profile_id: user.id,
        profiles: profile ? {
          id: profile.id,
          display_name: profile.display_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
        } : null,
      };
      setReplyLikes(current => wasLiked
        ? current.filter(row => !(row.reply_id === reply.id && row.profile_id === user.id))
        : [optimistic, ...current]);
      try {
        if (!isLocalReply(reply)) await setReplyLike(reply.id, user.id, !wasLiked);
      } catch (likeError) {
        setReplyLikes(current => wasLiked
          ? [optimistic, ...current]
          : current.filter(row => !(row.reply_id === reply.id && row.profile_id === user.id)));
        setError(likeError instanceof Error ? likeError.message : 'Could not update this reply like.');
      } finally {
        setReplyLiking('');
      }
    }
  }

  async function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!thread || !user || !profile || !replyBody.trim() || submitting) return;
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }

    const body = replyBody.trim();
    const parentReplyId = replyingTo;
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimisticReply: CommunityV11Reply = {
      id: optimisticId,
      post_id: thread.id,
      author_id: user.id,
      parent_reply_id: parentReplyId,
      body,
      status: 'published',
      created_at: new Date().toISOString(),
      authors: profile,
      local_only: isLocalPost(thread),
    };

    setSubmitting(true);
    setError('');
    setReplies(current => [...current, optimisticReply]);
    setHighlightedReplyId(optimisticId);

    const branchRoot = parentReplyId ? directRootFor(parentReplyId) : null;
    if (branchRoot) {
      setExpandedBranchIds(current => new Set(current).add(branchRoot.id));
      setBranchLimits(current => ({
        ...current,
        [branchRoot.id]: Math.max(
          current[branchRoot.id] ?? COMMUNITY_BRANCH_PAGE_SIZE,
          (threadModel.branches.get(branchRoot.id)?.descendants.length ?? 0) + 1,
        ),
      }));
    } else {
      setDirectLimit(current => Math.max(current, directReplies.length + 1));
    }

    try {
      const created = isLocalPost(thread)
        ? createLocalCommunityReply({
          postId: thread.id,
          author: profile,
          parentReplyId,
          body,
        })
        : await createDiscussionReply({
          postId: thread.id,
          authorId: user.id,
          parentReplyId,
          body,
        });
      setReplies(current => current.map(reply => reply.id === optimisticId ? created : reply));
      closeComposer();
      setHighlightedReplyId(created.id);
      window.setTimeout(() => {
        document.getElementById(`community-reply-${created.id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 40);
      window.setTimeout(() => setHighlightedReplyId(current => current === created.id ? null : current), 2_000);
    } catch (insertError) {
      setReplies(current => current.filter(reply => reply.id !== optimisticId));
      setHighlightedReplyId(null);
      setError(`${insertError instanceof Error ? insertError.message : 'Could not create this reply.'} Your draft is still here—tap Reply to retry.`);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteThread() {
    if (!thread || !user || !isThreadAuthor) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      if (isLocalPost(thread)) removeLocalCommunityPost(thread.id);
      else await deleteDiscussion(thread.id, user.id);
      router.push('/community');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this thread.');
    }
  }

  function beginEditingThread() {
    if (!thread || !user || thread.author_id !== user.id) return;
    setThreadEditBody(thread.body ?? '');
    setEditingThread(true);
  }

  function cancelEditingThread() {
    if (threadEditSaving) return;
    setEditingThread(false);
    setThreadEditBody('');
  }

  async function saveThreadEdit() {
    if (!thread || !user || thread.author_id !== user.id || threadEditSaving || !threadEditBody.trim()) return;
    setThreadEditSaving(true);
    setError('');
    try {
      const updated = isLocalPost(thread)
        ? updateLocalCommunityPost(thread.id, threadEditBody)
        : await updateDiscussion(thread.id, user.id, threadEditBody);
      if (!updated) throw new Error('Could not update this post.');
      setThread(updated);
      setEditingThread(false);
      setThreadEditBody('');
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : 'Could not update this post.');
    } finally {
      setThreadEditSaving(false);
    }
  }

  async function editReply(reply: CommunityV11Reply, body: string) {
    if (!user || reply.author_id !== user.id || !body.trim()) return;
    setError('');
    try {
      const updated = isLocalReply(reply)
        ? updateLocalCommunityReply(reply.id, body)
        : await updateDiscussionReply(reply.id, user.id, body);
      if (!updated) throw new Error('Could not update this reply.');
      setReplies(current => current.map(row => row.id === reply.id ? updated : row));
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : 'Could not update this reply.');
      throw editError;
    }
  }

  function openReport(target: CommunityReportTarget) {
    requireCommunityInteraction(() => setReportTarget(target));
  }

  async function deleteReply(reply: CommunityV11Reply) {
    if (!user || reply.author_id !== user.id) return;
    if (!window.confirm('Delete this reply? This cannot be undone.')) return;
    try {
      if (isLocalReply(reply)) removeLocalCommunityReply(reply.id);
      else await deleteDiscussionReply(reply.id, user.id);
      const removed = new Set<string>([reply.id]);
      let changed = true;
      while (changed) {
        changed = false;
        replies.forEach(row => {
          if (row.parent_reply_id && removed.has(row.parent_reply_id) && !removed.has(row.id)) {
            removed.add(row.id);
            changed = true;
          }
        });
      }
      setReplies(current => current.filter(row => !removed.has(row.id)));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this reply.');
    }
  }

  function jumpToLatest() {
    setDirectLimit(directReplies.length);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const latest = directReplies.at(-1);
        if (latest) document.getElementById(`community-reply-${latest.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    });
  }

  if (loading || authLoading) {
    return <PageShell><CenteredMessage status>Loading thread...</CenteredMessage></PageShell>;
  }

  if (!thread) {
    return <PageShell><CenteredMessage>{error || 'Thread not found.'}</CenteredMessage></PageShell>;
  }

  const intent = inferCommunityIntent(thread);
  const composerParent = replyingTo ? threadModel.byId.get(replyingTo) ?? null : null;
  const composerTarget = composerParent?.authors ?? thread.creators;
  const composerTargetName = authorHandle(composerTarget) || authorDisplayName(composerTarget);

  return (
    <PageShell>
      <main className="social-shell social-thread-page community-thread-v11">
        <section className="community-thread-conversation" aria-label="Conversation">
          {error && (
            <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error ui44-field-error community-thread-error" role="alert">
              {error}
            </div>
          )}

          <div className="community-thread-root ui44-panel ui44-panel-glass">
            <SocialPostRow
              post={thread}
              replyCount={directReplies.length}
              likeCount={likes.length}
              liked={likedByUser}
              likers={threadLikers}
              repliers={repliers}
              onLike={toggleLike}
              onReplyClick={() => focusComposer(null)}
              replyActionLabel="Reply"
              canDelete={isThreadAuthor}
              canEdit={isThreadAuthor}
              onDelete={deleteThread}
              onEdit={beginEditingThread}
              onReport={() => openReport({ kind: 'post', id: thread.id })}
              disabled={liking}
              titleSize="lg"
              handleOnly
              rowClickable={false}
              meta={intent === 'general' ? undefined : (
                <span className="community-intent-label">{COMMUNITY_INTENT_LABELS[intent]}</span>
              )}
              references={thread.community_references}
              editing={editingThread}
              editBody={threadEditBody}
              editSaving={threadEditSaving}
              onEditBodyChange={setThreadEditBody}
              onSaveEdit={() => { void saveThreadEdit(); }}
              onCancelEdit={cancelEditingThread}
            />
          </div>

          <header className="community-thread-replies-heading">
            <h1>Replies</h1>
            <span>{directReplies.length}</span>
          </header>

          <div className="community-thread-reply-list" aria-live="polite">
            {directReplies.length === 0 ? (
              <div className="community-thread-empty">
                <strong>Start the conversation.</strong>
                <span>Be the first to reply.</span>
              </div>
            ) : (
              visibleReplies.map(reply => {
                const branch = threadModel.branches.get(reply.id) ?? { root: reply, descendants: [] };
                const expanded = expandedBranchIds.has(reply.id);
                const branchLimit = branchLimits[reply.id] ?? COMMUNITY_BRANCH_PAGE_SIZE;
                return (
                  <ReplyBranch
                    key={reply.id}
                    threadId={thread.id}
                    branch={branch}
                    expanded={expanded}
                    branchLimit={branchLimit}
                    currentUserId={userId}
                    highlightedReplyId={highlightedReplyId}
                    replyLikeCounts={replyLikeCounts}
                    replyLikedByUser={replyLikedByUser}
                    replyLiking={replyLiking}
                    onLikeReply={toggleReplyLike}
                    onReply={focusComposer}
                    onDeleteReply={deleteReply}
                    onEditReply={editReply}
                    onReportReply={reply => openReport({ kind: 'reply', id: reply.id })}
                    onExpand={() => {
                      setExpandedBranchIds(current => new Set(current).add(reply.id));
                      setBranchLimits(current => ({
                        ...current,
                        [reply.id]: Math.max(current[reply.id] ?? 0, COMMUNITY_BRANCH_PAGE_SIZE),
                      }));
                    }}
                    onCollapse={() => setExpandedBranchIds(current => {
                      const next = new Set(current);
                      next.delete(reply.id);
                      return next;
                    })}
                    onLoadMore={() => setBranchLimits(current => ({
                      ...current,
                      [reply.id]: (current[reply.id] ?? COMMUNITY_BRANCH_PAGE_SIZE) + COMMUNITY_BRANCH_PAGE_SIZE,
                    }))}
                  />
                );
              })
            )}
          </div>

          {directReplies.length > COMMUNITY_THREAD_PAGE_SIZE && (
            <div className="community-thread-pagination">
              {visibleReplies.length < directReplies.length && (
                <button
                  type="button"
                  className="os-button os-button-secondary os-button-compact"
                  onClick={() => setDirectLimit(current => current + COMMUNITY_THREAD_PAGE_SIZE)}
                >
                  Load {Math.min(COMMUNITY_THREAD_PAGE_SIZE, directReplies.length - visibleReplies.length)} more
                </button>
              )}
              <button type="button" className="os-button os-button-ghost os-button-compact" onClick={jumpToLatest}>
                Jump to latest
              </button>
            </div>
          )}
        </section>
      </main>

      {composerOpen && user && canInteract && (
        <div
          className="community-thread-composer-shell"
          data-keyboard-open={keyboardInset > 0 ? 'true' : 'false'}
          style={{ '--community-keyboard-inset': `${keyboardInset}px` } as React.CSSProperties}
        >
          <form className="community-thread-composer" onSubmit={submitReply}>
            <div className="community-thread-composer-context">
              <span className="community-thread-composer-context-copy">
                <span>Replying to </span>
                <span className="community-thread-composer-target">@{composerTargetName}</span>
              </span>
              <button type="button" onClick={closeComposer} aria-label="Close reply composer">×</button>
            </div>
            <div className="community-thread-composer-row">
              <textarea
                ref={composerRef}
                className="ui44-input ui44-textarea ui44-input-bare community-thread-composer-input"
                rows={1}
                value={replyBody}
                onChange={event => setReplyBody(event.target.value)}
                placeholder="Type your reply"
                aria-label="Write a reply"
              />
              <button
                className="os-button os-button-primary os-button-compact community-thread-composer-submit"
                type="submit"
                disabled={submitting || !replyBody.trim()}
              >
                {submitting ? 'Posting…' : error && replyBody.trim() ? 'Retry' : 'Reply'}
              </button>
            </div>
          </form>
        </div>
      )}

      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
      <CommunityReportDialog target={reportTarget} onClose={() => setReportTarget(null)} />
    </PageShell>
  );
}

function ReplyBranch({
  threadId,
  branch,
  expanded,
  branchLimit,
  currentUserId,
  highlightedReplyId,
  replyLikeCounts,
  replyLikedByUser,
  replyLiking,
  onLikeReply,
  onReply,
  onDeleteReply,
  onEditReply,
  onReportReply,
  onExpand,
  onCollapse,
  onLoadMore,
}: {
  threadId: string;
  branch: CommunityThreadBranch;
  expanded: boolean;
  branchLimit: number;
  currentUserId: string | null;
  highlightedReplyId: string | null;
  replyLikeCounts: Record<string, number>;
  replyLikedByUser: Set<string>;
  replyLiking: string;
  onLikeReply: (reply: CommunityV11Reply) => void;
  onReply: (replyId: string) => void;
  onDeleteReply: (reply: CommunityV11Reply) => void;
  onEditReply: (reply: CommunityV11Reply, body: string) => Promise<void>;
  onReportReply: (reply: CommunityV11Reply) => void;
  onExpand: () => void;
  onCollapse: () => void;
  onLoadMore: () => void;
}) {
  const visibleDescendants = visibleBranchReplies(branch, expanded, branchLimit);
  const hiddenCount = branch.descendants.length - visibleDescendants.length;

  return (
    <article className="community-thread-branch">
      <ReplyRow
        threadId={threadId}
        reply={branch.root}
        highlighted={highlightedReplyId === branch.root.id}
        likeCount={replyLikeCounts[branch.root.id] ?? 0}
        liked={replyLikedByUser.has(branch.root.id)}
        likeDisabled={replyLiking === branch.root.id}
        canDelete={Boolean(currentUserId && branch.root.author_id === currentUserId)}
        onLike={() => onLikeReply(branch.root as CommunityV11Reply)}
        onReply={() => onReply(branch.root.id)}
        onDelete={() => onDeleteReply(branch.root as CommunityV11Reply)}
        onEdit={body => onEditReply(branch.root as CommunityV11Reply, body)}
        onReport={() => onReportReply(branch.root as CommunityV11Reply)}
      />

      {visibleDescendants.length > 0 && (
        <div className="community-thread-branch-replies">
          {visibleDescendants.map(({ reply }) => (
            <ReplyRow
              key={reply.id}
              threadId={threadId}
              reply={reply}
              highlighted={highlightedReplyId === reply.id}
              likeCount={replyLikeCounts[reply.id] ?? 0}
              liked={replyLikedByUser.has(reply.id)}
              likeDisabled={replyLiking === reply.id}
              canDelete={Boolean(currentUserId && reply.author_id === currentUserId)}
              onLike={() => onLikeReply(reply as CommunityV11Reply)}
              onReply={() => onReply(reply.id)}
              onDelete={() => onDeleteReply(reply as CommunityV11Reply)}
              onEdit={body => onEditReply(reply as CommunityV11Reply, body)}
              onReport={() => onReportReply(reply as CommunityV11Reply)}
            />
          ))}
        </div>
      )}

      {branch.descendants.length > COMMUNITY_BRANCH_PREVIEW_SIZE && (
        <div className="community-thread-branch-controls">
          {!expanded ? (
            <button type="button" onClick={onExpand}>
              View {branch.descendants.length - COMMUNITY_BRANCH_PREVIEW_SIZE} more {branch.descendants.length - COMMUNITY_BRANCH_PREVIEW_SIZE === 1 ? 'reply' : 'replies'}
            </button>
          ) : (
            <>
              {hiddenCount > 0 && (
                <button type="button" onClick={onLoadMore}>
                  Load {Math.min(COMMUNITY_BRANCH_PAGE_SIZE, hiddenCount)} more
                </button>
              )}
              <button type="button" onClick={onCollapse}>Hide replies</button>
            </>
          )}
        </div>
      )}
    </article>
  );
}

function ReplyRow({
  threadId,
  reply,
  highlighted,
  likeCount,
  liked,
  likeDisabled,
  canDelete,
  onLike,
  onReply,
  onDelete,
  onEdit,
  onReport,
}: {
  threadId: string;
  reply: SocialReply;
  highlighted: boolean;
  likeCount: number;
  liked: boolean;
  likeDisabled: boolean;
  canDelete: boolean;
  onLike: () => void;
  onReply: () => void;
  onDelete: () => void;
  onEdit: (body: string) => Promise<void>;
  onReport: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(reply.body);
  const [editSaving, setEditSaving] = useState(false);
  const href = `/community/thread/${threadId}/reply/${reply.id}`;

  async function saveEdit() {
    if (editSaving || !editBody.trim()) return;
    setEditSaving(true);
    try {
      await onEdit(editBody);
      setEditing(false);
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <SocialPostRow
      post={reply}
      articleId={`community-reply-${reply.id}`}
      replyId={reply.id}
      rowClassName={`ui44-list-row-reply community-thread-reply${highlighted ? ' community-thread-reply-highlighted' : ''}`}
      hrefOverride={href}
      contentLabel="Reply"
      likeCount={likeCount}
      liked={liked}
      onLike={onLike}
      onReplyClick={onReply}
      replyActionLabel="Reply"
      canDelete={canDelete}
      canEdit={canDelete}
      onDelete={onDelete}
      onEdit={() => {
        setEditBody(reply.body);
        setEditing(true);
      }}
      onReport={onReport}
      disabled={likeDisabled}
      handleOnly
      rowClickable={false}
      editing={editing}
      editBody={editBody}
      editSaving={editSaving}
      onEditBodyChange={setEditBody}
      onSaveEdit={() => { void saveEdit(); }}
      onCancelEdit={() => {
        setEditBody(reply.body);
        setEditing(false);
      }}
    />
  );
}
