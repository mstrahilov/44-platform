export type PlatformScope = 'products' | 'services' | 'resources' | 'posts';

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
  slug: string;
  name: string;
  bio: string | null;
  hero_url: string | null;
  avatar_url: string | null;
  is_published: boolean;
}

export interface Service {
  id: string;
  creator_id: string | null;
  category_id: string | null;
  slug: string;
  title: string;
  description: string | null;
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
  status: string;
  created_at: string;
  creators?: Pick<Creator, 'id' | 'slug' | 'name' | 'avatar_url'> | null;
  categories?: Pick<Category, 'id' | 'slug' | 'name'> | null;
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
  { id: 'cat-products-tools', scope: 'products', slug: 'tools', name: 'Tools', sort_order: 50 },
  { id: 'cat-products-interactive', scope: 'products', slug: 'interactive', name: 'Interactive', sort_order: 60 },
  { id: 'cat-products-sample-packs', scope: 'products', slug: 'sample-packs', name: 'Sample Packs', sort_order: 70 },
  { id: 'cat-services-music', scope: 'services', slug: 'music', name: 'Music', sort_order: 10 },
  { id: 'cat-services-design', scope: 'services', slug: 'design', name: 'Design', sort_order: 20 },
  { id: 'cat-services-video', scope: 'services', slug: 'video', name: 'Video', sort_order: 30 },
  { id: 'cat-services-development', scope: 'services', slug: 'development', name: 'Development', sort_order: 40 },
  { id: 'cat-services-consulting', scope: 'services', slug: 'consulting', name: 'Consulting', sort_order: 50 },
  { id: 'cat-resources-guides', scope: 'resources', slug: 'guides', name: 'Guides', sort_order: 10 },
  { id: 'cat-resources-templates', scope: 'resources', slug: 'templates', name: 'Templates', sort_order: 20 },
  { id: 'cat-resources-lessons', scope: 'resources', slug: 'lessons', name: 'Lessons', sort_order: 30 },
  { id: 'cat-resources-downloads', scope: 'resources', slug: 'downloads', name: 'Downloads', sort_order: 40 },
  { id: 'cat-resources-checklists', scope: 'resources', slug: 'checklists', name: 'Checklists', sort_order: 50 },
  { id: 'cat-posts-feed', scope: 'posts', slug: 'feed', name: 'Feed', sort_order: 10 },
  { id: 'cat-posts-dev-logs', scope: 'posts', slug: 'dev-logs', name: 'Dev Logs', sort_order: 20 },
  { id: 'cat-posts-showcase', scope: 'posts', slug: 'showcase', name: 'Showcase', sort_order: 30 },
  { id: 'cat-posts-discussions', scope: 'posts', slug: 'discussions', name: 'Discussions', sort_order: 40 },
  { id: 'cat-posts-updates', scope: 'posts', slug: 'updates', name: 'Updates', sort_order: 50 },
];

export const FALLBACK_TAGS: Tag[] = [
  { id: 'tag-products-music-ambient', category_id: 'cat-products-music', slug: 'ambient', name: 'Ambient', sort_order: 10 },
  { id: 'tag-products-music-electronic', category_id: 'cat-products-music', slug: 'electronic', name: 'Electronic', sort_order: 20 },
  { id: 'tag-products-games-puzzle', category_id: 'cat-products-games', slug: 'puzzle', name: 'Puzzle', sort_order: 10 },
  { id: 'tag-products-books-lore', category_id: 'cat-products-books', slug: 'lore', name: 'Lore', sort_order: 10 },
  { id: 'tag-services-music-production', category_id: 'cat-services-music', slug: 'production', name: 'Production', sort_order: 10 },
  { id: 'tag-services-design-album-art', category_id: 'cat-services-design', slug: 'album-art', name: 'Album Art', sort_order: 10 },
  { id: 'tag-services-development-unity', category_id: 'cat-services-development', slug: 'unity', name: 'Unity', sort_order: 10 },
  { id: 'tag-resources-guides-music-publishing', category_id: 'cat-resources-guides', slug: 'music-publishing', name: 'Music Publishing', sort_order: 10 },
  { id: 'tag-resources-templates-release-plan', category_id: 'cat-resources-templates', slug: 'release-plan', name: 'Release Plan', sort_order: 10 },
  { id: 'tag-posts-discussions-feedback', category_id: 'cat-posts-discussions', slug: 'feedback', name: 'Feedback', sort_order: 10 },
];

export const FALLBACK_SERVICES: Service[] = [
  {
    id: 'fallback-service-production',
    creator_id: null,
    category_id: 'cat-services-music',
    slug: 'music-production',
    title: 'Music Production',
    description: 'Full track production from concept to master-ready file.',
    starting_price_cents: 14900,
    delivery_estimate: '5-7 day delivery',
    cover_url: null,
    featured: true,
    status: 'published',
    created_at: new Date(0).toISOString(),
    creators: { id: 'fallback-creator-a', slug: 'creator-a', name: 'Creator A', avatar_url: null },
    categories: { id: 'cat-services-music', slug: 'music', name: 'Music' },
  },
  {
    id: 'fallback-service-web-design',
    creator_id: null,
    category_id: 'cat-services-design',
    slug: 'web-design',
    title: 'Web Design',
    description: 'Website and landing page design for creators, products, and releases.',
    starting_price_cents: 29900,
    delivery_estimate: '7-10 day delivery',
    cover_url: null,
    featured: true,
    status: 'published',
    created_at: new Date(0).toISOString(),
    creators: { id: 'fallback-creator-b', slug: 'creator-b', name: 'Creator B', avatar_url: null },
    categories: { id: 'cat-services-design', slug: 'design', name: 'Design' },
  },
  {
    id: 'fallback-service-graphic-design',
    creator_id: null,
    category_id: 'cat-services-design',
    slug: 'graphic-design',
    title: 'Graphic Design',
    description: 'Visual identity, cover design, and campaign assets.',
    starting_price_cents: 9900,
    delivery_estimate: '3-5 day delivery',
    cover_url: null,
    featured: true,
    status: 'published',
    created_at: new Date(0).toISOString(),
    creators: { id: 'fallback-creator-c', slug: 'creator-c', name: 'Creator C', avatar_url: null },
    categories: { id: 'cat-services-design', slug: 'design', name: 'Design' },
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
