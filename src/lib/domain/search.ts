import type { Profile } from '@/lib/platform';
import type { Product } from '@/lib/products';
import type { SocialPost } from '@/lib/social';
import type { LikeRow, ReplyEngagerRow } from '@/lib/social';
import { supabase } from '@/lib/supabase';

export type SearchProfile = Pick<Profile, 'id' | 'slug' | 'username' | 'display_name' | 'avatar_url' | 'bio' | 'role' | 'creator_type'>;

export async function loadPlatformSearchIndex() {
  const [itemResult, postResult, profileResult] = await Promise.all([
    supabase
      .from('catalog_items')
      .select('*, creators:profiles!author_id(*)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('community_discussions')
      .select('*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('profiles')
      .select('id,slug,username,display_name,avatar_url,bio,role,creator_type')
      .order('display_name', { ascending: true })
      .limit(120),
  ]);
  const error = itemResult.error || postResult.error || profileResult.error;
  if (error) throw error;
  const posts = (postResult.data as SocialPost[] | null) ?? [];
  const postIds = posts.map(post => post.id);
  let replies: ReplyEngagerRow[] = [];
  let likes: LikeRow[] = [];
  if (postIds.length > 0) {
    const [replyResult, likeResult] = await Promise.all([
      supabase
        .from('community_discussion_replies')
        .select('post_id, author_id, authors:profiles!author_id(id, display_name, username, avatar_url)')
        .in('post_id', postIds)
        .eq('status', 'published'),
      supabase
        .from('community_discussion_likes')
        .select('post_id, profile_id, profiles:profiles!profile_id(id, display_name, username, avatar_url)')
        .in('post_id', postIds),
    ]);
    const engagementError = replyResult.error || likeResult.error;
    if (engagementError) throw engagementError;
    replies = (replyResult.data as ReplyEngagerRow[] | null) ?? [];
    likes = (likeResult.data as LikeRow[] | null) ?? [];
  }
  return {
    products: (itemResult.data as Product[] | null) ?? [],
    posts,
    profiles: (profileResult.data as SearchProfile[] | null) ?? [],
    replies,
    likes,
  };
}
