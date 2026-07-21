import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { absoluteAppUrl } from '@/lib/metadata';
import { getMarketingUrl } from '@/lib/siteUrl';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const hostname = (await headers()).get('host')?.split(':', 1)[0]?.toLowerCase();
  const marketingEnabled = process.env.MARKETING_SITE_ENABLED === 'true';
  if (marketingEnabled && (hostname === '44os.com' || hostname === 'www.44os.com')) {
    const marketingUrl = getMarketingUrl();
    return {
      rules: { userAgent: '*', allow: '/', disallow: ['/api', '/download', '/marketing-surface'] },
      sitemap: `${marketingUrl}/sitemap.xml`,
      host: `${marketingUrl}/`,
    };
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/account',
        '/api',
        '/cart',
        '/checkout',
        '/community/new',
        '/conversation',
        '/dashboard',
        '/dev',
        '/inbox',
        '/library',
        '/launch',
        '/login',
        '/notifications',
        '/orders',
        '/profile/edit',
        '/reader',
        '/settings',
        '/studio',
        '/team',
      ],
    },
    sitemap: absoluteAppUrl('/sitemap.xml'),
    host: absoluteAppUrl('/'),
  };
}
