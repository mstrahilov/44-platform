'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PageShell } from '@/components/Ui';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import {
  SocialAuthorLine,
  SocialAvatar,
  SocialChatBubbleIcon,
  SocialEngagementRow,
  SocialHeartIcon,
  SocialPostRow,
} from '@/components/Social';
import { useCommunityTopbarTabs } from '@/components/CommunityTopbarTabs';
import { hasCommunityIdentity } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useAuth } from '@/lib/useAuth';
import { countById, isGeneralPost, likersByPost, repliersByPost, type CountMap, type LikeRow, type LikersMap, type ReplyEngagerRow, type SocialLiker, type SocialPost, type SocialReply } from '@/lib/social';
import { normalizeTaxonomyValue } from '@/lib/taxonomy';

type PostLike = LikeRow;
type InlineReply = SocialReply;
type ReplyLikeRow = {
  reply_id: string;
  profile_id: string;
  profiles?: SocialLiker | null;
};

function buildPostTitle(body: string) {
  return body.trim().replace(/\s+/g, ' ').slice(0, 72) || 'New post';
}

function buildSlug(body: string) {
  const base = normalizeTaxonomyValue(buildPostTitle(body)) || 'thread';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export default function CommunityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [replyCounts, setReplyCounts] = useState<CountMap>({});
  const [repliersMap, setRepliersMap] = useState<LikersMap>({});
  const [likes, setLikes] = useState<PostLike[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [likingId, setLikingId] = useState('');
  const [composerFocused, setComposerFocused] = useState(false);
  const [postBody, setPostBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [openRepliesPostId, setOpenRepliesPostId] = useState<string | null>(null);
  const [inlineReplies, setInlineReplies] = useState<Record<string, InlineReply[]>>({});
  const [inlineReplyLikes, setInlineReplyLikes] = useState<Record<string, ReplyLikeRow[]>>({});
  const [replyBody, setReplyBody] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyingToReplyId, setReplyingToReplyId] = useState<string | null>(null);
  const [replyLikingId, setReplyLikingId] = useState('');
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);

  useCommunityTopbarTabs('feed');

  useEffect(() => {
    async function fetchCommunity() {
      const [{ data: postRows }, { data: replyRows }, { data: likeRows }] = await Promise.all([
        supabase
          .from('posts')
          .select('*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type, country_code, home_country_code), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(80),
        supabase
          .from('post_replies')
          .select('post_id, author_id, authors:profiles!author_id(id, display_name, username, avatar_url)')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase
          .from('post_likes')
          .select('post_id, profile_id, profiles:profiles!profile_id(id, display_name, username, avatar_url)')
          .order('created_at', { ascending: false }),
      ]);
      setPosts((postRows as SocialPost[] | null) ?? []);
      const replies = (replyRows as ReplyEngagerRow[] | null) ?? [];
      setReplyCounts(countById(replies, 'post_id'));
      setRepliersMap(repliersByPost(replies));
      setLikes((likeRows as PostLike[] | null) ?? []);
    }
    fetchCommunity();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    loadStudioProfile(user.id).then(result => setProfile(result.profile));
  }, [user]);

  const likeCounts = useMemo(() => countById(likes, 'post_id'), [likes]);
  const likersMap: LikersMap = useMemo(() => likersByPost(likes), [likes]);
  const likedIds = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(likes.filter(like => like.profile_id === user.id).map(like => like.post_id));
  }, [likes, user]);
  const canInteract = hasCommunityIdentity(profile);
  const generalPosts = useMemo(() => posts.filter(post => isGeneralPost(post)), [posts]);
  const openReplyLikes = openRepliesPostId ? (inlineReplyLikes[openRepliesPostId] ?? []) : [];
  const inlineReplyLikedIds = useMemo(() => {
    const set = new Set<string>();
    if (!user) return set;
    openReplyLikes.forEach(like => {
      if (like.profile_id === user.id) set.add(like.reply_id);
    });
    return set;
  }, [openReplyLikes, user]);
  const inlineReplyLikeCounts = useMemo(() => countById(openReplyLikes, 'reply_id'), [openReplyLikes]);
  const inlineReplyLikersMap = useMemo(() => {
    const map: Record<string, SocialLiker[]> = {};
    openReplyLikes.forEach(row => {
      if (!row.profiles) return;
      if (!map[row.reply_id]) map[row.reply_id] = [];
      map[row.reply_id].push(row.profiles);
    });
    return map;
  }, [openReplyLikes]);

  function requireCommunityAction(action: () => void) {
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

  async function submitPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || posting || !postBody.trim()) return;
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }

    setPosting(true);
    setError('');
    const body = postBody.trim();
    const { data, error: insertError } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        category_id: null,
        slug: buildSlug(body),
        title: buildPostTitle(body),
        body,
        post_type: 'general',
        status: 'published',
      })
      .select('*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type, country_code, home_country_code), categories(id, slug, name)')
      .single();

    if (insertError) {
      setError(insertError.message);
      setPosting(false);
      return;
    }

    setPosts(current => [data as SocialPost, ...current]);
    setPostBody('');
    setComposerFocused(false);
    setPosting(false);
  }

  async function loadReplies(postId: string) {
    if (inlineReplies[postId]) return;
    const { data, error: replyError } = await supabase
      .from('post_replies')
      .select('*, authors:profiles!author_id(id, slug, display_name, username, avatar_url)')
      .eq('post_id', postId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    if (replyError) {
      setError(replyError.message);
      return;
    }
    const replies = (data as InlineReply[] | null) ?? [];
    const replyIds = replies.map(reply => reply.id);
    let replyLikes: ReplyLikeRow[] = [];
    if (replyIds.length > 0) {
      const { data: likeRows, error: likeError } = await supabase
        .from('reply_likes')
        .select('reply_id, profile_id, profiles:profiles!profile_id(id, display_name, username, avatar_url)')
        .in('reply_id', replyIds)
        .order('created_at', { ascending: false });
      if (likeError) {
        setError(likeError.message);
        return;
      }
      replyLikes = (likeRows as unknown as ReplyLikeRow[] | null) ?? [];
    }
    setInlineReplies(current => ({ ...current, [postId]: replies }));
    setInlineReplyLikes(current => ({ ...current, [postId]: replyLikes }));
  }

  async function openPostReply(post: SocialPost) {
    setReplyBody('');
    setReplyingToReplyId(null);
    if (openRepliesPostId !== post.id) {
      setOpenRepliesPostId(post.id);
      await loadReplies(post.id);
    } else if (!replyingToReplyId) {
      setOpenRepliesPostId(null);
    }
  }

  async function submitInlineReply(event: React.FormEvent<HTMLFormElement>, post: SocialPost) {
    event.preventDefault();
    if (!user || replying || !replyBody.trim()) return;
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }
    setReplying(true);
    setError('');
    const { data, error: insertError } = await supabase
      .from('post_replies')
      .insert({
        post_id: post.id,
        author_id: user.id,
        parent_reply_id: replyingToReplyId,
        body: replyBody.trim(),
        status: 'published',
      })
      .select('*, authors:profiles!author_id(id, slug, display_name, username, avatar_url)')
      .single();
    if (insertError) {
      setError(insertError.message);
      setReplying(false);
      return;
    }
    const created = data as InlineReply;
    setInlineReplies(current => ({ ...current, [post.id]: [created, ...(current[post.id] ?? [])] }));
    setReplyCounts(current => ({ ...current, [post.id]: (current[post.id] ?? 0) + 1 }));
    setRepliersMap(current => ({ ...current, [post.id]: [created.authors, ...(current[post.id] ?? [])].filter(Boolean) as NonNullable<InlineReply['authors']>[] }));
    setReplyBody('');
    setReplyingToReplyId(null);
    setReplying(false);
  }

  async function toggleInlineReplyLike(reply: InlineReply) {
    if (replyLikingId || !openRepliesPostId) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }

    setReplyLikingId(reply.id);
    setError('');
    const alreadyLiked = inlineReplyLikedIds.has(reply.id);

    if (alreadyLiked) {
      const { error: deleteError } = await supabase
        .from('reply_likes')
        .delete()
        .eq('reply_id', reply.id)
        .eq('profile_id', user.id);
      if (deleteError) {
        setError(deleteError.message);
      } else {
        setInlineReplyLikes(current => ({
          ...current,
          [openRepliesPostId]: (current[openRepliesPostId] ?? []).filter(like => !(like.reply_id === reply.id && like.profile_id === user.id)),
        }));
      }
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
        setInlineReplyLikes(current => ({
          ...current,
          [openRepliesPostId]: [nextLike, ...(current[openRepliesPostId] ?? [])],
        }));
      }
    }

    setReplyLikingId('');
  }

  async function toggleLike(post: SocialPost) {
    if (likingId) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }

    setLikingId(post.id);
    setError('');
    const liked = likedIds.has(post.id);
    if (liked) {
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('profile_id', user.id);
      if (deleteError) setError(deleteError.message);
      else setLikes(current => current.filter(like => !(like.post_id === post.id && like.profile_id === user.id)));
    } else {
      const nextLike: PostLike = {
        post_id: post.id,
        profile_id: user.id,
        profiles: profile ? { id: profile.id, display_name: profile.display_name, username: profile.username, avatar_url: profile.avatar_url } : null,
      };
      const { error: insertError } = await supabase.from('post_likes').insert({ post_id: post.id, profile_id: user.id });
      if (insertError) setError(insertError.message);
      else setLikes(current => [...current, nextLike]);
    }
    setLikingId('');
  }

  async function deletePost(post: SocialPost) {
    if (!user || post.author_id !== user.id) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setPosts(current => current.filter(p => p.id !== post.id));
  }

  return (
    <PageShell>
      <main className="social-shell">
        <header className="social-header">
          <div className="social-title-row">
            <div>
              <h1 className="os-type-display">Community</h1>
              <p className="social-title-copy os-type-body">
                General posts from the 44 community.
              </p>
            </div>
          </div>
        </header>

        {error && <div className="dashboard-status dashboard-status-error">{error}</div>}

        <form className={composerFocused || postBody ? 'social-feed-composer social-feed-composer-open' : 'social-feed-composer'} onSubmit={submitPost}>
          <div className="social-feed-composer-box">
            <textarea
              value={postBody}
              onFocus={() => requireCommunityAction(() => setComposerFocused(true))}
              onChange={event => setPostBody(event.target.value)}
              placeholder={user ? "What's happening on 44?" : 'Sign in to post to Community.'}
              rows={composerFocused || postBody ? 3 : 1}
              disabled={!user || posting}
            />
            {(composerFocused || postBody) && (
              <div className="social-feed-composer-actions">
                <button
                  type="button"
                  className="os-button os-button-ghost os-button-compact"
                  onClick={() => {
                    setComposerFocused(false);
                    setPostBody('');
                  }}
                >
                  Cancel
                </button>
                <button className="os-button os-button-primary os-button-compact" type="submit" disabled={posting || !postBody.trim()}>
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            )}
          </div>
        </form>

        <section className="dashboard-list-surface social-feed social-feed-list social-feed-panel" aria-label="Community feed">
          {generalPosts.length === 0 ? (
            <div className="dashboard-empty">No posts yet.</div>
          ) : (
            generalPosts.map(post => {
              const repliesForPost = inlineReplies[post.id] ?? [];
              const replyTarget = repliesForPost.find(reply => reply.id === replyingToReplyId);
              const replyTargetHandle = replyTarget?.authors?.username ?? replyTarget?.authors?.display_name ?? '';
              return (
              <div key={post.id} className="social-feed-post">
                <SocialPostRow
                  post={post}
                  replyCount={replyCounts[post.id] ?? 0}
                  likeCount={likeCounts[post.id] ?? 0}
                  likers={likersMap[post.id] ?? []}
                  repliers={repliersMap[post.id] ?? []}
                  liked={likedIds.has(post.id)}
                  onLike={() => toggleLike(post)}
                  onReplyClick={() => requireCommunityAction(() => { void openPostReply(post); })}
                  repliesOpen={openRepliesPostId === post.id}
                  rowClickable={false}
                  onDelete={() => deletePost(post)}
                  canDelete={Boolean(user && post.author_id === user.id)}
                  disabled={likingId === post.id}
                />
                {openRepliesPostId === post.id && (
                  <div className="social-reply-drawer">
                    {!replyTarget && (
                      <form className="social-reply-drawer-form" onSubmit={event => submitInlineReply(event, post)}>
                        <textarea
                          value={replyBody}
                          onChange={event => setReplyBody(event.target.value)}
                          placeholder="Write a reply..."
                          rows={2}
                        />
                        <button className="os-button os-button-primary os-button-compact" type="submit" disabled={replying || !replyBody.trim()}>
                          {replying ? 'Replying...' : 'Reply'}
                        </button>
                      </form>
                    )}
                    {repliesForPost.length === 0 ? (
                      <p className="social-reply-empty">No replies yet.</p>
                    ) : (
                      <div className="social-reply-drawer-list">
                        {repliesForPost.map(reply => (
                          <div key={reply.id} className="social-reply-drawer-item">
                            <article className="social-row social-reply-drawer-row">
                              <SocialAvatar profile={reply.authors} />
                              <div className="social-row-main">
                                <SocialAuthorLine author={reply.authors} createdAt={reply.created_at} handleOnly />
                                <p className="social-row-body">{reply.body}</p>
                                <div className="social-actions">
                                  <button
                                    type="button"
                                    className="social-action"
                                    onClick={() => requireCommunityAction(() => {
                                      setReplyingToReplyId(reply.id);
                                      setReplyBody('');
                                    })}
                                    aria-label="Reply"
                                  >
                                    <SocialChatBubbleIcon />
                                  </button>
                                  <button
                                    type="button"
                                    className="social-action social-action-like"
                                    data-liked={inlineReplyLikedIds.has(reply.id) ? 'true' : 'false'}
                                    onClick={() => toggleInlineReplyLike(reply)}
                                    disabled={replyLikingId === reply.id}
                                    aria-label={inlineReplyLikedIds.has(reply.id) ? 'Unlike' : 'Like'}
                                  >
                                    <SocialHeartIcon filled={inlineReplyLikedIds.has(reply.id)} />
                                  </button>
                                  <SocialEngagementRow
                                    likers={inlineReplyLikersMap[reply.id] ?? []}
                                    likeCount={inlineReplyLikeCounts[reply.id] ?? 0}
                                  />
                                </div>
                              </div>
                            </article>
                            {replyingToReplyId === reply.id && (
                              <form className="social-reply-drawer-form social-reply-drawer-form-nested" onSubmit={event => submitInlineReply(event, post)}>
                                <textarea
                                  value={replyBody}
                                  onChange={event => setReplyBody(event.target.value)}
                                  placeholder={`Reply to @${replyTargetHandle}...`}
                                  rows={2}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  className="os-button os-button-ghost os-button-compact"
                                  onClick={() => setReplyingToReplyId(null)}
                                >
                                  Cancel
                                </button>
                                <button className="os-button os-button-primary os-button-compact" type="submit" disabled={replying || !replyBody.trim()}>
                                  {replying ? 'Replying...' : 'Reply'}
                                </button>
                              </form>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })
          )}
        </section>
      </main>
      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
    </PageShell>
  );
}
