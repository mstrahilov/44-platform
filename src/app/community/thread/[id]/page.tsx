'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { PageShell, CenteredMessage } from '@/components/Ui';
import {
  SocialAuthorLine,
  SocialAvatar,
  SocialChatBubbleIcon,
  SocialEngagementRow,
  SocialHeartIcon,
  SocialTrashIcon,
} from '@/components/Social';
import { useTopbarBack } from '@/components/TopbarContext';
import { hasCommunityIdentity, communityIdentityMessage } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import {
  authorDisplayName,
  authorHref,
  compactDate,
  likersByPost,
  type LikeRow,
  type SocialLiker,
  type SocialPost,
  type SocialReply,
} from '@/lib/social';

type ReplyLikeRow = {
  reply_id: string;
  profile_id: string;
  profiles?: SocialLiker | null;
};

export default function CommunityThreadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  useTopbarBack({ href: '/community', label: 'Community' });
  const [thread, setThread] = useState<SocialPost | null>(null);
  const [replies, setReplies] = useState<SocialReply[]>([]);
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [replyLikes, setReplyLikes] = useState<ReplyLikeRow[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [inlineBody, setInlineBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [replyLiking, setReplyLiking] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadThread() {
      setLoading(true);

      const selectClause =
        '*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type), categories(id, slug, name)';
      let post: SocialPost | null = null;

      const { data: slugMatch } = await supabase
        .from('posts')
        .select(selectClause)
        .eq('slug', id)
        .eq('status', 'published')
        .maybeSingle();

      post = (slugMatch as SocialPost | null) ?? null;

      if (!post) {
        const { data: idMatch } = await supabase
          .from('posts')
          .select(selectClause)
          .eq('id', id)
          .eq('status', 'published')
          .maybeSingle();

        post = (idMatch as SocialPost | null) ?? null;
      }

      if (!post) {
        setThread(null);
        setReplies([]);
        setLikes([]);
        setReplyLikes([]);
        setLoading(false);
        return;
      }

      const [{ data: replyRows }, { data: likeRows }] = await Promise.all([
        supabase
          .from('post_replies')
          .select('*, authors:profiles!author_id(id, slug, display_name, username, avatar_url)')
          .eq('post_id', post.id)
          .eq('status', 'published')
          .order('created_at', { ascending: true }),
        supabase
          .from('post_likes')
          .select('post_id, profile_id, profiles:profiles!profile_id(id, display_name, username, avatar_url)')
          .eq('post_id', post.id)
          .order('created_at', { ascending: false }),
      ]);

      const replyList = (replyRows as SocialReply[] | null) ?? [];
      const replyIds = replyList.map(r => r.id);
      let replyLikeRows: ReplyLikeRow[] = [];
      if (replyIds.length > 0) {
        const { data: rlRows } = await supabase
          .from('reply_likes')
          .select('reply_id, profile_id, profiles:profiles!profile_id(id, display_name, username, avatar_url)')
          .in('reply_id', replyIds)
          .order('created_at', { ascending: false });
        replyLikeRows = (rlRows as ReplyLikeRow[] | null) ?? [];
      }

      setThread(post);
      setReplies(replyList);
      setLikes((likeRows as LikeRow[] | null) ?? []);
      setReplyLikes(replyLikeRows);
      setLoading(false);
    }

    loadThread();
  }, [id]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    loadStudioProfile(user.id).then(result => setProfile(result.profile));
  }, [user]);

  const likedByUser = useMemo(() => {
    if (!user) return false;
    return likes.some(like => like.profile_id === user.id);
  }, [likes, user]);

  const likersMap = useMemo(() => likersByPost(likes), [likes]);
  const threadLikers = thread ? (likersMap[thread.id] ?? []) : [];

  const replyLikersMap = useMemo(() => {
    const map: Record<string, SocialLiker[]> = {};
    replyLikes.forEach(row => {
      if (!row.profiles) return;
      if (!map[row.reply_id]) map[row.reply_id] = [];
      map[row.reply_id].push(row.profiles);
    });
    return map;
  }, [replyLikes]);

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

  const replyTree = useMemo(() => {
    const byId = new Map<string, SocialReply>();
    replies.forEach(r => byId.set(r.id, r));
    function topLevelAncestor(r: SocialReply): SocialReply {
      let cur = r;
      const seen = new Set<string>();
      while (cur.parent_reply_id && byId.has(cur.parent_reply_id) && !seen.has(cur.id)) {
        seen.add(cur.id);
        cur = byId.get(cur.parent_reply_id)!;
      }
      return cur;
    }
    const tops: SocialReply[] = [];
    const childrenMap = new Map<string, SocialReply[]>();
    replies.forEach(r => {
      if (!r.parent_reply_id) {
        tops.push(r);
        return;
      }
      const ancestor = topLevelAncestor(r);
      if (ancestor.id === r.id) return;
      if (!childrenMap.has(ancestor.id)) childrenMap.set(ancestor.id, []);
      childrenMap.get(ancestor.id)!.push(r);
    });
    return tops.map(top => ({ top, children: childrenMap.get(top.id) ?? [] }));
  }, [replies]);

  const canInteract = hasCommunityIdentity(profile);
  const isThreadAuthor = Boolean(user && thread && thread.author_id === user.id);

  async function toggleLike() {
    if (!thread || !user || liking) return;
    if (!canInteract) {
      setError(communityIdentityMessage());
      return;
    }

    setLiking(true);
    setError('');

    if (likedByUser) {
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', thread.id)
        .eq('profile_id', user.id);

      if (deleteError) {
        setError(deleteError.message);
      } else {
        setLikes(current => current.filter(entry => !(entry.post_id === thread.id && entry.profile_id === user.id)));
      }
    } else {
      const { error: insertError } = await supabase.from('post_likes').insert({ post_id: thread.id, profile_id: user.id });
      if (insertError) {
        setError(insertError.message);
      } else {
        const nextLike: LikeRow = {
          post_id: thread.id,
          profile_id: user.id,
          profiles: profile ? { id: profile.id, display_name: profile.display_name, username: profile.username, avatar_url: profile.avatar_url } : null,
        };
        setLikes(current => [nextLike, ...current]);
      }
    }

    setLiking(false);
  }

  async function toggleReplyLike(reply: SocialReply) {
    if (!user || replyLiking) return;
    if (!canInteract) {
      setError(communityIdentityMessage());
      return;
    }
    setReplyLiking(reply.id);
    setError('');

    const alreadyLiked = replyLikedByUser.has(reply.id);
    if (alreadyLiked) {
      const { error: deleteError } = await supabase
        .from('reply_likes')
        .delete()
        .eq('reply_id', reply.id)
        .eq('profile_id', user.id);
      if (deleteError) setError(deleteError.message);
      else setReplyLikes(current => current.filter(entry => !(entry.reply_id === reply.id && entry.profile_id === user.id)));
    } else {
      const { error: insertError } = await supabase.from('reply_likes').insert({ reply_id: reply.id, profile_id: user.id });
      if (insertError) {
        setError(insertError.message);
      } else {
        const nextLike: ReplyLikeRow = {
          reply_id: reply.id,
          profile_id: user.id,
          profiles: profile ? { id: profile.id, display_name: profile.display_name, username: profile.username, avatar_url: profile.avatar_url } : null,
        };
        setReplyLikes(current => [nextLike, ...current]);
      }
    }

    setReplyLiking('');
  }

  async function insertReply(body: string, parentReplyId: string | null) {
    if (!thread || !user) return null;
    const payload = {
      post_id: thread.id,
      author_id: user.id,
      parent_reply_id: parentReplyId,
      body: body.trim(),
      status: 'published',
    };
    const { data, error: insertError } = await supabase
      .from('post_replies')
      .insert(payload)
      .select('*, authors:profiles!author_id(id, slug, display_name, username, avatar_url)')
      .single();
    if (insertError) {
      setError(insertError.message);
      return null;
    }
    return data as SocialReply;
  }

  async function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!thread || !user || !replyBody.trim() || submitting) return;
    if (!canInteract) {
      setError(communityIdentityMessage());
      return;
    }
    setSubmitting(true);
    setError('');
    const created = await insertReply(replyBody, null);
    if (created) {
      setReplies(current => [...current, created]);
      setReplyBody('');
    }
    setSubmitting(false);
  }

  async function submitInlineReply(event: React.FormEvent<HTMLFormElement>, parentReplyId: string) {
    event.preventDefault();
    if (!thread || !user || !inlineBody.trim() || submitting) return;
    if (!canInteract) {
      setError(communityIdentityMessage());
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
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', thread.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.push('/community');
  }

  async function deleteReply(reply: SocialReply) {
    if (!user || reply.author_id !== user.id) return;
    if (!window.confirm('Delete this reply? This cannot be undone.')) return;
    const { error: deleteError } = await supabase.from('post_replies').delete().eq('id', reply.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setReplies(current => current.filter(r => r.id !== reply.id));
  }

  if (loading || authLoading) {
    return <PageShell><CenteredMessage>Loading thread...</CenteredMessage></PageShell>;
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
      <main className="social-shell">
        <article className="social-thread-hero">
          <Link href={authorHref(thread.creators)} aria-label={authorDisplayName(thread.creators)}>
            <SocialAvatar profile={thread.creators} />
          </Link>

          <div className="social-row-main">
            <SocialAuthorLine author={thread.creators} createdAt={thread.created_at} meta={thread.categories?.name ?? thread.post_type} />
            <h1 className="social-row-title social-row-title-lg">{thread.title}</h1>
            {thread.body && <p className="social-row-body">{thread.body}</p>}
            <div className="social-actions">
              <span className="social-action" aria-label={`${replies.length} replies`}>
                <SocialChatBubbleIcon />
                {replies.length > 0 && <span className="social-action-count">{replies.length}</span>}
              </span>
              <button
                type="button"
                className="social-action social-action-like"
                data-liked={likedByUser ? 'true' : 'false'}
                onClick={toggleLike}
                disabled={!user || liking || !canInteract}
                aria-label={likedByUser ? 'Unlike' : 'Like'}
              >
                <SocialHeartIcon filled={likedByUser} />
              </button>
              <SocialEngagementRow
                likers={threadLikers}
                likeCount={likes.length}
                repliers={repliers}
                replyCount={replies.length}
              />
              {isThreadAuthor && (
                <button
                  type="button"
                  className="social-action social-action-danger"
                  onClick={deleteThread}
                  aria-label="Delete post"
                >
                  <SocialTrashIcon />
                </button>
              )}
            </div>
          </div>
        </article>

        <section aria-label="Replies">
          {user && canInteract ? (
            <form className="social-composer" onSubmit={submitReply}>
              <SocialAvatar profile={profile} />
              <div className="social-composer-box">
                <textarea
                  className="social-composer-input"
                  value={replyBody}
                  onChange={event => setReplyBody(event.target.value)}
                  placeholder="Write your reply..."
                />
                <div className="social-composer-actions">
                  <div className="social-note os-type-meta">Reply publicly to this conversation.</div>
                  <button className="os-button os-button-primary os-button-compact" type="submit" disabled={submitting || !replyBody.trim()}>
                    {submitting ? 'Posting...' : 'Reply'}
                  </button>
                </div>
              </div>
            </form>
          ) : user ? (
            <div className="social-composer">
              <SocialAvatar profile={profile} />
              <div className="social-composer-actions">
                <div className="social-note os-type-body">Finish your community profile to reply and like posts.</div>
                <Link href="/account" className="os-button os-button-primary os-button-compact">Finish Setup</Link>
              </div>
            </div>
          ) : (
            <div className="social-composer">
              <SocialAvatar profile={null} />
              <div className="social-composer-actions">
                <div className="social-note os-type-body">Sign in to join this conversation.</div>
                <Link href="/login" className="os-button os-button-primary os-button-compact">Sign In</Link>
              </div>
            </div>
          )}

          {error && <div className="dashboard-status dashboard-status-error" style={{ marginTop: 14 }}>{error}</div>}

          <div className="social-feed" aria-label="Thread replies">
            {replyTree.length === 0 ? (
              <div className="app-empty-text">No replies yet.</div>
            ) : (
              replyTree.map(({ top, children }) => (
                <ReplyBranch
                  key={top.id}
                  top={top}
                  children={children}
                  currentUserId={user?.id ?? null}
                  currentProfile={profile}
                  canInteract={canInteract}
                  replyingTo={replyingTo}
                  onOpenReply={id => { setReplyingTo(id); setInlineBody(''); }}
                  onCancelReply={() => { setReplyingTo(null); setInlineBody(''); }}
                  inlineBody={inlineBody}
                  onInlineChange={setInlineBody}
                  onSubmitInline={submitInlineReply}
                  submitting={submitting}
                  replyLikersMap={replyLikersMap}
                  replyLikeCounts={replyLikeCounts}
                  replyLikedByUser={replyLikedByUser}
                  onLikeReply={toggleReplyLike}
                  replyLiking={replyLiking}
                  onDeleteReply={deleteReply}
                />
              ))
            )}
          </div>
        </section>
      </main>
    </PageShell>
  );
}

function ReplyBranch({
  top,
  children,
  currentUserId,
  currentProfile,
  canInteract,
  replyingTo,
  onOpenReply,
  onCancelReply,
  inlineBody,
  onInlineChange,
  onSubmitInline,
  submitting,
  replyLikersMap,
  replyLikeCounts,
  replyLikedByUser,
  onLikeReply,
  replyLiking,
  onDeleteReply,
}: {
  top: SocialReply;
  children: SocialReply[];
  currentUserId: string | null;
  currentProfile: StudioProfile | null;
  canInteract: boolean;
  replyingTo: string | null;
  onOpenReply: (id: string) => void;
  onCancelReply: () => void;
  inlineBody: string;
  onInlineChange: (value: string) => void;
  onSubmitInline: (event: React.FormEvent<HTMLFormElement>, parentReplyId: string) => void;
  submitting: boolean;
  replyLikersMap: Record<string, SocialLiker[]>;
  replyLikeCounts: Record<string, number>;
  replyLikedByUser: Set<string>;
  onLikeReply: (reply: SocialReply) => void;
  replyLiking: string;
  onDeleteReply: (reply: SocialReply) => void;
}) {
  return (
    <>
      <ReplyRow
        reply={top}
        canInteract={canInteract}
        onReplyClick={() => onOpenReply(top.id)}
        likers={replyLikersMap[top.id] ?? []}
        likeCount={replyLikeCounts[top.id] ?? 0}
        liked={replyLikedByUser.has(top.id)}
        onLike={() => onLikeReply(top)}
        likeDisabled={replyLiking === top.id}
        canDelete={Boolean(currentUserId && top.author_id === currentUserId)}
        onDelete={() => onDeleteReply(top)}
      />
      {replyingTo === top.id && (
        <InlineReplyForm
          currentProfile={currentProfile}
          value={inlineBody}
          onChange={onInlineChange}
          onCancel={onCancelReply}
          onSubmit={event => onSubmitInline(event, top.id)}
          submitting={submitting}
          nested
        />
      )}
      {children.map(child => (
        <div key={child.id} className="social-reply-child">
          <ReplyRow
            reply={child}
            canInteract={canInteract}
            onReplyClick={() => onOpenReply(child.id)}
            likers={replyLikersMap[child.id] ?? []}
            likeCount={replyLikeCounts[child.id] ?? 0}
            liked={replyLikedByUser.has(child.id)}
            onLike={() => onLikeReply(child)}
            likeDisabled={replyLiking === child.id}
            canDelete={Boolean(currentUserId && child.author_id === currentUserId)}
            onDelete={() => onDeleteReply(child)}
          />
          {replyingTo === child.id && (
            <InlineReplyForm
              currentProfile={currentProfile}
              value={inlineBody}
              onChange={onInlineChange}
              onCancel={onCancelReply}
              onSubmit={event => onSubmitInline(event, child.id)}
              submitting={submitting}
            />
          )}
        </div>
      ))}
    </>
  );
}

function ReplyRow({
  reply,
  canInteract,
  onReplyClick,
  likers,
  likeCount,
  liked,
  onLike,
  likeDisabled,
  canDelete,
  onDelete,
}: {
  reply: SocialReply;
  canInteract: boolean;
  onReplyClick: () => void;
  likers: SocialLiker[];
  likeCount: number;
  liked: boolean;
  onLike: () => void;
  likeDisabled: boolean;
  canDelete: boolean;
  onDelete: () => void;
}) {
  return (
    <article className="social-row">
      <Link href={authorHref(reply.authors)} aria-label={authorDisplayName(reply.authors)}>
        <SocialAvatar profile={reply.authors} />
      </Link>
      <div className="social-row-main">
        <SocialAuthorLine author={reply.authors} createdAt={reply.created_at} />
        <p className="social-row-body">{reply.body}</p>
        <div className="social-actions">
          <button
            type="button"
            className="social-action"
            onClick={onReplyClick}
            disabled={!canInteract}
            aria-label="Reply"
          >
            <SocialChatBubbleIcon />
          </button>
          <button
            type="button"
            className="social-action social-action-like"
            data-liked={liked ? 'true' : 'false'}
            onClick={onLike}
            disabled={!canInteract || likeDisabled}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <SocialHeartIcon filled={liked} />
          </button>
          <SocialEngagementRow likers={likers} likeCount={likeCount} />
          <span className="social-time" style={{ fontSize: 13, marginLeft: 'auto' }}>{compactDate(reply.created_at)}</span>
          {canDelete && (
            <button
              type="button"
              className="social-action social-action-danger"
              onClick={onDelete}
              aria-label="Delete reply"
              style={{ marginLeft: 0 }}
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
  currentProfile,
  value,
  onChange,
  onCancel,
  onSubmit,
  submitting,
  nested,
}: {
  currentProfile: StudioProfile | null;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  nested?: boolean;
}) {
  return (
    <form
      className="social-inline-composer"
      onSubmit={onSubmit}
      style={nested ? { marginLeft: 62 } : undefined}
    >
      <SocialAvatar profile={currentProfile} />
      <div className="social-inline-composer-box">
        <textarea
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder="Write a reply..."
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
