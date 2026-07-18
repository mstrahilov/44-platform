import type { MetadataRoute } from 'next';
import { absoluteMetadataUrl } from '@/lib/metadata';
import { supabase } from '@/lib/supabase';
import { SUPPORT_ARTICLES, supportArticleHref } from '@/lib/supportArticles';

const PUBLIC_ROUTES = [
  '/',
  '/store',
  '/store/music',
  '/store/books',
  '/store/sample-packs',
  '/store/merch',
  '/community',
  '/calendar',
  '/community/questions',
  '/community/collaboration',
  '/radio',
  '/search',
  '/support',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticRoutes: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((path, index) => ({
    url: absoluteMetadataUrl(path),
    lastModified,
    changeFrequency: index === 0 ? 'daily' : 'weekly',
    priority: index === 0 ? 1 : path === '/store' || path === '/community' || path === '/radio' ? 0.9 : 0.7,
  }));

  const supportRoutes: MetadataRoute.Sitemap = SUPPORT_ARTICLES.map(article => ({
    url: absoluteMetadataUrl(supportArticleHref(article)),
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const result = await supabase
    .from('catalog_items')
    .select('id,slug,created_at')
    .eq('status', 'published')
    .not('slug', 'is', null)
    .order('created_at', { ascending: false });

  if (result.error) return [...staticRoutes, ...supportRoutes];

  const itemRoutes = (result.data ?? []).flatMap(item => {
    const slug = item.slug?.trim();
    if (!slug) return [];
    return [{
      url: absoluteMetadataUrl(`/store/item/${slug}`),
      lastModified: item.created_at ? new Date(item.created_at) : lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }];
  });

  return [...staticRoutes, ...supportRoutes, ...itemRoutes];
}
