import { cache, type ReactNode } from 'react';
import { absoluteAppUrl, buildPageMetadata, conciseDescription } from '@/lib/metadata';
import { getProductExperience } from '@/lib/experience';
import { supabase } from '@/lib/supabase';
import { LOCAL_MASK_ITEM_ID, localMaskPreviewEnabled, localMaskProduct } from '@/lib/localMaskPreview';

const loadPublicItem = cache(async (identifier: string) => {
  if (localMaskPreviewEnabled && (identifier === LOCAL_MASK_ITEM_ID || identifier.toLowerCase() === 'mask')) {
    return localMaskProduct;
  }
  const key = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(identifier) ? 'id' : 'slug';
  const { data } = await supabase.from('catalog_items')
    .select('id,slug,title,creator,status,item_type,experience_type,fulfillment_type,cover_url,short_description,long_description,release_date,year,creators:profiles!author_id(display_name,username)')
    .eq('status', 'published')
    .eq(key, identifier)
    .maybeSingle();
  return data;
});

function stringifyJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export async function generateMetadata({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  const item = await loadPublicItem(identifier);

  if (!item || item.status !== 'published') {
    return {
      ...buildPageMetadata({
        title: 'Item',
        description: 'Explore independent work on 44OS.',
        path: `/store/item/${identifier}`,
      }),
      robots: { index: false, follow: false },
    };
  }

  const creator = item.creators?.display_name || item.creators?.username || item.creator;
  return buildPageMetadata({
    title: item.title,
    description: conciseDescription(
      item.short_description,
      item.long_description,
      `${item.title}${creator ? ` by ${creator}` : ''} on 44OS.`,
    ),
    path: `/store/item/${item.slug || item.id}`,
    image: item.cover_url,
  });
}

export default async function StoreItemLayout({ children, params }: { children: ReactNode; params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  const item = await loadPublicItem(identifier);
  if (!item || item.status !== 'published') return children;

  const itemUrl = absoluteAppUrl(`/store/item/${item.slug || item.id}`);
  const creator = item.creators?.display_name || item.creators?.username || item.creator;
  const itemType = getProductExperience(item) === 'music'
    ? 'MusicAlbum'
    : getProductExperience(item) === 'book'
      ? 'Book'
      : 'CreativeWork';
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '44OS', item: absoluteAppUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'Discover', item: absoluteAppUrl('/') },
        { '@type': 'ListItem', position: 3, name: item.title, item: itemUrl },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': itemType,
      name: item.title,
      url: itemUrl,
      ...(item.cover_url ? { image: absoluteAppUrl(item.cover_url) } : {}),
      ...(item.short_description || item.long_description ? { description: conciseDescription(item.short_description, item.long_description) } : {}),
      ...(creator ? { creator: { '@type': 'Person', name: creator } } : {}),
      ...(item.release_date ? { datePublished: item.release_date } : item.year ? { datePublished: String(item.year) } : {}),
    },
  ];

  return <>
    {structuredData.map((entry, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: stringifyJsonLd(entry) }} />)}
    {children}
  </>;
}
