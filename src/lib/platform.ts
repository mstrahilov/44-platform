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
  categories?: Pick<Category, 'id' | 'slug' | 'name'> | null;
}

export interface Service {
  id: string;
  creator_id: string | null;
  category_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  service_type?: string | null;
  starting_price_cents: number;
  delivery_estimate: string | null;
  cover_url: string | null;
  feature_description?: string | null;
  featured: boolean;
  status: string;
  created_at: string;
  creators?: Pick<Creator, 'id' | 'slug' | 'name' | 'avatar_url'> | null;
  categories?: Pick<Category, 'id' | 'slug' | 'name'> | null;
}

export interface Resource {
  id: string;
  creator_id: string | null;
  category_id: string | null;
  slug: string;
  title: string;
  summary: string | null;
  body: string | null;
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

export interface CommunityPost {
  id: string;
  creator_id: string | null;
  category_id: string | null;
  title: string;
  body: string | null;
  post_type: string;
  status: string;
  created_at: string;
  creators?: Pick<Creator, 'id' | 'slug' | 'name' | 'avatar_url'> | null;
  categories?: Pick<Category, 'id' | 'slug' | 'name'> | null;
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

export function formatServicePrice(service: Pick<Service, 'starting_price_cents'>) {
  if (service.starting_price_cents === 0) return 'Free inquiry';

  return `From ${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(service.starting_price_cents / 100)}`;
}

export function serviceHref(service: Pick<Service, 'id' | 'slug'>) {
  return `/services/${service.slug || service.id}`;
}

export function resourceHref(resource: Pick<Resource, 'slug' | 'id'>) {
  return `/resources/${resource.slug || resource.id}`;
}

export function creatorHref(creator: Pick<Creator, 'slug'> | string | null | undefined) {
  if (!creator) return '/community/creator-a';
  if (typeof creator !== 'string') return `/community/${creator.slug}`;

  const slug = creator
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `/community/${slug || 'creator-a'}`;
}

