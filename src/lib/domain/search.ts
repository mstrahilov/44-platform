import type { Profile } from '@/lib/platform';
import type { Product } from '@/lib/products';
import type { SocialPost } from '@/lib/social';
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
  return {
    products: (itemResult.data as Product[] | null) ?? [],
    posts: (postResult.data as SocialPost[] | null) ?? [],
    profiles: (profileResult.data as SearchProfile[] | null) ?? [],
  };
}
