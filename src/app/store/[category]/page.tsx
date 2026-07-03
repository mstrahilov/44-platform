'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/lib/products';
import { PageShell, ProductGrid, ProductCard, HubHero, EmptyMessage } from '@/components/Ui';
import { useTopbarTabs } from '@/components/TopbarContext';

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

const STORE_CATEGORIES = [
  { id: 'music', label: 'Music', href: '/store/music' },
  { id: 'apparel', label: 'Apparel', href: '/store/apparel' },
  { id: 'books', label: 'Books', href: '/store/books' },
  { id: 'games', label: 'Games', href: '/store/games' },
  { id: 'assets', label: 'Assets', href: '/store/assets' },
];

export default function StoreCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const label = CATEGORY_LABEL[category] ?? (category.charAt(0).toUpperCase() + category.slice(1));
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useTopbarTabs([
    { id: 'all', label: 'All', href: '/' },
    ...STORE_CATEGORIES.map(c => ({ ...c, active: c.id === category.toLowerCase() })),
  ]);

  useEffect(() => {
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

      const all = (data ?? []) as Product[];
      const filtered = all.filter(p => (p.category ?? '').toLowerCase() === category.toLowerCase());
      setProducts(filtered);
      setLoading(false);
    }
    load();
  }, [category]);

  const description = CATEGORY_DESCRIPTION[category.toLowerCase()];

  return (
    <PageShell>
      <div className="app-page">
        <HubHero title={label} copy={description} />
        {loading ? (
          <EmptyMessage>Loading…</EmptyMessage>
        ) : products.length === 0 ? (
          <EmptyMessage>No {label.toLowerCase()} yet. Check back soon for new releases in this category.</EmptyMessage>
        ) : (
          <ProductGrid>
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
        )}
      </div>
    </PageShell>
  );
}
