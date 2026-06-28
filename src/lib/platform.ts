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

export const FALLBACK_CATEGORIES: Category[] = [
  { id: 'cat-products-music', scope: 'products', slug: 'music', name: 'Music', sort_order: 10 },
  { id: 'cat-products-games', scope: 'products', slug: 'games', name: 'Games', sort_order: 20 },
  { id: 'cat-products-books', scope: 'products', slug: 'books', name: 'Books', sort_order: 30 },
  { id: 'cat-products-apparel', scope: 'products', slug: 'apparel', name: 'Apparel', sort_order: 40 },
  { id: 'cat-products-assets', scope: 'products', slug: 'assets', name: 'Assets', sort_order: 50 },
  { id: 'cat-services-music-production', scope: 'services', slug: 'music-production', name: 'Music Production', sort_order: 10 },
  { id: 'cat-services-video-production', scope: 'services', slug: 'video-production', name: 'Video Production', sort_order: 20 },
  { id: 'cat-services-graphic-design', scope: 'services', slug: 'graphic-design', name: 'Graphic Design', sort_order: 30 },
  { id: 'cat-services-web-development', scope: 'services', slug: 'web-development', name: 'Web Development', sort_order: 40 },
  { id: 'cat-services-game-development', scope: 'services', slug: 'game-development', name: 'Game Development', sort_order: 50 },
  { id: 'cat-services-marketing', scope: 'services', slug: 'marketing', name: 'Marketing', sort_order: 60 },
  { id: 'cat-resources-music-production', scope: 'resources', slug: 'music-production', name: 'Music Production', sort_order: 10 },
  { id: 'cat-resources-video-production', scope: 'resources', slug: 'video-production', name: 'Video Production', sort_order: 20 },
  { id: 'cat-resources-graphic-design', scope: 'resources', slug: 'graphic-design', name: 'Graphic Design', sort_order: 30 },
  { id: 'cat-resources-web-development', scope: 'resources', slug: 'web-development', name: 'Web Development', sort_order: 40 },
  { id: 'cat-resources-game-development', scope: 'resources', slug: 'game-development', name: 'Game Development', sort_order: 50 },
  { id: 'cat-resources-marketing', scope: 'resources', slug: 'marketing', name: 'Marketing', sort_order: 60 },
  { id: 'cat-posts-discussions', scope: 'posts', slug: 'discussions', name: 'Discussions', sort_order: 10 },
  { id: 'cat-creators-members', scope: 'creators', slug: 'members', name: 'Members', sort_order: 20 },
  { id: 'cat-posts-reviews', scope: 'posts', slug: 'reviews', name: 'Reviews', sort_order: 30 },
  { id: 'cat-posts-news', scope: 'posts', slug: 'news', name: 'News', sort_order: 40 },
];

export const FALLBACK_TAGS: Tag[] = [
  { id: 'tag-products-music-album', category_id: 'cat-products-music', slug: 'album', name: 'Album', sort_order: 10 },
  { id: 'tag-products-music-ep', category_id: 'cat-products-music', slug: 'ep', name: 'EP', sort_order: 20 },
  { id: 'tag-products-music-single', category_id: 'cat-products-music', slug: 'single', name: 'Single', sort_order: 30 },
  { id: 'tag-products-books-art-book', category_id: 'cat-products-books', slug: 'art-book', name: 'Art Book', sort_order: 10 },
  { id: 'tag-products-sample-packs-drum-kit', category_id: 'cat-products-sample-packs', slug: 'drum-kit', name: 'Drum Kit', sort_order: 10 },
  { id: 'tag-products-sample-packs-loop-pack', category_id: 'cat-products-sample-packs', slug: 'loop-pack', name: 'Loop Pack', sort_order: 20 },
  { id: 'tag-products-interactive-web-game', category_id: 'cat-products-interactive', slug: 'web-game', name: 'Web Game', sort_order: 10 },
  { id: 'tag-products-tools-template', category_id: 'cat-products-tools', slug: 'template', name: 'Template', sort_order: 10 },
  { id: 'tag-services-music-production-production', category_id: 'cat-services-music-production', slug: 'production', name: 'Production', sort_order: 10 },
  { id: 'tag-services-music-production-mixing', category_id: 'cat-services-music-production', slug: 'mixing', name: 'Mixing', sort_order: 20 },
  { id: 'tag-services-visual-design-cover-art', category_id: 'cat-services-visual-design', slug: 'cover-art', name: 'Cover Art', sort_order: 10 },
  { id: 'tag-services-development-unity', category_id: 'cat-services-development', slug: 'unity', name: 'Unity', sort_order: 10 },
  { id: 'tag-resources-articles-news-article', category_id: 'cat-resources-articles', slug: 'news-article', name: 'News Article', sort_order: 10 },
  { id: 'tag-resources-guides-publishing-guide', category_id: 'cat-resources-guides', slug: 'publishing-guide', name: 'Publishing Guide', sort_order: 10 },
  { id: 'tag-resources-templates-release-plan', category_id: 'cat-resources-templates', slug: 'release-plan', name: 'Release Plan', sort_order: 10 },
  { id: 'tag-resources-lessons-music-lesson', category_id: 'cat-resources-lessons', slug: 'music-lesson', name: 'Music Lesson', sort_order: 10 },
  { id: 'tag-creators-creators-artist', category_id: 'cat-creators-creators', slug: 'artist', name: 'Artist', sort_order: 10 },
  { id: 'tag-creators-creators-producer', category_id: 'cat-creators-creators', slug: 'producer', name: 'Producer', sort_order: 20 },
  { id: 'tag-posts-discussions-question', category_id: 'cat-posts-discussions', slug: 'question', name: 'Question', sort_order: 10 },
  { id: 'tag-posts-news-platform-news', category_id: 'cat-posts-news', slug: 'platform-news', name: 'Platform News', sort_order: 10 },
  { id: 'tag-posts-streams-live-show', category_id: 'cat-posts-streams', slug: 'live-show', name: 'Live Show', sort_order: 10 },
  { id: 'tag-posts-reviews-product-review', category_id: 'cat-posts-reviews', slug: 'product-review', name: 'Product Review', sort_order: 10 },
  { id: 'tag-posts-showcases-music-showcase', category_id: 'cat-posts-showcases', slug: 'music-showcase', name: 'Music Showcase', sort_order: 10 },
  { id: 'tag-posts-requests-help-request', category_id: 'cat-posts-requests', slug: 'help-request', name: 'Help Request', sort_order: 10 },
  { id: 'tag-posts-updates-dev-log', category_id: 'cat-posts-updates', slug: 'dev-log', name: 'Dev Log', sort_order: 10 },
];

export const FALLBACK_SERVICES: Service[] = [
  {
    id: 'fallback-service-production',
    creator_id: null,
    category_id: 'cat-services-music-production',
    slug: 'music-production',
    title: 'Music Production',
    description: 'Full track production from concept to master-ready file.',
    service_type: 'Production',
    starting_price_cents: 14900,
    delivery_estimate: '5-7 day delivery',
    cover_url: null,
    featured: true,
    status: 'published',
    created_at: new Date(0).toISOString(),
    creators: { id: 'fallback-creator-a', slug: 'creator-a', name: 'Creator A', avatar_url: null },
    categories: { id: 'cat-services-music-production', slug: 'music-production', name: 'Music Production' },
  },
  {
    id: 'fallback-service-web-design',
    creator_id: null,
    category_id: 'cat-services-visual-design',
    slug: 'web-design',
    title: 'Web Design',
    description: 'Website and landing page design for creators, products, and releases.',
    service_type: 'Web Design',
    starting_price_cents: 29900,
    delivery_estimate: '7-10 day delivery',
    cover_url: null,
    featured: true,
    status: 'published',
    created_at: new Date(0).toISOString(),
    creators: { id: 'fallback-creator-b', slug: 'creator-b', name: 'Creator B', avatar_url: null },
    categories: { id: 'cat-services-visual-design', slug: 'visual-design', name: 'Visual & Design' },
  },
  {
    id: 'fallback-service-graphic-design',
    creator_id: null,
    category_id: 'cat-services-visual-design',
    slug: 'graphic-design',
    title: 'Graphic Design',
    description: 'Visual identity, cover design, and campaign assets.',
    service_type: 'Graphic Design',
    starting_price_cents: 9900,
    delivery_estimate: '3-5 day delivery',
    cover_url: null,
    featured: true,
    status: 'published',
    created_at: new Date(0).toISOString(),
    creators: { id: 'fallback-creator-c', slug: 'creator-c', name: 'Creator C', avatar_url: null },
    categories: { id: 'cat-services-visual-design', slug: 'visual-design', name: 'Visual & Design' },
  },
];

export const FALLBACK_RESOURCES: Resource[] = [
  {
    id: 'fallback-resource-guide-a',
    creator_id: null,
    category_id: 'cat-resources-guides',
    slug: 'guide-a',
    title: 'Guide A',
    summary: 'Generic guide summary for testing resource cards.',
    body: 'Description text for Guide A.',
    resource_type: 'guide',
    cover_url: null,
    status: 'published',
    created_at: new Date(0).toISOString(),
    creators: { id: 'fallback-creator-a', slug: 'creator-a', name: 'Creator A', avatar_url: null },
    categories: { id: 'cat-resources-guides', slug: 'guides', name: 'Guides' },
  },
  {
    id: 'fallback-resource-template-a',
    creator_id: null,
    category_id: 'cat-resources-templates',
    slug: 'template-a',
    title: 'Template A',
    summary: 'Generic template summary for testing saved resources.',
    body: 'Description text for Template A.',
    resource_type: 'template',
    cover_url: null,
    status: 'published',
    created_at: new Date(0).toISOString(),
    creators: { id: 'fallback-creator-b', slug: 'creator-b', name: 'Creator B', avatar_url: null },
    categories: { id: 'cat-resources-templates', slug: 'templates', name: 'Templates' },
  },
  {
    id: 'fallback-resource-lesson-a',
    creator_id: null,
    category_id: 'cat-resources-lessons',
    slug: 'lesson-a',
    title: 'Lesson A',
    summary: 'Generic lesson summary for testing community learning content.',
    body: 'Description text for Lesson A.',
    resource_type: 'lesson',
    cover_url: null,
    status: 'published',
    created_at: new Date(0).toISOString(),
    creators: { id: 'fallback-creator-c', slug: 'creator-c', name: 'Creator C', avatar_url: null },
    categories: { id: 'cat-resources-lessons', slug: 'lessons', name: 'Lessons' },
  },
];
