'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageShell, ProductCard, ProductGrid, HubHero, HubSection, EmptyMessage } from '@/components/Ui';
import { browseIndexHref, getProductExperience, type ProductExperience } from '@/lib/experience';
import type { Product } from '@/lib/products';
import type { StoreCategory } from '@/lib/storeRoutes';
import { supabase } from '@/lib/supabase';

const CATEGORY_EXPERIENCE: Partial<Record<StoreCategory, ProductExperience>> = {
  music: 'music',
  books: 'book',
  assets: 'asset',
  merch: 'physical',
};

const CATEGORY_COPY: Record<StoreCategory, { title: string; copy: string; empty: string }> = {
  all: {
    title: 'Store',
    copy: 'Find releases, books, assets, and merch from independent creators.',
    empty: 'No items are published yet.',
  },
  music: {
    title: 'Music',
    copy: 'Explore albums, EPs, singles, and releases built to grow over time.',
    empty: 'No music releases are published yet.',
  },
  books: {
    title: 'Books',
    copy: 'Explore art books, poetry, and stories from independent creators.',
    empty: 'No books are published yet.',
  },
  assets: {
    title: 'Assets',
    copy: 'Explore assets, remix stems, and creative tools for your work.',
    empty: 'No assets are published yet.',
  },
  merch: {
    title: 'Merch',
    copy: 'Explore apparel, accessories, and physical goods from creators.',
    empty: 'No merch is published yet.',
  },
};

export default function StoreApp({ category }: { category: StoreCategory }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');

      const productResult = await supabase
        .from('products')
        .select('*, creators:profiles!author_id(*)')
        .eq('status', 'published')
        .order('sort_order', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(160);

      if (!alive) return;
      if (productResult.error) {
        setError(productResult.error.message);
        setProducts([]);
      } else {
        setProducts((productResult.data ?? []) as Product[]);
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
    const bookProducts = products.filter(product => getProductExperience(product) === 'book').slice(0, 8);
    const apparelProducts = products.filter(product => getProductExperience(product) === 'physical').slice(0, 8);
    const assetProducts = products.filter(product => getProductExperience(product) === 'asset').slice(0, 8);

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
              {musicProducts.length > 0 && (
                <HubSection title="Music" href={browseIndexHref('music')}>
                  <ProductGrid>
                    {musicProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </ProductGrid>
                </HubSection>
              )}
              {bookProducts.length > 0 && (
                <HubSection title="Books" href={browseIndexHref('books')}>
                  <ProductGrid>
                    {bookProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </ProductGrid>
                </HubSection>
              )}
              {apparelProducts.length > 0 && (
                <HubSection title="Merch" href={browseIndexHref('merch')}>
                  <ProductGrid>
                    {apparelProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </ProductGrid>
                </HubSection>
              )}
              {assetProducts.length > 0 && (
                <HubSection title="Assets" href={browseIndexHref('assets')}>
                  <ProductGrid>
                    {assetProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </ProductGrid>
                </HubSection>
              )}
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
