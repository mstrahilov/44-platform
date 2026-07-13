import type { Profile } from '@/lib/platform';
import type { Product } from '@/lib/products';
import type { LikeRow, ReplyEngagerRow, SocialPost } from '@/lib/social';
import { isMissingRelationError } from '@/lib/schemaCompat';
import { getOwnershipKeys } from '@/lib/studioProfiles';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export async function getPublicProfile(identifier: string) {
  const result = await supabase
    .from('profiles')
    .select('*')
    .or(`username.eq.${identifier},slug.eq.${identifier}`)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data as Profile | null;
}

export async function getOwnProfile(userId: string) {
  const result = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (result.error) throw result.error;
  return result.data as Profile | null;
}

export async function updateOwnProfile(userId: string, payload: Database['public']['Tables']['profiles']['Update']) {
  const result = await supabase.from('profiles').update(payload).eq('id', userId);
  if (result.error) throw result.error;
}

export async function getProfileMarketPreferences(userId: string) {
  const result = await supabase.from('profiles').select('country_code,display_currency').eq('id', userId).maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

export async function saveProfileMarketPreferences(userId: string, countryCode: string, displayCurrency: string) {
  const result = await supabase.from('profiles').update({ country_code: countryCode, display_currency: displayCurrency }).eq('id', userId);
  if (result.error) throw result.error;
}

export async function getPublicProfileContent(profile: Profile) {
  const { ids } = getOwnershipKeys({
    id: profile.id,
    display_name: profile.display_name ?? null,
    username: profile.username ?? null,
    role: profile.role ?? null,
    slug: profile.slug ?? null,
    avatar_url: profile.avatar_url ?? null,
    bio: profile.bio ?? null,
    creator_type: profile.creator_type ?? null,
  }, profile.id);

  const [itemResult, postResult, linkResult, eventResult] = await Promise.all([
    supabase
      .from('catalog_items')
      .select('*, creators:profiles!author_id(*)')
      .eq('author_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('community_discussions')
      .select('*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type)')
      .in('author_id', ids)
      .eq('status', 'published')
      .order('created_at', { ascending: false }),
    supabase
      .from('profile_external_links')
      .select('id,label,platform,url,sort_order')
      .eq('profile_id', profile.id)
      .order('sort_order'),
    supabase.from('creator_events').select('*').eq('creator_id', profile.id).order('starts_at', { ascending: true }),
  ]);
  if (itemResult.error) throw itemResult.error;
  if (postResult.error) throw postResult.error;
  if (linkResult.error) throw linkResult.error;
  if (eventResult.error) throw eventResult.error;

  const posts = ((postResult.data as SocialPost[] | null) ?? []).filter(Boolean);
  const postIds = posts.map(post => post.id);
  if (postIds.length === 0) {
    return { items: (itemResult.data as Product[] | null) ?? [], posts, replies: [], likes: [], links: linkResult.data ?? [], events: eventResult.data ?? [] };
  }

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
  if (replyResult.error) throw replyResult.error;
  if (likeResult.error) throw likeResult.error;

  return {
    items: (itemResult.data as Product[] | null) ?? [],
    posts,
    replies: (replyResult.data as ReplyEngagerRow[] | null) ?? [],
    likes: (likeResult.data as LikeRow[] | null) ?? [],
    links: linkResult.data ?? [],
    events: eventResult.data ?? [],
  };
}

export async function isFollowingProfile(followerId: string, followingId: string) {
  const result = await supabase
    .from('profile_follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  if (isMissingRelationError(result.error)) return false;
  if (result.error) throw result.error;
  return Boolean(result.data);
}

export async function followProfile(followerId: string, followingId: string) {
  const result = await supabase
    .from('profile_follows')
    .upsert({ follower_id: followerId, following_id: followingId }, { onConflict: 'follower_id,following_id' });
  if (result.error) throw result.error;
}

export async function unfollowProfile(followerId: string, followingId: string) {
  const result = await supabase
    .from('profile_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (result.error) throw result.error;
}
