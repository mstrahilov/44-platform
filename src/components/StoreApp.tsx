'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageShell, ProductCard, ProductGrid, HubHero, HubSection, EmptyMessage } from '@/components/Ui';
import { useTopbarTabs } from '@/components/TopbarContext';
import { getProductExperience, type ProductExperience } from '@/lib/experience';
import type { Product } from '@/lib/products';
import type { StoreCategory } from '@/lib/storeRoutes';
import { supabase } from '@/lib/supabase';

const STORE_TABS: Array<{ id: StoreCategory; label: string; href: string }> = [
  { id: 'all', label: 'All', href: '/store' },
  { id: 'music', label: 'Music', href: '/store/music' },
  { id: 'books', label: 'Books', href: '/store/books' },
  { id: 'assets', label: 'Assets', href: '/store/assets' },
  { id: 'merch', label: 'Merch', href: '/store/merch' },
];

const CATEGORY_EXPERIENCE: Partial<Record<StoreCategory, ProductExperience>> = {
  music: 'music',
  books: 'book',
  assets: 'asset',
  merch: 'physical',
};

const CATEGORY_COPY: Record<StoreCategory, { title: string; copy: string; empty: string }> = {
  all: {
    title: 'Store',
    copy: 'Browse music, books, assets, and merch from creators on 44.',
    empty: 'No items are published yet.',
  },
  music: {
    title: 'Music',
    copy: 'Stream releases for free. Buying music unlocks downloads.',
    empty: 'No music releases are published yet.',
  },
  books: {
    title: 'Books',
    copy: 'Digital books, lyric books, novels, and artbooks from creators on 44.',
    empty: 'No books are published yet.',
  },
  assets: {
    title: 'Assets',
    copy: 'Sample packs, remix stems, templates, presets, and creative tools.',
    empty: 'No assets are published yet.',
  },
  merch: {
    title: 'Merch',
    copy: 'Physical goods from creators and 44.',
    empty: 'No merch is published yet.',
  },
};

export default function StoreApp({ category }: { category: StoreCategory }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useTopbarTabs(STORE_TABS.map(tab => ({ ...tab, active: tab.id === category })));

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*, creators:profiles!author_id(*)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(160);

      if (!alive) return;
      if (fetchError) {
        setError(fetchError.message);
        setProducts([]);
      } else {
        setProducts((data ?? []) as Product[]);
      }
      setLoading(false);
    }

    load();
    return () => { alive = false; };
  }, []);

  const visibleProducts = useMemo(() => {
    const expected = CATEGORY_EXPERIENCE[category];
    if (!expected) {
      return products.filter(product => ['music', 'book', 'asset', 'physical'].includes(getProductExperience(product)));
    }
    return products.filter(product => getProductExperience(product) === expected);
  }, [category, products]);

  const copy = CATEGORY_COPY[category];

  if (category === 'all') {
    const musicProducts = products.filter(product => getProductExperience(product) === 'music').slice(0, 8);
    const apparelProducts = products.filter(product => getProductExperience(product) === 'physical').slice(0, 8);

    return (
      <PageShell>
        <main className="app-page">
          <HubHero title={copy.title} copy={copy.copy} />
          {loading ? (
            <EmptyMessage>Loading...</EmptyMessage>
          ) : error ? (
            <EmptyMessage>{error}</EmptyMessage>
          ) : (
            <>
              <HubSection title="Explore Music" href="/store/music">
                {musicProducts.length === 0 ? (
                  <EmptyMessage>No music releases are published yet.</EmptyMessage>
                ) : (
                  <ProductGrid>
                    {musicProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </ProductGrid>
                )}
              </HubSection>
              <HubSection title="Explore Apparel" href="/store/merch">
                {apparelProducts.length === 0 ? (
                  <EmptyMessage>No merch is published yet.</EmptyMessage>
                ) : (
                  <ProductGrid>
                    {apparelProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </ProductGrid>
                )}
              </HubSection>
            </>
          )}
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="app-page">
        <HubHero title={copy.title} copy={copy.copy} />
        {loading ? (
          <EmptyMessage>Loading...</EmptyMessage>
        ) : error ? (
          <EmptyMessage>{error}</EmptyMessage>
        ) : visibleProducts.length === 0 ? (
          <EmptyMessage>{copy.empty}</EmptyMessage>
        ) : (
          <ProductGrid>
            {visibleProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
        )}
      </main>
    </PageShell>
  );
}
