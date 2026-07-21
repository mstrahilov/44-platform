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
  '/support',
];

function validDate(value: string | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const hostname = (await headers()).get('host')?.split(':', 1)[0]?.toLowerCase();
  const marketingEnabled = process.env.MARKETING_SITE_ENABLED === 'true';
  if (marketingEnabled && (hostname === '44os.com' || hostname === 'www.44os.com')) {
    return [{
      url: `${getMarketingUrl()}/`,
      changeFrequency: 'weekly',
      priority: 1,
    }];
  }
  const staticRoutes: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((path, index) => ({
    url: absoluteAppUrl(path),
    changeFrequency: index === 0 ? 'daily' : 'weekly',
    priority: index === 0 ? 1 : path === '/community' || path === '/radio' ? 0.9 : 0.7,
  }));

  const supportRoutes: MetadataRoute.Sitemap = SUPPORT_ARTICLES.map(article => ({
    url: absoluteAppUrl(supportArticleHref(article)),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const [itemResult, profileResult, discussionResult] = await Promise.all([
    supabase
      .from('catalog_items')
      .select('id,slug,updated_at')
      .eq('status', 'published')
      .not('slug', 'is', null)
      .order('updated_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('slug,username,updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false }),
    supabase
      .from('community_discussions')
      .select('id,slug,updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false }),
  ]);

  const itemRoutes: MetadataRoute.Sitemap = (itemResult.data ?? []).flatMap(item => {
    const slug = item.slug?.trim();
    if (!slug) return [];
    return [{
      url: absoluteAppUrl(`/store/item/${slug}`),
      lastModified: validDate(item.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }];
  });

  const profileRoutes: MetadataRoute.Sitemap = (profileResult.data ?? []).flatMap(profile => {
    const identifier = profile.username?.trim() || profile.slug?.trim();
    if (!identifier) return [];
    return [{
      url: absoluteAppUrl(`/profile/${encodeURIComponent(identifier)}`),
      lastModified: validDate(profile.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }];
  });

  const discussionRoutes: MetadataRoute.Sitemap = (discussionResult.data ?? []).flatMap(discussion => {
    const identifier = discussion.slug?.trim() || discussion.id?.trim();
    if (!identifier) return [];
    return [{
      url: absoluteAppUrl(`/community/thread/${encodeURIComponent(identifier)}`),
      lastModified: validDate(discussion.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }];
  });

  return [...staticRoutes, ...supportRoutes, ...itemRoutes, ...profileRoutes, ...discussionRoutes];
}
