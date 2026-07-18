import type { MetadataRoute } from 'next';
import { absoluteMetadataUrl } from '@/lib/metadata';

export default function robots(): MetadataRoute.Robots {
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
      ],
    },
    sitemap: absoluteMetadataUrl('/sitemap.xml'),
    host: absoluteMetadataUrl('/'),
  };
}
