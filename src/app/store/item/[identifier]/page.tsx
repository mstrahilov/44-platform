import { ProductStoreDetail } from '@/app/product/[id]/page';
import { buildPageMetadata, conciseDescription } from '@/lib/metadata';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/lib/products';

export async function generateMetadata({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  const query = supabase.from('products').select('*, creators:profiles!author_id(*)');
  const { data } = await (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
    ? query.eq('id', identifier)
    : query.eq('slug', identifier)
  ).maybeSingle();
  const product = data as Product | null;
  if (!product) {
    return buildPageMetadata({
      title: 'Store Item',
      description: 'View independent creative work on 44OS.',
      path: `/store/item/${identifier}`,
    });
  }

  const creatorName = product.creators?.display_name || product.creator || '44 Creator';
  return buildPageMetadata({
    title: `${product.title} by ${creatorName}`,
    description: conciseDescription(product.short_description, product.long_description, `${product.title} by ${creatorName} on 44OS.`),
    path: `/store/item/${product.slug || product.id}`,
    image: product.hero_url || product.cover_url || null,
  });
}

export default async function StoreItemPage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  return <ProductStoreDetail identifier={identifier} backHref="/store" backLabel="Store" />;
}
