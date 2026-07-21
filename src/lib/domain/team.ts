import { supabase } from '@/lib/supabase';

export type TeamAccessState = {
  authorized: boolean;
  source: 'admin' | 'grant' | 'none';
  profileId?: string;
  grantedAt?: string | null;
  revokedAt?: string | null;
};

export type TeamCreator = {
  profile_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  creator_type: string | null;
  public_links: Array<{ platform: string; label: string; url: string }>;
  joined_at: string;
  published_item_count: number;
  profile_url: string;
  total_count: number;
};

export type TeamRelease = {
  item_id: string;
  title: string;
  artwork_url: string | null;
  creator_id: string | null;
  creator_name: string;
  creator_username: string | null;
  category: string;
  item_type: string;
  release_date: string | null;
  platform_added_at: string;
  item_url: string;
  total_count: number;
};

export type TeamBrandKit = {
  version: string;
  filename: string;
  checksum: string;
  updatedAt: string;
  byteSize: number;
  contents: string[];
};

export async function teamBearerToken() {
  const session = await supabase.auth.getSession();
  return session.data.session?.access_token ?? null;
}

export async function fetchMyTeamAccess(): Promise<TeamAccessState> {
  const token = await teamBearerToken();
  if (!token) return { authorized: false, source: 'none' };
  const response = await fetch('/api/team/access', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (response.status === 401 || response.status === 403 || response.status === 404) return { authorized: false, source: 'none' };
  if (!response.ok) throw new Error('Team access could not be verified.');
  return (await response.json()) as TeamAccessState;
}

export async function listTeamCreators(input: {
  query?: string;
  creatorType?: string;
  sort?: 'joined_desc' | 'name' | 'releases_desc';
  limit?: number;
  offset?: number;
} = {}) {
  const result = await supabase.rpc('list_team_creators' as never, {
    target_query: input.query || undefined,
    target_creator_type: input.creatorType || undefined,
    target_sort: input.sort ?? 'joined_desc',
    target_limit: input.limit ?? 24,
    target_offset: input.offset ?? 0,
  } as never);
  if (result.error) {
    if (process.env.NODE_ENV === 'production') throw result.error;
    let query = supabase.from('profiles').select('id,display_name,username,avatar_url,bio,creator_type,created_at')
      .in('role', ['creator', 'admin']).eq('is_published', true);
    if (input.query) query = query.or(`display_name.ilike.%${input.query}%,username.ilike.%${input.query}%,bio.ilike.%${input.query}%`);
    if (input.creatorType) query = query.eq('creator_type', input.creatorType);
    const profiles = await query.limit(100);
    if (profiles.error) throw profiles.error;
    const profileRows = profiles.data ?? [];
    const ids = profileRows.map(profile => profile.id);
    const itemRows = ids.length ? await supabase.from('catalog_items').select('id,author_id').in('author_id', ids).eq('status', 'published') : { data: [], error: null };
    if (itemRows.error) throw itemRows.error;
    const counts = new Map<string, number>();
    itemRows.data?.forEach(item => { if (item.author_id) counts.set(item.author_id, (counts.get(item.author_id) ?? 0) + 1); });
    const sorted = profileRows.map(profile => ({
      profile_id: profile.id, display_name: profile.display_name, username: profile.username,
      avatar_url: profile.avatar_url, bio: profile.bio, creator_type: profile.creator_type,
      public_links: [], joined_at: profile.created_at, published_item_count: counts.get(profile.id) ?? 0,
      profile_url: `/profile/${profile.username || profile.id}`, total_count: profileRows.length,
    } satisfies TeamCreator)).sort((left, right) => input.sort === 'name'
      ? (left.display_name || left.username || '').localeCompare(right.display_name || right.username || '')
      : input.sort === 'releases_desc'
        ? right.published_item_count - left.published_item_count
        : new Date(right.joined_at).getTime() - new Date(left.joined_at).getTime());
    return sorted.slice(input.offset ?? 0, (input.offset ?? 0) + (input.limit ?? 24));
  }
  return (result.data ?? []) as unknown as TeamCreator[];
}

export async function listTeamReleases(input: {
  query?: string;
  creatorId?: string;
  category?: string;
  sort?: 'added_desc' | 'release_date_desc' | 'title';
  limit?: number;
  offset?: number;
} = {}) {
  const result = await supabase.rpc('list_team_releases' as never, {
    target_query: input.query || undefined,
    target_creator: input.creatorId || undefined,
    target_category: input.category || undefined,
    target_sort: input.sort ?? 'added_desc',
    target_limit: input.limit ?? 24,
    target_offset: input.offset ?? 0,
  } as never);
  if (result.error) {
    if (process.env.NODE_ENV === 'production') throw result.error;
    let query = supabase.from('catalog_items')
      .select('id,title,cover_url,author_id,creator,experience_type,item_type,release_date,created_at,slug')
      .eq('status', 'published');
    if (input.query) query = query.or(`title.ilike.%${input.query}%,creator.ilike.%${input.query}%`);
    if (input.creatorId) query = query.eq('author_id', input.creatorId);
    if (input.category) query = query.eq('experience_type', input.category);
    if (input.sort === 'title') query = query.order('title');
    else if (input.sort === 'release_date_desc') query = query.order('release_date', { ascending: false, nullsFirst: false });
    else query = query.order('created_at', { ascending: false });
    const rows = await query.range(input.offset ?? 0, (input.offset ?? 0) + (input.limit ?? 24) - 1);
    if (rows.error) throw rows.error;
    const creatorIds = Array.from(new Set((rows.data ?? []).map(item => item.author_id).filter((value): value is string => Boolean(value))));
    const creators = creatorIds.length ? await supabase.from('profiles').select('id,display_name,username').in('id', creatorIds) : { data: [], error: null };
    if (creators.error) throw creators.error;
    const creatorMap = new Map((creators.data ?? []).map(creator => [creator.id, creator]));
    return (rows.data ?? []).map(item => {
      const creator = item.author_id ? creatorMap.get(item.author_id) : null;
      return {
        item_id: item.id, title: item.title, artwork_url: item.cover_url, creator_id: item.author_id,
        creator_name: creator?.display_name || creator?.username || item.creator,
        creator_username: creator?.username || null, category: item.experience_type, item_type: item.item_type,
        release_date: item.release_date, platform_added_at: item.created_at, item_url: `/store/item/${item.slug}`,
        total_count: rows.data?.length ?? 0,
      } satisfies TeamRelease;
    });
  }
  return (result.data ?? []) as unknown as TeamRelease[];
}
