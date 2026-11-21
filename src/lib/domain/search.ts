import type { Profile } from '@/lib/platform';
import type { Product } from '@/lib/products';
import type { SocialPost } from '@/lib/social';
import type { LikeRow, ReplyEngagerRow } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import { localMaskPreviewEnabled, localMaskProduct } from '@/lib/localMaskPreview';
import { loadCommunityFeed } from '@/lib/domain/community';
import { listLocalCommunityPosts, listLocalCommunityReplies } from '@/lib/communityV11';

export type SearchProfile = Pick<Profile, 'id' | 'slug' | 'username' | 'display_name' | 'avatar_url' | 'bio' | 'role' | 'creator_type'>;

async function fetchSearchDirectory() {
  const [itemResult, profileResult] = await Promise.all([
    supabase
      .from('catalog_items')
      .select('id,slug,title,creator,item_type,short_description,long_description,price_cents,is_free,featured,tags,cover_url,hero_url,experience_type,fulfillment_type,download_purchase_enabled,created_at,creators:profiles!author_id(id,slug,username,display_name,avatar_url,country_code,display_currency,home_country_code,home_currency)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('profiles')
      .select('id,slug,username,display_name,avatar_url,bio,role,creator_type')
      .eq('is_published', true)
      .is('deletion_requested_at', null)
      .order('display_name', { ascending: true })
      .limit(120),
  ]);
  const error = itemResult.error || profileResult.error;
  if (error) throw error;
  const products = (itemResult.data as Product[] | null) ?? [];
  return {
    products: localMaskPreviewEnabled && !products.some(item => item.id === localMaskProduct.id)
      ? [...products, localMaskProduct]
      : products,
    profiles: (profileResult.data as SearchProfile[] | null) ?? [],
  };
}

const DIRECTORY_TTL_MS = 30_000;
let directoryCache: {
  viewerId: string | null;
  expiresAt: number;
  request: ReturnType<typeof fetchSearchDirectory>;
} | null = null;

export function loadPlatformSearchDirectory(viewerId: string | null) {
  if (typeof window === 'undefined') return fetchSearchDirectory();
  if (directoryCache?.viewerId === viewerId && directoryCache.expiresAt > Date.now()) {
    return directoryCache.request;
  }

  const request = fetchSearchDirectory().then(directory => {
    if (directoryCache?.request === request) directoryCache.expiresAt = Date.now() + DIRECTORY_TTL_MS;
    return directory;
  }).catch(error => {
    if (directoryCache?.request === request) directoryCache = null;
    throw error;
  });
  directoryCache = { viewerId, expiresAt: Date.now() + DIRECTORY_TTL_MS, request };
  return request;
}

export async function loadPlatformSearchIndex(viewerId: string | null) {
  const [directory, communityIndex] = await Promise.all([
    loadPlatformSearchDirectory(viewerId),
    loadCommunityFeed(),
  ]);
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
  return {
    ...directory,
    posts,
    replies,
    likes,
  };
}
