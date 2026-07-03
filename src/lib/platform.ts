import { formatStartingPrice } from '@/lib/pricing';

export type PlatformScope = 'products' | 'services' | 'resources' | 'posts' | 'creators';

export interface Category {
  id: string;
  scope: PlatformScope;
  slug: string;
  name: string;
  sort_order: number;
}

export interface Tag {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  sort_order: number;
}

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
  hero_url?: string | null;
  bio?: string | null;
  role?: string | null;
  creator_type?: string | null;
  is_official?: boolean | null;
  is_published?: boolean | null;
  country_code?: string | null;
  display_currency?: string | null;
  home_country_code?: string | null;
  home_currency?: string | null;
  product_market_mode?: string | null;
  service_market_mode?: string | null;
}

export interface Creator {
  id: string;
  profile_id: string | null;
  category_id?: string | null;
  slug: string;
  name: string;
  bio: string | null;
  creator_type?: string | null;
  hero_url: string | null;
  avatar_url: string | null;
  is_published: boolean;
  country_code?: string | null;
  display_currency?: string | null;
  home_country_code?: string | null;
  home_currency?: string | null;
  product_market_mode?: string | null;
  service_market_mode?: string | null;
  categories?: Pick<Category, 'id' | 'slug' | 'name'> | null;
}

export type ProfileLinkTarget = Pick<Profile, 'slug' | 'username'>;

export interface Service {
  id: string;
  author_id: string | null;
  category_id: string | null;
  slug: string;
  title: string;
  short_description: string | null;
  long_description: string | null;
  service_type?: string | null;
  starting_price_cents: number;
  market_mode?: string | null;
  local_price_cents?: number | null;
  local_currency?: string | null;
  available_locally_only?: boolean | null;
  delivery_estimate: string | null;
  cover_url: string | null;
  feature_description?: string | null;
  featured: boolean;
  status: string;
  created_at: string;
  creators?: Pick<Creator, 'id' | 'slug' | 'name' | 'avatar_url' | 'country_code' | 'display_currency' | 'home_country_code' | 'home_currency'> | null;
  categories?: Pick<Category, 'id' | 'slug' | 'name'> | null;
}

export interface Resource {
  id: string;
  author_id: string | null;
  category_id: string | null;
  slug: string;
  title: string;
  short_description: string | null;
  long_description: string | null;
  resource_type: string;
  cover_url: string | null;
  download_url?: string | null;
  status: string;
  created_at: string;
  creators?: Pick<Creator, 'id' | 'slug' | 'name' | 'avatar_url'> | null;
  categories?: Pick<Category, 'id' | 'slug' | 'name'> | null;
}

export interface Track {
  id: string;
  product_id: string;
  number: number;
  title: string;
  duration_seconds: number | null;
  audio_url: string | null;
  download_url: string | null;
}

export interface ProductAchievement {
  id: string;
  product_id: string;
  code: string;
  title: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  reward_product_id: string | null;
  reward_config: Record<string, unknown>;
  points: number;
  icon: string | null;
  sort_order: number;
  is_secret: boolean;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  product_id: string;
  unlocked_at: string;
}

export interface AchievementEvent {
  id: string;
  user_id: string;
  product_id: string | null;
  achievement_id: string | null;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at?: string;
}

export interface CommunityPost {
  id: string;
  slug?: string | null;
  author_id?: string | null;
  category_id: string | null;
  title: string;
  body: string | null;
  post_type: string;
  status: string;
  created_at: string;
  creators?: Pick<Creator, 'id' | 'slug' | 'name' | 'avatar_url'> | null;
  categories?: Pick<Category, 'id' | 'slug' | 'name'> | null;
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

export interface SavedResource {
  id: string;
  resource_id: string;
  saved_at: string;
  resources: Resource | null;
}

export interface ServiceRequest {
  id: string;
  service_id: string;
  message: string | null;
  status: string;
  created_at: string;
  services: Service | null;
}

export function formatServicePrice(service: Pick<Service, 'starting_price_cents'> & Partial<Service>) {
  return formatStartingPrice(service);
}

export function serviceHref(service: Pick<Service, 'id' | 'slug'>) {
  return `/service/${service.slug || service.id}`;
}

export function resourceHref(resource: Pick<Resource, 'slug' | 'id'>) {
  return `/resources/${resource.slug || resource.id}`;
}

export function creatorHref(creator: ProfileLinkTarget | Pick<Creator, 'slug'> | string | null | undefined) {
  if (!creator) return '/community/profile/member';
  if (typeof creator !== 'string') {
    const handle = ('username' in creator ? creator.username : null) || creator.slug;
    return `/community/profile/${handle || 'member'}`;
  }

  const slug = creator
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `/community/profile/${slug || 'member'}`;
}

export function communityThreadHref(post: Pick<CommunityPost, 'id' | 'slug'>) {
  return `/community/thread/${post.slug || post.id}`;
}
