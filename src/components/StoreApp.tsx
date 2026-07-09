'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageShell, ProductCard, ProductGrid, HubHero, HubSection, EmptyMessage, ServiceCard } from '@/components/Ui';
import { useTopbarTabs } from '@/components/TopbarContext';
import { getProductExperience, type ProductExperience } from '@/lib/experience';
import type { Service } from '@/lib/platform';
import type { Product } from '@/lib/products';
import type { StoreCategory } from '@/lib/storeRoutes';
import { supabase } from '@/lib/supabase';

const STORE_TABS: Array<{ id: StoreCategory | 'services'; label: string; href: string }> = [
  { id: 'all', label: 'Discover', href: '/' },
  { id: 'music', label: 'Music', href: '/store/music' },
  { id: 'books', label: 'Books', href: '/store/books' },
  { id: 'merch', label: 'Merch', href: '/store/merch' },
  { id: 'assets', label: 'Sample Packs', href: '/store/assets' },
  { id: 'services', label: 'Services', href: '/services' },
];

const CATEGORY_EXPERIENCE: Partial<Record<StoreCategory, ProductExperience>> = {
  music: 'music',
  books: 'book',
  assets: 'asset',
  merch: 'physical',
};

const CATEGORY_COPY: Record<StoreCategory, { title: string; copy: string; empty: string }> = {
  all: {
    title: 'Discover',
    copy: 'Discover music, books, sample packs, merch, and services on 44.',
    empty: 'No items are published yet.',
  },
  music: {
    title: 'Music',
    copy: 'Explore the latest music releases from our community.',
    empty: 'No music releases are published yet.',
  },
  books: {
    title: 'Books',
    copy: 'Explore art books, poetry, and short stories from our community.',
    empty: 'No books are published yet.',
  },
  assets: {
    title: 'Sample Packs',
    copy: 'Explore sample packs, remix stems, and other creative tools from our community.',
    empty: 'No sample packs are published yet.',
  },
  merch: {
    title: 'Merch',
    copy: 'Explore apparel, accessories and other goods from our community.',
    empty: 'No merch is published yet.',
  },
};

export default function StoreApp({ category }: { category: StoreCategory }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useTopbarTabs(STORE_TABS.map(tab => ({ ...tab, active: tab.id === category })));

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');

      const [productResult, serviceResult] = await Promise.all([
        supabase
          .from('products')
          .select('*, creators:profiles!author_id(*)')
          .eq('is_published', true)
          .order('sort_order', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(160),
        supabase
          .from('services')
          .select('*, creators:profiles!author_id(*, name:display_name), categories(id, slug, name)')
          .or('status.eq.published,is_published.eq.true')
          .order('created_at', { ascending: false })
          .limit(160),
      ]);

      if (!alive) return;
      if (productResult.error) {
        setError(productResult.error.message);
        setProducts([]);
        setServices([]);
      } else {
        setProducts((productResult.data ?? []) as Product[]);
        setServices((serviceResult.data ?? []) as Service[]);
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
    const visibleServices = services.slice(0, 8);

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
                <HubSection title="Explore Music" href="/store/music">
                  <ProductGrid>
                    {musicProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </ProductGrid>
                </HubSection>
              )}
              {bookProducts.length > 0 && (
                <HubSection title="Explore Books" href="/store/books">
                  <ProductGrid>
                    {bookProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </ProductGrid>
                </HubSection>
              )}
              {apparelProducts.length > 0 && (
                <HubSection title="Explore Merch" href="/store/merch">
                  <ProductGrid>
                    {apparelProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </ProductGrid>
                </HubSection>
              )}
              {assetProducts.length > 0 && (
                <HubSection title="Explore Sample Packs" href="/store/assets">
                  <ProductGrid>
                    {assetProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </ProductGrid>
                </HubSection>
              )}
              {visibleServices.length > 0 && (
                <HubSection title="Explore Services" href="/services">
                  <div className="app-grid">
                    {visibleServices.map(service => (
                      <ServiceCard key={service.id} service={service} />
                    ))}
                  </div>
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
