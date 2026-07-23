import type { Profile } from '@/lib/platform';
import type { Product } from '@/lib/products';
import type { SocialPost } from '@/lib/social';
import type { LikeRow, ReplyEngagerRow } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import { localMaskPreviewEnabled, localMaskProduct } from '@/lib/localMaskPreview';
import { loadCommunityFeed } from '@/lib/domain/community';
import { listLocalCommunityPosts, listLocalCommunityReplies } from '@/lib/communityV11';

export type SearchProfile = Pick<Profile, 'id' | 'slug' | 'username' | 'display_name' | 'avatar_url' | 'bio' | 'role' | 'creator_type'>;

export async function loadPlatformSearchIndex() {
  const [itemResult, communityIndex, profileResult] = await Promise.all([
    supabase
      .from('catalog_items')
      .select('*, creators:profiles!author_id(*)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(120),
    loadCommunityFeed(),
    supabase
      .from('profiles')
      .select('id,slug,username,display_name,avatar_url,bio,role,creator_type')
      .order('display_name', { ascending: true })
      .limit(120),
  ]);
  const error = itemResult.error || profileResult.error;
  if (error) throw error;
  const localPosts = listLocalCommunityPosts();
  const localReplies = listLocalCommunityReplies()
    .filter(reply => !reply.parent_reply_id)
    .flatMap<ReplyEngagerRow>(reply => reply.author_id ? [{
      post_id: reply.post_id,
      author_id: reply.author_id,
      authors: reply.authors ?? null,
    }] : []);
  const posts: SocialPost[] = [...localPosts, ...communityIndex.posts];
  const replies: ReplyEngagerRow[] = [...localReplies, ...communityIndex.replies];
  const likes: LikeRow[] = communityIndex.likes;
  const products = (itemResult.data as Product[] | null) ?? [];
  const searchableProducts = localMaskPreviewEnabled && !products.some(item => item.id === localMaskProduct.id)
    ? [...products, localMaskProduct]
    : products;

  return {
    products: searchableProducts,
    posts,
    profiles: (profileResult.data as SearchProfile[] | null) ?? [],
    replies,
    likes,
  };
}
