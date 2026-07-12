export interface ItemCategory {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

/** @deprecated Use ItemCategory. */
export type ProductCategory = ItemCategory;

// A 44 user. `profiles` is the single users table (member | creator | admin).
// Content authors are profiles; joins alias the relation back to `creators`
// (`creators:profiles!author_id(name:display_name, ...)`) so `.creators?.name`
// keeps working across cards and detail pages.
export interface Profile {
  id: string;
  slug: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  role?: string | null;
  creator_type?: string | null;
  is_official?: boolean | null;
  is_published?: boolean | null;
  country_code?: string | null;
  display_currency?: string | null;
  home_country_code?: string | null;
  home_currency?: string | null;
  item_market_mode?: string | null;
  service_market_mode?: string | null;
}

export interface Creator {
  id: string;
  profile_id: string | null;
  slug: string;
  name: string;
  bio: string | null;
  creator_type?: string | null;
  avatar_url: string | null;
  is_published: boolean;
  country_code?: string | null;
  display_currency?: string | null;
  home_country_code?: string | null;
  home_currency?: string | null;
  item_market_mode?: string | null;
  service_market_mode?: string | null;
}

export type ProfileLinkTarget = Pick<Profile, 'slug' | 'username'>;

export interface Track {
  id: string;
  item_id: string;
  number: number;
  title: string;
  duration_seconds: number | null;
  audio_url: string | null;
  download_url: string | null;
}

export interface ItemAchievement {
  id: string;
  item_id: string;
  template_id?: string | null;
  code: string;
  title: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  reward_item_id: string | null;
  reward_config: Record<string, unknown>;
  points: number;
  icon: string | null;
  sort_order: number;
  is_secret: boolean;
}

/** @deprecated Use ItemAchievement. */
export type ProductAchievement = ItemAchievement;

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  item_id: string;
  unlocked_at: string;
}

export interface AchievementEvent {
  id: string;
  user_id: string;
  item_id: string | null;
  achievement_id: string | null;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at?: string;
}

export interface CommunityPost {
  id: string;
  slug?: string | null;
  author_id?: string | null;
  title: string;
  body: string | null;
  status: string;
  created_at: string;
  creators?: Pick<Creator, 'id' | 'slug' | 'name' | 'avatar_url'> | null;
}

export interface CommunityReply {
  id: string;
  post_id: string;
  author_id: string | null;
  parent_reply_id: string | null;
  body: string;
  status: string;
  created_at: string;
  updated_at?: string | null;
  authors?: Pick<Profile, 'id' | 'slug' | 'display_name' | 'username' | 'avatar_url'> | null;
}

export function creatorHref(creator: ProfileLinkTarget | Pick<Creator, 'slug'> | string | null | undefined) {
  if (!creator) return '/profile/member';
  if (typeof creator !== 'string') {
    const handle = ('username' in creator ? creator.username : null) || creator.slug;
    return `/profile/${handle || 'member'}`;
  }

  const slug = creator
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `/profile/${slug || 'member'}`;
}

export function communityThreadHref(post: Pick<CommunityPost, 'id' | 'slug'>) {
  return `/community/thread/${post.slug || post.id}`;
}
