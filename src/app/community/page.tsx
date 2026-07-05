'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  SocialRichText,
  SocialTrashIcon,
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
type MentionProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

const COMMUNITY_COPY: Record<'feed' | 'following' | 'questions' | 'collaboration' | 'topic', { title: string; copy: string; empty: string }> = {
  feed: {
    title: 'Community',
    copy: 'General posts from the 44 community.',
    empty: 'No posts yet.',
  },
  following: {
    title: 'Following',
    copy: 'Posts from people you follow on 44.',
    empty: 'No posts from people you follow yet.',
  },
  questions: {
    title: 'Questions',
    copy: 'Posts using #question. Add #question to a post when you want help from the community.',
    empty: 'No #question posts yet.',
  },
  collaboration: {
    title: 'Collaboration',
    copy: 'Posts using #collaboration. Add #collaboration when you are looking for people to build with.',
    empty: 'No #collaboration posts yet.',
  },
  topic: {
    title: 'Topic',
    copy: 'Posts using this hashtag.',
    empty: 'No posts use this hashtag yet.',
  },
};

function buildPostTitle(body: string) {
  return body.trim().replace(/\s+/g, ' ').slice(0, 72) || 'New post';
}

function buildSlug(body: string) {
  const base = normalizeTaxonomyValue(buildPostTitle(body)) || 'thread';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function extractHashtags(value?: string | null) {
  const matches = value?.match(/#[a-zA-Z0-9_]+/g) ?? [];
  return Array.from(new Set(matches.map(match => normalizeTaxonomyValue(match.slice(1))).filter(Boolean)));
}

function titleFromTopic(slug: string) {
  if (slug === 'question') return 'Questions';
  if (slug === 'collaboration') return 'Collaboration';
  return `#${slug}`;
}

function lockedTopicSuffix(topic: string | null) {
  return topic ? ` #${topic}` : '';
}

function composeLockedBody(value: string, topic: string | null) {
  if (!topic) return value;
  const trimmed = value.trimEnd();
  return `${trimmed}${trimmed ? ' ' : ''}#${topic}`;
}

function parseLockedBody(value: string, topic: string | null) {
  if (!topic) return value;
  const suffixPattern = new RegExp(`\\s*#${topic}\\s*$`, 'i');
  return value.replace(suffixPattern, '').trimEnd();
}

function extractMentionQuery(value: string, topic: string | null) {
  const suffix = lockedTopicSuffix(topic).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = topic
    ? new RegExp(`(?:^|\\s)@([a-zA-Z0-9_]{1,})(?=(?:${suffix})?$)`, 'i')
    : /(?:^|\s)@([a-zA-Z0-9_]{1,})$/i;
  const match = value.match(pattern);
  return match?.[1]?.toLowerCase() ?? '';
}

function replaceTrailingMention(value: string, username: string, topic: string | null) {
  const suffix = topic ? lockedTopicSuffix(topic) : '';
  const base = topic && value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
  const nextBase = base.replace(/(^|\s)@[a-zA-Z0-9_]*$/i, (_match, prefix: string) => `${prefix}@${username} `);
  return topic ? composeLockedBody(parseLockedBody(nextBase, topic), topic) : nextBase;
}

function CommunityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [replyCounts, setReplyCounts] = useState<CountMap>({});
  const [repliersMap, setRepliersMap] = useState<LikersMap>({});
  const [likes, setLikes] = useState<PostLike[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [likingId, setLikingId] = useState('');
  const [postComposerOpen, setPostComposerOpen] = useState(false);
  const [postBody, setPostBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [openRepliesPostId, setOpenRepliesPostId] = useState<string | null>(null);
  const [replyComposerPostId, setReplyComposerPostId] = useState<string | null>(null);
  const [inlineReplies, setInlineReplies] = useState<Record<string, InlineReply[]>>({});
  const [inlineReplyLikes, setInlineReplyLikes] = useState<Record<string, ReplyLikeRow[]>>({});
  const [replyBody, setReplyBody] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyingToReplyId, setReplyingToReplyId] = useState<string | null>(null);
  const [replyLikingId, setReplyLikingId] = useState('');
  const [mentionOptions, setMentionOptions] = useState<MentionProfile[]>([]);
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);

  const requestedView = searchParams.get('view');
  const requestedTopic = normalizeTaxonomyValue(searchParams.get('topic') ?? '');
  const activeCommunityTab = requestedView === 'following'
    ? 'following'
    : requestedTopic === 'question'
      ? 'questions'
      : requestedTopic === 'collaboration'
        ? 'collaboration'
        : 'feed';
  const forcedTopic = requestedTopic === 'question' || requestedTopic === 'collaboration' ? requestedTopic : null;
  const postComposerValue = composeLockedBody(postBody, forcedTopic);
  const activeReplyComposer = replyComposerPostId !== null || replyingToReplyId !== null;
  const activeMentionQuery = activeReplyComposer
    ? extractMentionQuery(replyBody, null)
    : postComposerOpen
      ? extractMentionQuery(postComposerValue, forcedTopic)
      : '';

  useCommunityTopbarTabs(activeCommunityTab);

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
      setFollowingIds(new Set());
      return;
    }
    loadStudioProfile(user.id).then(result => setProfile(result.profile));
    supabase
      .from('profile_follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .then(result => {
        if (result.error) {
          setError(result.error.message);
          setFollowingIds(new Set());
          return;
        }
        setFollowingIds(new Set(((result.data ?? []) as Array<{ following_id: string }>).map(row => row.following_id)));
      });
  }, [user]);

  useEffect(() => {
    if (!activeMentionQuery) {
      setMentionOptions([]);
      return;
    }
    let alive = true;
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `${activeMentionQuery}%`)
      .limit(6)
      .then(result => {
        if (!alive) return;
        if (result.error) {
          setMentionOptions([]);
          return;
        }
        setMentionOptions((result.data as MentionProfile[] | null) ?? []);
      });
    return () => { alive = false; };
  }, [activeMentionQuery]);

  const likeCounts = useMemo(() => countById(likes, 'post_id'), [likes]);
  const likersMap: LikersMap = useMemo(() => likersByPost(likes), [likes]);
  const likedIds = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(likes.filter(like => like.profile_id === user.id).map(like => like.post_id));
  }, [likes, user]);
  const canInteract = hasCommunityIdentity(profile);
  const generalPosts = useMemo(() => posts.filter(post => isGeneralPost(post)), [posts]);
  const visiblePosts = useMemo(() => {
    let next = generalPosts;
    if (requestedView === 'following') {
      next = next.filter(post => typeof post.author_id === 'string' && followingIds.has(post.author_id));
    }
    if (requestedTopic) {
      next = next.filter(post => extractHashtags(post.body).includes(requestedTopic));
    }
    return next;
  }, [followingIds, generalPosts, requestedTopic, requestedView]);
  const pageCopy = requestedView === 'following'
    ? COMMUNITY_COPY.following
    : requestedTopic === 'question'
      ? COMMUNITY_COPY.questions
      : requestedTopic === 'collaboration'
        ? COMMUNITY_COPY.collaboration
        : requestedTopic
          ? { ...COMMUNITY_COPY.topic, title: titleFromTopic(requestedTopic), copy: `Posts using #${requestedTopic}.` }
          : COMMUNITY_COPY.feed;
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
    const finalBody = forcedTopic ? composeLockedBody(body, forcedTopic).trim() : body;
    const { data, error: insertError } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        category_id: null,
        slug: buildSlug(finalBody),
        title: buildPostTitle(finalBody),
        body: finalBody,
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
    setPostComposerOpen(false);
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

  async function openReplies(post: SocialPost) {
    setReplyBody('');
    setReplyComposerPostId(null);
    setReplyingToReplyId(null);
    setMentionOptions([]);
    if (openRepliesPostId !== post.id) {
      setOpenRepliesPostId(post.id);
      await loadReplies(post.id);
    } else if (!replyComposerPostId && !replyingToReplyId) {
      setOpenRepliesPostId(null);
    }
  }

  async function openPostReply(post: SocialPost) {
    setReplyBody('');
    setReplyComposerPostId(post.id);
    setReplyingToReplyId(null);
    setMentionOptions([]);
    if (openRepliesPostId !== post.id) {
      setOpenRepliesPostId(post.id);
      await loadReplies(post.id);
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
    setReplyComposerPostId(null);
    setReplyingToReplyId(null);
    setMentionOptions([]);
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

  async function deleteInlineReply(reply: InlineReply, post: SocialPost) {
    if (!user || reply.author_id !== user.id) return;
    if (!window.confirm('Delete this reply? This cannot be undone.')) return;

    const repliesForPost = inlineReplies[post.id] ?? [];
    const idsToRemove = new Set([
      reply.id,
      ...repliesForPost.filter(item => item.parent_reply_id === reply.id).map(item => item.id),
    ]);

    const { error: deleteError } = await supabase
      .from('post_replies')
      .delete()
      .eq('id', reply.id)
      .eq('author_id', user.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setInlineReplies(current => ({
      ...current,
      [post.id]: (current[post.id] ?? []).filter(item => !idsToRemove.has(item.id)),
    }));
    setInlineReplyLikes(current => ({
      ...current,
      [post.id]: (current[post.id] ?? []).filter(like => !idsToRemove.has(like.reply_id)),
    }));
    setReplyCounts(current => ({
      ...current,
      [post.id]: Math.max(0, (current[post.id] ?? 0) - idsToRemove.size),
    }));
    if (replyingToReplyId && idsToRemove.has(replyingToReplyId)) {
      setReplyingToReplyId(null);
      setReplyBody('');
      setMentionOptions([]);
    }
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

  function applyMention(username: string) {
    if (activeReplyComposer) {
      setReplyBody(current => replaceTrailingMention(current, username, null));
    } else {
      setPostBody(current => parseLockedBody(replaceTrailingMention(composeLockedBody(current, forcedTopic), username, forcedTopic), forcedTopic));
    }
    setMentionOptions([]);
  }

  return (
    <PageShell>
      <main className="social-shell">
        <header className="social-header">
          <div className="social-title-row">
            <div>
              <h1 className="os-type-display">{pageCopy.title}</h1>
              <p className="social-title-copy os-type-body">
                {pageCopy.copy}
              </p>
            </div>
            <button
              type="button"
              className="os-button os-button-primary os-button-compact"
              onClick={() => requireCommunityAction(() => {
                setPostComposerOpen(true);
                setPostBody('');
                setMentionOptions([]);
              })}
            >
              New Post
            </button>
          </div>
        </header>

        {error && <div className="dashboard-status dashboard-status-error">{error}</div>}

        {postComposerOpen && (
          <form className="social-feed-composer social-feed-composer-open" onSubmit={submitPost}>
            <div className="social-feed-composer-box">
              <textarea
                value={postComposerValue}
                onChange={event => setPostBody(parseLockedBody(event.target.value, forcedTopic))}
                placeholder={user ? "What's happening on 44?" : 'Sign in to post to Community.'}
                rows={3}
                disabled={!user || posting}
              />
              {forcedTopic && <div className="social-composer-lock">This post will publish with #{forcedTopic}.</div>}
              {mentionOptions.length > 0 && (
                <div className="social-mention-list">
                  {mentionOptions.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className="social-mention-option"
                      onClick={() => applyMention(option.username || option.display_name || '')}
                    >
                      <SocialAvatar profile={option} />
                      <span className="social-mention-copy">
                        <span className="social-mention-name">{option.display_name || option.username || '44 Member'}</span>
                        {option.username && <span className="social-mention-handle">@{option.username}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="social-feed-composer-actions">
                <button
                  type="button"
                  className="os-button os-button-ghost os-button-compact"
                  onClick={() => {
                    setPostComposerOpen(false);
                    setPostBody('');
                    setMentionOptions([]);
                  }}
                >
                  Cancel
                </button>
                <button className="os-button os-button-primary os-button-compact" type="submit" disabled={posting || !postBody.trim()}>
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </form>
        )}

        <section className="dashboard-list-surface social-feed social-feed-list social-feed-panel" aria-label="Community feed">
          {visiblePosts.length === 0 ? (
            <div className="dashboard-empty">{pageCopy.empty}</div>
          ) : (
            visiblePosts.map(post => {
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
                  onOpenClick={() => { void openReplies(post); }}
                  repliesOpen={openRepliesPostId === post.id}
                  onDelete={() => deletePost(post)}
                  canDelete={Boolean(user && post.author_id === user.id)}
                  disabled={likingId === post.id}
                />
                {openRepliesPostId === post.id && (
                  <div className="social-reply-drawer">
                    {replyComposerPostId === post.id && !replyTarget && (
                      <form className="social-reply-drawer-form" onSubmit={event => submitInlineReply(event, post)}>
                        <textarea
                          value={replyBody}
                          onChange={event => setReplyBody(event.target.value)}
                          placeholder="Write a reply..."
                          rows={2}
                        />
                        {mentionOptions.length > 0 && (
                          <div className="social-mention-list">
                            {mentionOptions.map(option => (
                              <button
                                key={option.id}
                                type="button"
                                className="social-mention-option"
                                onClick={() => applyMention(option.username || option.display_name || '')}
                              >
                                <SocialAvatar profile={option} />
                                <span className="social-mention-copy">
                                  <span className="social-mention-name">{option.display_name || option.username || '44 Member'}</span>
                                  {option.username && <span className="social-mention-handle">@{option.username}</span>}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="social-reply-drawer-actions">
                          <button
                            type="button"
                            className="os-button os-button-ghost os-button-compact"
                            onClick={() => {
                              setReplyComposerPostId(null);
                              setReplyBody('');
                              setMentionOptions([]);
                            }}
                          >
                            Cancel
                          </button>
                        <button className="os-button os-button-primary os-button-compact" type="submit" disabled={replying || !replyBody.trim()}>
                          {replying ? 'Replying...' : 'Reply'}
                        </button>
                        </div>
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
                                <p className="social-row-body"><SocialRichText text={reply.body} /></p>
                                <div className="social-actions">
                                  <button
                                    type="button"
                                    className="social-action"
                                    onClick={() => requireCommunityAction(() => {
                                      setReplyComposerPostId(null);
                                      setReplyingToReplyId(reply.id);
                                      setReplyBody('');
                                      setMentionOptions([]);
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
                                  {user && reply.author_id === user.id && (
                                    <button
                                      type="button"
                                      className="social-action social-action-danger"
                                      onClick={() => { void deleteInlineReply(reply, post); }}
                                      aria-label="Delete reply"
                                    >
                                      <SocialTrashIcon />
                                    </button>
                                  )}
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
                                {mentionOptions.length > 0 && (
                                  <div className="social-mention-list">
                                    {mentionOptions.map(option => (
                                      <button
                                        key={option.id}
                                        type="button"
                                        className="social-mention-option"
                                        onClick={() => applyMention(option.username || option.display_name || '')}
                                      >
                                        <SocialAvatar profile={option} />
                                        <span className="social-mention-copy">
                                          <span className="social-mention-name">{option.display_name || option.username || '44 Member'}</span>
                                          {option.username && <span className="social-mention-handle">@{option.username}</span>}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <div className="social-reply-drawer-actions">
                                  <button
                                    type="button"
                                    className="os-button os-button-ghost os-button-compact"
                                    onClick={() => {
                                      setReplyingToReplyId(null);
                                      setReplyBody('');
                                      setMentionOptions([]);
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button className="os-button os-button-primary os-button-compact" type="submit" disabled={replying || !replyBody.trim()}>
                                    {replying ? 'Replying...' : 'Reply'}
                                  </button>
                                </div>
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

export default function CommunityPage() {
  return (
    <Suspense
      fallback={(
        <PageShell>
          <main className="social-shell">
            <div className="dashboard-empty">Loading community...</div>
          </main>
        </PageShell>
      )}
    >
      <CommunityPageContent />
    </Suspense>
  );
}
