import type { MetadataRoute } from 'next';
import { absoluteMetadataUrl } from '@/lib/metadata';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/account',
        '/cart',
        '/checkout',
        '/community/new',
        '/dashboard',
        '/inbox',
        '/library',
        '/notifications',
        '/profile/edit',
        '/settings',
        '/studio',
      ],
    },
    sitemap: absoluteMetadataUrl('/sitemap.xml'),
    host: absoluteMetadataUrl('/'),
  };
}
