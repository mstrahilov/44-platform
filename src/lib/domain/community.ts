import type { LikeRow, ReplyEngagerRow, SocialLiker, SocialPost, SocialReply } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import { requestPushDelivery } from '@/lib/webPush';

const DISCUSSION_SELECT = '*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type, country_code, home_country_code)';
const UUID_IDENTIFIER = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CommunityMentionProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type ReplyLikeRow = {
  reply_id: string;
  profile_id: string;
  profiles?: SocialLiker | null;
};

export async function getDiscussion(identifier: string) {
  const bySlug = await supabase
    .from('community_discussions')
    .select(DISCUSSION_SELECT)
    .eq('slug', identifier)
    .eq('status', 'published')
    .maybeSingle();
  if (bySlug.error) throw bySlug.error;
  if (bySlug.data) return bySlug.data as SocialPost;

  // A removed or stale slug is a normal not-found request. Do not send it to
  // Postgres as a UUID, which turns an ordinary missing thread into a 500.
  if (!UUID_IDENTIFIER.test(identifier)) return null;

  const byId = await supabase
    .from('community_discussions')
    .select(DISCUSSION_SELECT)
    .eq('id', identifier)
    .eq('status', 'published')
    .maybeSingle();
  if (byId.error) throw byId.error;
  return byId.data as SocialPost | null;
}

export async function loadCommunityFeed() {
  const postResult = await supabase
    .from('community_discussions')
    .select(DISCUSSION_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(80);
  if (postResult.error) throw postResult.error;
  const posts = (postResult.data as SocialPost[] | null) ?? [];
  const postIds = posts.map(post => post.id);
  if (postIds.length === 0) return { posts, replies: [] as ReplyEngagerRow[], likes: [] as LikeRow[] };

  const [replyResult, likeResult] = await Promise.all([
    supabase
      .from('community_discussion_replies')
      .select('post_id, author_id, authors:profiles!author_id(id, display_name, username, avatar_url)')
      .in('post_id', postIds)
      .eq('status', 'published')
      .order('created_at', { ascending: false }),
    supabase
      .from('community_discussion_likes')
      .select('post_id, profile_id, profiles:profiles!profile_id(id, display_name, username, avatar_url)')
      .in('post_id', postIds)
      .order('created_at', { ascending: false }),
  ]);
  const error = replyResult.error || likeResult.error;
  if (error) throw error;
  return {
    posts,
    replies: (replyResult.data as ReplyEngagerRow[] | null) ?? [],
    likes: (likeResult.data as LikeRow[] | null) ?? [],
  };
}

export async function listFollowedProfileIds(userId: string) {
  const result = await supabase.from('profile_follows').select('following_id').eq('follower_id', userId);
  if (result.error) throw result.error;
  return (result.data ?? []).map(row => row.following_id);
}

export async function searchCommunityMentions(query: string) {
  const result = await supabase
    .from('profiles')
    .select('id,username,display_name,avatar_url')
    .ilike('username', `${query}%`)
    .limit(6);
  if (result.error) throw result.error;
  return (result.data as CommunityMentionProfile[] | null) ?? [];
}

export async function createDiscussion(input: { title: string; body: string; slug: string }) {
  const created = await supabase.rpc('create_content_discussion', {
    discussion_title: input.title,
    discussion_body: input.body,
    discussion_slug: input.slug,
    target_item_id: undefined,
  });
  if (created.error) throw created.error;
  const result = await supabase
    .from('community_discussions')
    .select(DISCUSSION_SELECT)
    .eq('id', created.data)
    .single();
  if (result.error) throw result.error;
  void requestPushDelivery();
  return result.data as SocialPost;
}

export async function setDiscussionLike(postId: string, userId: string, liked: boolean) {
  const result = liked
    ? await supabase.from('community_discussion_likes').insert({ post_id: postId, profile_id: userId })
    : await supabase.from('community_discussion_likes').delete().eq('post_id', postId).eq('profile_id', userId);
  if (result.error) throw result.error;
}

export async function deleteDiscussion(postId: string, ownerId: string) {
  const result = await supabase.from('content_entries').delete().eq('id', postId).eq('author_id', ownerId);
  if (result.error) throw result.error;
}

export async function loadDiscussionThread(identifier: string) {
  const post = await getDiscussion(identifier);
  if (!post) return null;
  const [replyResult, likeResult] = await Promise.all([
    supabase
      .from('community_discussion_replies')
      .select('*, authors:profiles!author_id(id, slug, display_name, username, avatar_url)')
      .eq('post_id', post.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false }),
    supabase
      .from('community_discussion_likes')
      .select('post_id, profile_id, profiles:profiles!profile_id(id, display_name, username, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: false }),
  ]);
  const error = replyResult.error || likeResult.error;
  if (error) throw error;
  const replies = (replyResult.data as SocialReply[] | null) ?? [];
  const replyIds = replies.map(reply => reply.id);
  let replyLikes: ReplyLikeRow[] = [];
  if (replyIds.length > 0) {
    const result = await supabase
      .from('community_reply_likes')
      .select('reply_id, profile_id, profiles:profiles!profile_id(id, display_name, username, avatar_url)')
      .in('reply_id', replyIds)
      .order('created_at', { ascending: false });
    if (result.error) throw result.error;
    replyLikes = (result.data as ReplyLikeRow[] | null) ?? [];
  }
  return { post, replies, likes: (likeResult.data as LikeRow[] | null) ?? [], replyLikes };
}

export async function setReplyLike(replyId: string, userId: string, liked: boolean) {
  const result = liked
    ? await supabase.from('community_reply_likes').insert({ reply_id: replyId, profile_id: userId })
    : await supabase.from('community_reply_likes').delete().eq('reply_id', replyId).eq('profile_id', userId);
  if (result.error) throw result.error;
}

export async function createDiscussionReply(input: { postId: string; authorId: string; parentReplyId: string | null; body: string }) {
  const result = await supabase
    .from('community_discussion_replies')
    .insert({ post_id: input.postId, author_id: input.authorId, parent_reply_id: input.parentReplyId, body: input.body })
    .select('*, authors:profiles!author_id(id, slug, display_name, username, avatar_url)')
    .single();
  if (result.error) throw result.error;
  void requestPushDelivery();
  return result.data as SocialReply;
}

export async function deleteDiscussionReply(replyId: string, ownerId: string) {
  const result = await supabase.from('content_replies').delete().eq('id', replyId).eq('author_id', ownerId);
  if (result.error) throw result.error;
}
