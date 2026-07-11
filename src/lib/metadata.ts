import type { Metadata } from 'next';

const DEFAULT_SITE_URL = 'https://44os.com';
const DEFAULT_TITLE = '44OS';
const DEFAULT_DESCRIPTION = 'A creative operating system to discover, collect, create, and connect through independent music, books, art, community, and radio.';
const DEFAULT_OG_IMAGE = '/og.png';

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function getMetadataBaseUrl() {
  return stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL);
}

export function absoluteMetadataUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getMetadataBaseUrl()}${normalizedPath}`;
}

export function buildPageMetadata({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  type = 'website',
}: {
  title?: string;
  description?: string;
  path?: string;
  image?: string | null;
  type?: 'website' | 'profile';
} = {}): Metadata {
  const url = absoluteMetadataUrl(path);
  const imageUrl = absoluteMetadataUrl(image || DEFAULT_OG_IMAGE);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: DEFAULT_TITLE,
      type,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export function conciseDescription(...candidates: Array<string | null | undefined>) {
  const value = candidates.find(candidate => candidate && candidate.trim().length > 0)?.trim();
  if (!value) return DEFAULT_DESCRIPTION;
  return value.length > 160 ? `${value.slice(0, 157).trimEnd()}...` : value;
}
