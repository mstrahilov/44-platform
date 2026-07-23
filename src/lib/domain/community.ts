import type { LikeRow, ReplyEngagerRow, SocialLiker, SocialPost } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import { requestPushDelivery } from '@/lib/webPush';
import {
  inferItemReferences,
  getLocalCommunityPost,
  listLocalCommunityPosts,
  listLocalCommunityReplies,
  type CommunityReference,
  type CommunityIntent,
  type CommunityV11Post,
  type CommunityV11Reply,
} from '@/lib/communityV11';
import { localMaskPreviewEnabled, localMaskProduct } from '@/lib/localMaskPreview';
import type { Item } from '@/lib/products';

const DISCUSSION_SELECT = '*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type, country_code, home_country_code)';
const CONTENT_ENTRY_SELECT = '*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type, country_code, home_country_code)';
const UUID_IDENTIFIER = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CommunityMentionProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type CommunityReferenceOption = CommunityReference & {
  displayLabel: string;
  insertText: string;
};

export type ReplyLikeRow = {
  reply_id: string;
  profile_id: string;
  profiles?: SocialLiker | null;
};

type ContentEntryRow = {
  id: string;
  author_id: string | null;
  item_id: string | null;
  title: string | null;
  body: string | null;
  slug: string | null;
  content_type: 'discussion' | 'question' | 'collaboration' | 'creator_update';
  publication_status: string;
  moderation_status: string;
  created_at: string;
  updated_at?: string | null;
  creators?: CommunityV11Post['creators'];
};

type ContentReplyRow = {
  id: string;
  entry_id: string;
  author_id: string | null;
  parent_reply_id: string | null;
  body: string;
  publication_status: string;
  moderation_status: string;
  created_at: string;
  updated_at?: string | null;
  authors?: CommunityV11Reply['authors'];
};

function normalizeContentEntry(row: ContentEntryRow): CommunityV11Post {
  return {
    id: row.id,
    author_id: row.author_id,
    item_id: row.item_id,
    title: row.title || row.body?.trim().replace(/\s+/g, ' ').slice(0, 72) || 'Post',
    body: row.body,
    slug: row.slug,
    status: row.moderation_status === 'visible' ? row.publication_status : row.moderation_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    creators: row.creators ?? null,
    content_type: row.content_type,
  };
}

function normalizeContentReply(row: ContentReplyRow): CommunityV11Reply {
  return {
    id: row.id,
    post_id: row.entry_id,
    author_id: row.author_id,
    parent_reply_id: row.parent_reply_id,
    body: row.body,
    status: row.moderation_status === 'visible' ? row.publication_status : row.moderation_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    authors: row.authors ?? null,
  };
}

export async function getDiscussion(identifier: string) {
  const localPost = getLocalCommunityPost(identifier);
  if (localPost) return localPost;

  const bySlug = await supabase
    .from('content_entries')
    .select(CONTENT_ENTRY_SELECT)
    .eq('slug', identifier)
    .in('content_type', ['discussion', 'question', 'collaboration', 'creator_update'])
    .eq('publication_status', 'published')
    .eq('moderation_status', 'visible')
    .maybeSingle();
  if (bySlug.error) throw bySlug.error;
  if (bySlug.data) return normalizeContentEntry(bySlug.data as unknown as ContentEntryRow);

  // A removed or stale slug is a normal not-found request. Do not send it to
  // Postgres as a UUID, which turns an ordinary missing thread into a 500.
  if (!UUID_IDENTIFIER.test(identifier)) return null;

  const byId = await supabase
    .from('content_entries')
    .select(CONTENT_ENTRY_SELECT)
    .eq('id', identifier)
    .in('content_type', ['discussion', 'question', 'collaboration', 'creator_update'])
    .eq('publication_status', 'published')
    .eq('moderation_status', 'visible')
    .maybeSingle();
  if (byId.error) throw byId.error;
  return byId.data ? normalizeContentEntry(byId.data as unknown as ContentEntryRow) : null;
}

export async function loadCommunityFeed() {
  const postResult = await supabase
    .from('content_entries')
    .select(CONTENT_ENTRY_SELECT)
    .in('content_type', ['discussion', 'question', 'collaboration', 'creator_update'])
    .eq('publication_status', 'published')
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(80);
  if (postResult.error) throw postResult.error;
  const posts = ((postResult.data ?? []) as unknown as ContentEntryRow[]).map(normalizeContentEntry);
  const postIds = posts.map(post => post.id);
  if (postIds.length === 0) return { posts, replies: [] as ReplyEngagerRow[], likes: [] as LikeRow[] };

  const [replyResult, likeResult] = await Promise.all([
    supabase
      .from('content_replies')
      .select('entry_id, author_id, authors:profiles!author_id(id, display_name, username, avatar_url)')
      .in('entry_id', postIds)
      .is('parent_reply_id', null)
      .eq('publication_status', 'published')
      .eq('moderation_status', 'visible')
      .order('created_at', { ascending: false }),
    supabase
      .from('content_entry_reactions')
      .select('entry_id, profile_id, profiles:profiles!profile_id(id, display_name, username, avatar_url)')
      .in('entry_id', postIds)
      .eq('reaction_type', 'like')
      .order('created_at', { ascending: false }),
  ]);
  const error = replyResult.error || likeResult.error;
  if (error) throw error;
  return {
    posts,
    replies: ((replyResult.data ?? []) as unknown as Array<Omit<ReplyEngagerRow, 'post_id'> & { entry_id: string }>)
      .map(row => ({ post_id: row.entry_id, author_id: row.author_id, authors: row.authors })),
    likes: ((likeResult.data ?? []) as unknown as Array<Omit<LikeRow, 'post_id'> & { entry_id: string }>)
      .map(row => ({ post_id: row.entry_id, profile_id: row.profile_id, profiles: row.profiles })),
  };
}

export type ItemCommunityFeed = {
  posts: CommunityV11Post[];
  replyCounts: Record<string, number>;
  likeCounts: Record<string, number>;
};

export async function loadCommunityPostsForItem(item: Item): Promise<ItemCommunityFeed> {
  const feed = await loadCommunityFeed();
  const postsById = new Map<string, CommunityV11Post>();
  [...listLocalCommunityPosts(), ...feed.posts].forEach(post => postsById.set(post.id, post));

  const itemHref = `/store/item/${item.slug || item.id}`;
  const posts = Array.from(postsById.values())
    .filter(post => {
      if (post.item_id === item.id) return true;
      if (post.community_references?.some(reference => (
        reference.kind === 'item'
        && (reference.id === item.id || reference.href === itemHref)
      ))) return true;

      return inferItemReferences(post.body ?? '', [item], {
        authorHandle: post.creators?.username || post.creators?.slug,
      }).length > 0;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const postIds = new Set(posts.map(post => post.id));
  const replyCounts: Record<string, number> = {};
  [...feed.replies, ...listLocalCommunityReplies()].forEach(reply => {
    if (!postIds.has(reply.post_id)) return;
    replyCounts[reply.post_id] = (replyCounts[reply.post_id] ?? 0) + 1;
  });

  const likeCounts: Record<string, number> = {};
  feed.likes.forEach(like => {
    if (!postIds.has(like.post_id)) return;
    likeCounts[like.post_id] = (likeCounts[like.post_id] ?? 0) + 1;
  });

  return { posts, replyCounts, likeCounts };
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

export async function searchCommunityReferences(query: string) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [] as CommunityReferenceOption[];

  const [usernameResult, displayNameResult, itemResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,username,display_name,avatar_url,role')
      .ilike('username', `${normalizedQuery}%`)
      .limit(4),
    supabase
      .from('profiles')
      .select('id,username,display_name,avatar_url,role')
      .ilike('display_name', `%${normalizedQuery}%`)
      .limit(4),
    supabase
      .from('catalog_items')
      .select('id,slug,title,item_type,cover_url,hero_url,creator,creators:profiles!author_id(display_name,username)')
      .eq('status', 'published')
      .ilike('title', `%${normalizedQuery}%`)
      .limit(6),
  ]);
  const error = usernameResult.error || displayNameResult.error || itemResult.error;
  if (error) throw error;

  const peopleById = new Map<string, {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    role: string | null;
  }>();
  [...(usernameResult.data ?? []), ...(displayNameResult.data ?? [])].forEach(person => peopleById.set(person.id, person));

  const people = Array.from(peopleById.values()).slice(0, 6).flatMap<CommunityReferenceOption>(person => {
    const handle = person.username?.trim();
    if (!handle) return [];
    return [{
      id: person.id,
      kind: 'person',
      label: handle,
      displayLabel: person.display_name || handle,
      insertText: `@${handle}`,
      href: `/profile/${handle}`,
      imageUrl: person.avatar_url,
      secondary: person.role === 'creator' ? 'Creator' : 'Member',
    }];
  });

  const itemRows = [...(itemResult.data ?? [])] as Array<{
    id: string;
    slug: string | null;
    title: string;
    item_type: string;
    cover_url: string | null;
    hero_url: string | null;
    creator: string;
    creators?: { display_name: string | null; username: string | null } | null;
  }>;
  if (
    localMaskPreviewEnabled
    && localMaskProduct.title.toLocaleLowerCase().includes(normalizedQuery.toLocaleLowerCase())
    && !itemRows.some(item => item.id === localMaskProduct.id)
  ) {
    itemRows.unshift({
      id: localMaskProduct.id,
      slug: localMaskProduct.slug ?? null,
      title: localMaskProduct.title,
      item_type: localMaskProduct.item_type,
      cover_url: localMaskProduct.cover_url,
      hero_url: localMaskProduct.hero_url ?? null,
      creator: localMaskProduct.creator,
      creators: localMaskProduct.creators ? {
        display_name: localMaskProduct.creators.display_name,
        username: localMaskProduct.creators.username,
      } : null,
    });
  }
  const items = itemRows.slice(0, 6).map<CommunityReferenceOption>(item => ({
    id: item.id,
    kind: 'item',
    label: item.title,
    displayLabel: item.title,
    insertText: `@${item.title}`,
    href: `/store/item/${item.slug || item.id}`,
    imageUrl: item.cover_url || item.hero_url,
    secondary: [item.item_type, item.creators?.display_name || item.creator].filter(Boolean).join(' · '),
  }));

  return [...people, ...items];
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

export async function createCommunityPost(input: {
  body: string;
  intent: CommunityIntent;
  references: CommunityReference[];
}) {
  const body = input.body.trim();
  const title = body.replace(/\s+/g, ' ').slice(0, 72) || 'New post';
  const itemReference = input.references.find(reference => reference.kind === 'item');
  let entryId: string;

  if (input.intent === 'question') {
    const created = await supabase.rpc('create_content_question', {
      question_title: title,
      question_body: body,
      question_tags: [],
      target_item_id: itemReference?.id,
    });
    if (created.error) throw created.error;
    entryId = created.data;
  } else if (input.intent === 'collaboration') {
    const created = await supabase.rpc('create_content_collaboration', {
      collaboration_title: title,
      collaboration_body: body,
      needed_role: undefined,
      collaboration_project_type: undefined,
      target_item_id: itemReference?.id,
    });
    if (created.error) throw created.error;
    entryId = created.data;
  } else if (input.intent === 'update') {
    if (!itemReference) throw new Error('Tag the Item this update is about with @ before posting.');
    const created = await supabase.rpc('create_content_update', {
      target_item_id: itemReference.id,
      update_title: title,
      update_body: body,
      update_version_label: undefined,
    });
    if (created.error) throw created.error;
    entryId = created.data;
  } else {
    const slugPrefix = input.intent === 'help' ? 'assistance' : input.intent === 'showcase' ? 'showcase' : 'thread';
    const created = await supabase.rpc('create_content_discussion', {
      discussion_title: title,
      discussion_body: body,
      discussion_slug: `${slugPrefix}-${crypto.randomUUID().slice(0, 8)}`,
      target_item_id: itemReference?.id,
    });
    if (created.error) throw created.error;
    entryId = created.data;
  }

  const result = await supabase
    .from('content_entries')
    .select(CONTENT_ENTRY_SELECT)
    .eq('id', entryId)
    .single();
  if (result.error) throw result.error;
  void requestPushDelivery();
  return normalizeContentEntry(result.data as unknown as ContentEntryRow);
}

export async function setDiscussionLike(postId: string, userId: string, liked: boolean) {
  const result = liked
    ? await supabase.from('content_entry_reactions').insert({ entry_id: postId, profile_id: userId, reaction_type: 'like' })
    : await supabase.from('content_entry_reactions').delete().eq('entry_id', postId).eq('profile_id', userId).eq('reaction_type', 'like');
  if (result.error) throw result.error;
}

export async function deleteDiscussion(postId: string, ownerId: string) {
  const result = await supabase.from('content_entries').delete().eq('id', postId).eq('author_id', ownerId);
  if (result.error) throw result.error;
}

export async function updateDiscussion(postId: string, ownerId: string, body: string) {
  const updatedAt = new Date().toISOString();
  const result = await supabase
    .from('content_entries')
    .update({
      body: body.trim(),
      title: body.trim().replace(/\s+/g, ' ').slice(0, 72) || 'Post',
      updated_at: updatedAt,
    })
    .eq('id', postId)
    .eq('author_id', ownerId)
    .select(CONTENT_ENTRY_SELECT)
    .single();
  if (result.error) throw result.error;
  return normalizeContentEntry(result.data as unknown as ContentEntryRow);
}

export async function loadDiscussionThread(identifier: string) {
  const post = await getDiscussion(identifier);
  if (!post) return null;
  if ('local_only' in post && post.local_only) {
    return {
      post,
      replies: listLocalCommunityReplies(post.id),
      likes: [] as LikeRow[],
      replyLikes: [] as ReplyLikeRow[],
    };
  }
  const [replyResult, likeResult] = await Promise.all([
    supabase
      .from('content_replies')
      .select('*, authors:profiles!author_id(id, slug, display_name, username, avatar_url)')
      .eq('entry_id', post.id)
      .eq('publication_status', 'published')
      .eq('moderation_status', 'visible')
      .order('created_at', { ascending: true }),
    supabase
      .from('content_entry_reactions')
      .select('entry_id, profile_id, profiles:profiles!profile_id(id, display_name, username, avatar_url)')
      .eq('entry_id', post.id)
      .eq('reaction_type', 'like')
      .order('created_at', { ascending: false }),
  ]);
  const error = replyResult.error || likeResult.error;
  if (error) throw error;
  const replies = ((replyResult.data ?? []) as unknown as ContentReplyRow[]).map(normalizeContentReply);
  const replyIds = replies.map(reply => reply.id);
  let replyLikes: ReplyLikeRow[] = [];
  if (replyIds.length > 0) {
    const result = await supabase
      .from('content_reply_reactions')
      .select('reply_id, profile_id, profiles:profiles!profile_id(id, display_name, username, avatar_url)')
      .in('reply_id', replyIds)
      .eq('reaction_type', 'like')
      .order('created_at', { ascending: false });
    if (result.error) throw result.error;
    replyLikes = (result.data as ReplyLikeRow[] | null) ?? [];
  }
  const likes = ((likeResult.data ?? []) as unknown as Array<Omit<LikeRow, 'post_id'> & { entry_id: string }>)
    .map(row => ({ post_id: row.entry_id, profile_id: row.profile_id, profiles: row.profiles }));
  return { post, replies, likes, replyLikes };
}

export async function setReplyLike(replyId: string, userId: string, liked: boolean) {
  const result = liked
    ? await supabase.from('content_reply_reactions').insert({ reply_id: replyId, profile_id: userId, reaction_type: 'like' })
    : await supabase.from('content_reply_reactions').delete().eq('reply_id', replyId).eq('profile_id', userId).eq('reaction_type', 'like');
  if (result.error) throw result.error;
}

export async function createDiscussionReply(input: { postId: string; authorId: string; parentReplyId: string | null; body: string }) {
  const result = await supabase
    .from('content_replies')
    .insert({ entry_id: input.postId, author_id: input.authorId, parent_reply_id: input.parentReplyId, body: input.body, reply_type: 'comment' })
    .select('*, authors:profiles!author_id(id, slug, display_name, username, avatar_url)')
    .single();
  if (result.error) throw result.error;
  void requestPushDelivery();
  return normalizeContentReply(result.data as unknown as ContentReplyRow);
}

export async function deleteDiscussionReply(replyId: string, ownerId: string) {
  const result = await supabase.from('content_replies').delete().eq('id', replyId).eq('author_id', ownerId);
  if (result.error) throw result.error;
}

export async function updateDiscussionReply(replyId: string, ownerId: string, body: string) {
  const result = await supabase
    .from('content_replies')
    .update({ body: body.trim(), updated_at: new Date().toISOString() })
    .eq('id', replyId)
    .eq('author_id', ownerId)
    .select('*, authors:profiles!author_id(id, slug, display_name, username, avatar_url)')
    .single();
  if (result.error) throw result.error;
  return normalizeContentReply(result.data as unknown as ContentReplyRow);
}
