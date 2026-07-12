'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageShell, ProductCard, ProductGrid, HubHero, HubSection, EmptyMessage } from '@/components/Ui';
import { browseIndexHref, getProductExperience, type ProductExperience } from '@/lib/experience';
import { comparePublicCatalogProducts, type Product } from '@/lib/products';
import type { StoreCategory } from '@/lib/storeRoutes';
import { useAuth } from '@/lib/useAuth';
import { listPublishedCatalogItems } from '@/lib/domain/catalog';
import { listVisibleLibraryItemIds } from '@/lib/domain/library';

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

type StoreFilter = 'all' | 'music' | 'book' | 'asset' | 'physical';

const STORE_FILTER_LABELS: Record<StoreFilter, string> = {
  all: 'All',
  music: 'Music',
  book: 'Books',
  asset: 'Assets',
  physical: 'Merch',
};

export default function StoreApp({ category, frontDoor = false }: { category: StoreCategory; frontDoor?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StoreFilter>('all');

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const items = await listPublishedCatalogItems(160);
        if (!alive) return;
        setProducts(items);
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load the Store.');
        setProducts([]);
      }
      setLoading(false);
    }

    load();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    if (authLoading) return () => { alive = false; };
    if (!user) {
      Promise.resolve().then(() => {
        if (alive) setOwnedProductIds(new Set());
      });
      return () => { alive = false; };
    }

    void listVisibleLibraryItemIds(user.id)
      .then(itemIds => {
        if (!alive) return;
        setOwnedProductIds(new Set(itemIds));
      });

    return () => { alive = false; };
  }, [authLoading, user]);

  const availableStoreFilters = useMemo(() => {
    const expected = CATEGORY_EXPERIENCE[category] as StoreFilter | undefined;
    return expected ? ['all', expected] as StoreFilter[] : (Object.keys(STORE_FILTER_LABELS) as StoreFilter[]);
  }, [category]);
  const effectiveFilter = availableStoreFilters.includes(activeFilter) ? activeFilter : 'all';

  const visibleProducts = useMemo(() => {
    const expected = CATEGORY_EXPERIENCE[category];
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter(product => {
      const experience = getProductExperience(product);
      if (!['music', 'book', 'asset', 'physical'].includes(experience)) return false;
      if (expected && experience !== expected) return false;
      if (effectiveFilter !== 'all' && experience !== effectiveFilter) return false;
      if (!normalizedQuery) return true;
      const creator = product.creators?.display_name || product.creator || '';
      return `${product.title} ${creator}`.toLowerCase().includes(normalizedQuery);
    }).sort(comparePublicCatalogProducts);
  }, [category, effectiveFilter, products, query]);

  const surfaceName = frontDoor && category === 'all' ? '44OS' : 'Store';
  const storeTools = (
    <div className="page-header-tools">
      {!frontDoor && <label className="page-search-control">
        <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${surfaceName}`} aria-label={`Search ${surfaceName}`} />
      </label>}
      <details className="page-filter-menu">
        <summary className="page-filter-button" aria-label={`Filter ${surfaceName}`} title={`Filter ${surfaceName}`}>
          <span className="page-filter-icon" aria-hidden="true"><i /><i /><i /></span>
        </summary>
        <div className="page-filter-popover">
          {availableStoreFilters.map(filter => (
            <button key={filter} type="button" className={effectiveFilter === filter ? 'page-filter-option page-filter-option-active' : 'page-filter-option'} onClick={event => {
              setActiveFilter(filter);
              event.currentTarget.closest('details')?.removeAttribute('open');
            }}>
              {STORE_FILTER_LABELS[filter]}
            </button>
          ))}
        </div>
      </details>
    </div>
  );

  const copy = CATEGORY_COPY[category];
  const pageTitle = frontDoor && category === 'all' ? '44OS' : copy.title;

  if (category === 'all') {
    const musicProducts = visibleProducts.filter(product => getProductExperience(product) === 'music').slice(0, 8);
    const bookProducts = visibleProducts.filter(product => getProductExperience(product) === 'book').slice(0, 8);
    const apparelProducts = visibleProducts.filter(product => getProductExperience(product) === 'physical').slice(0, 8);
    const assetProducts = visibleProducts.filter(product => getProductExperience(product) === 'asset').slice(0, 8);

    return (
      <PageShell>
        <main className="app-page">
          <HubHero title={pageTitle} copy={copy.copy} actions={storeTools} />
          {loading ? (
            <EmptyMessage>Loading...</EmptyMessage>
          ) : error ? (
            <EmptyMessage>{error}</EmptyMessage>
          ) : visibleProducts.length === 0 ? (
            <EmptyMessage>{query ? 'No Store items match your search.' : 'No Store items match this filter.'}</EmptyMessage>
          ) : (
            <>
              {musicProducts.length > 0 && (
                <HubSection title="Music" href={browseIndexHref('music')}>
                  <ProductGrid>
                    {musicProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
                </HubSection>
              )}
              {bookProducts.length > 0 && (
                <HubSection title="Books" href={browseIndexHref('books')}>
                  <ProductGrid>
                    {bookProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
                </HubSection>
              )}
              {apparelProducts.length > 0 && (
                <HubSection title="Merch" href={browseIndexHref('merch')}>
                  <ProductGrid>
                    {apparelProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
                </HubSection>
              )}
              {assetProducts.length > 0 && (
                <HubSection title="Assets" href={browseIndexHref('assets')}>
                  <ProductGrid>
                    {assetProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
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
        <HubHero title={pageTitle} copy={copy.copy} actions={storeTools} />
        {loading ? (
          <EmptyMessage>Loading...</EmptyMessage>
        ) : error ? (
          <EmptyMessage>{error}</EmptyMessage>
        ) : visibleProducts.length === 0 ? (
          <EmptyMessage>{query ? 'No Store items match your search.' : effectiveFilter === 'all' ? copy.empty : `No ${STORE_FILTER_LABELS[effectiveFilter].toLowerCase()} match this view.`}</EmptyMessage>
        ) : (
          <ProductGrid>
            {visibleProducts.map(product => (
              <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
            ))}
          </ProductGrid>
        )}
      </main>
    </PageShell>
  );
}
