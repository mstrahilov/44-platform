import type { MetadataRoute } from 'next';
import { absoluteMetadataUrl } from '@/lib/metadata';

const PUBLIC_ROUTES = [
  '/',
  '/store',
  '/store/music',
  '/store/books',
  '/store/assets',
  '/store/merch',
  '/community',
  '/community/questions',
  '/community/collaboration',
  '/radio',
  '/search',
  '/support',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((path, index) => ({
    url: absoluteMetadataUrl(path),
    lastModified,
    changeFrequency: index === 0 ? 'daily' : 'weekly',
    priority: index === 0 ? 1 : path === '/store' || path === '/community' || path === '/radio' ? 0.9 : 0.7,
  }));
}
