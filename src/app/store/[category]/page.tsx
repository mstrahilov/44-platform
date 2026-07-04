'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/lib/products';
import { PageShell, ProductGrid, ProductCard, HubHero, EmptyMessage, CenteredMessage } from '@/components/Ui';

const CATEGORY_LABEL: Record<string, string> = {
  music: 'Music',
  books: 'Books',
  games: 'Games',
  apparel: 'Apparel',
  merch: 'Merch',
  assets: 'Assets',
};

const CATEGORY_DESCRIPTION: Record<string, string> = {
  music: 'Records, singles, EPs, and albums from independent artists on 44.',
  books: 'Titles from independent writers, publishers, and thinkers.',
  games: 'Indie games, playful software, and interactive experiences.',
  apparel: 'Clothing and wearables from creators building their own brands.',
  merch: 'Clothing and wearables from creators building their own brands.',
  assets: 'Samples, textures, presets, and templates for creators.',
};

function matchesStoreCategory(product: Product, slug: string) {
  const category = (product.category ?? '').toLowerCase();
  if (slug === 'apparel' || slug === 'merch') return category === 'apparel' || category === 'merch';
  return category === slug;
}

function legacyCategoryRedirect(slug: string) {
  if (slug === 'music') return '/music/store';
  if (slug === 'books') return '/books/store';
  if (slug === 'assets') return '/assets/store';
  if (slug === 'apparel' || slug === 'merch') return '/merch/store';
  return '';
}

export default function StoreCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const router = useRouter();
  const legacyRedirect = legacyCategoryRedirect(category.toLowerCase());
  const label = CATEGORY_LABEL[category] ?? (category.charAt(0).toUpperCase() + category.slice(1));
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (legacyRedirect) router.replace(legacyRedirect);
  }, [legacyRedirect, router]);

  useEffect(() => {
    if (legacyRedirect) return;
    async function load() {
      const { data, error } = await supabase
        .from('products')
        .select('*, creators:profiles!author_id(*)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(120);

      if (error) {
        console.error('store/[category] fetch error:', JSON.stringify(error));
        setLoading(false);
        return;
      }

      setProducts((data ?? []) as Product[]);
      setLoading(false);
    }
    load();
  }, [legacyRedirect]);

  const visibleProducts = products.filter(p => matchesStoreCategory(p, category.toLowerCase()));

  const description = CATEGORY_DESCRIPTION[category.toLowerCase()];

  if (legacyRedirect) {
    return <PageShell><CenteredMessage>Opening the new 44OS app...</CenteredMessage></PageShell>;
  }

  return (
    <PageShell>
      <div className="app-page">
        <HubHero title={label} copy={description} />
        {loading ? (
          <EmptyMessage>Loading…</EmptyMessage>
        ) : visibleProducts.length === 0 ? (
          <EmptyMessage>No {label.toLowerCase()} yet. Check back soon for new releases in this category.</EmptyMessage>
        ) : (
          <ProductGrid>
            {visibleProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
        )}
      </div>
    </PageShell>
  );
}
