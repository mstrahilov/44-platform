import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { absoluteAppUrl } from '@/lib/metadata';
import { getMarketingUrl } from '@/lib/siteUrl';
import { supabase } from '@/lib/supabase';
import { SUPPORT_ARTICLES, supportArticleHref } from '@/lib/supportArticles';

const PUBLIC_ROUTES = [
  '/',
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
  const hostname = (await headers()).get('host')?.split(':', 1)[0]?.toLowerCase();
  const marketingEnabled = process.env.MARKETING_SITE_ENABLED === 'true';
  if (marketingEnabled && (hostname === '44os.com' || hostname === 'www.44os.com')) {
    return [{
      url: `${getMarketingUrl()}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    }];
  }
  const staticRoutes: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((path, index) => ({
    url: absoluteAppUrl(path),
    lastModified,
    changeFrequency: index === 0 ? 'daily' : 'weekly',
    priority: index === 0 ? 1 : path === '/community' || path === '/radio' ? 0.9 : 0.7,
  }));

  const supportRoutes: MetadataRoute.Sitemap = SUPPORT_ARTICLES.map(article => ({
    url: absoluteAppUrl(supportArticleHref(article)),
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
      url: absoluteAppUrl(`/store/item/${slug}`),
      lastModified: item.created_at ? new Date(item.created_at) : lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }];
  });

  return [...staticRoutes, ...supportRoutes, ...itemRoutes];
}
