'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageShell, ProductCard, ProductGrid, HubHero, HubSection, EmptyMessage } from '@/components/Ui';
import { getProductExperience, type ProductExperience } from '@/lib/experience';
import { comparePublicCatalogProducts, type Product } from '@/lib/products';
import type { StoreCategory } from '@/lib/storeRoutes';
import { useAuth } from '@/lib/useAuth';
import { loadStoreDiscoveryCatalog } from '@/lib/domain/catalog';
import { listVisibleLibraryItemIds } from '@/lib/domain/library';
import { storeTagsForExperience } from '@/lib/storeTaxonomy';

const CATEGORY_EXPERIENCE: Partial<Record<StoreCategory, ProductExperience>> = {
  music: 'music',
  books: 'book',
  assets: 'asset',
  merch: 'physical',
};

const CATEGORY_COPY: Record<StoreCategory, { title: string; copy: string; empty: string }> = {
  all: {
    title: 'Browse',
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
    title: 'Apparel',
    copy: 'Explore apparel, accessories, and physical goods from creators.',
    empty: 'No merch is published yet.',
  },
};

type StoreFilter = 'all' | 'music' | 'book' | 'asset' | 'physical';
type PriceFilter = 'all' | 'free' | 'paid';

const STORE_FILTER_LABELS: Record<StoreFilter, string> = {
  all: 'All Categories',
  music: 'Music',
  book: 'Books',
  asset: 'Assets',
  physical: 'Apparel',
};

const STORE_FILTER_ORDER: StoreFilter[] = ['all', 'music', 'book', 'physical', 'asset'];

export default function StoreApp({ category, frontDoor = false }: { category: StoreCategory; frontDoor?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StoreFilter>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [capabilityFilter, setCapabilityFilter] = useState<'all' | 'achievements'>('all');

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const items = await loadStoreDiscoveryCatalog();
        if (!alive) return;
        setProducts(items);
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load Browse.');
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
    return expected ? [expected] : STORE_FILTER_ORDER;
  }, [category]);
  const effectiveFilter = CATEGORY_EXPERIENCE[category] as StoreFilter | undefined
    ?? (availableStoreFilters.includes(activeFilter) ? activeFilter : 'all');
  const selectedTagExperience = CATEGORY_EXPERIENCE[category] ?? (effectiveFilter === 'all' ? null : effectiveFilter);
  const availableTags = useMemo(
    () => storeTagsForExperience(selectedTagExperience),
    [selectedTagExperience],
  );

  const effectiveTagFilter = selectedTagExperience
    && availableTags.some(tag => tag.toLowerCase() === tagFilter.toLowerCase())
    ? tagFilter
    : 'all';

  const visibleProducts = useMemo(() => {
    const expected = CATEGORY_EXPERIENCE[category];
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter(product => {
      const experience = getProductExperience(product);
      if (!['music', 'book', 'asset', 'physical'].includes(experience)) return false;
      if (expected && experience !== expected) return false;
      if (effectiveFilter !== 'all' && experience !== effectiveFilter) return false;
      if (priceFilter === 'free' && !(product.is_free || product.price_cents === 0)) return false;
      if (priceFilter === 'paid' && (product.is_free || product.price_cents === 0)) return false;
      if (effectiveTagFilter !== 'all' && !(product.tags ?? []).some(tag => tag.toLowerCase() === effectiveTagFilter.toLowerCase())) return false;
      if (capabilityFilter !== 'all' && !(product.capability_keys ?? []).includes(capabilityFilter)) return false;
      if (!normalizedQuery) return true;
      const creator = product.creators?.display_name || product.creator || '';
      return `${product.title} ${creator} ${(product.tags ?? []).join(' ')}`.toLowerCase().includes(normalizedQuery);
    }).sort(comparePublicCatalogProducts);
  }, [capabilityFilter, category, effectiveFilter, effectiveTagFilter, priceFilter, products, query]);
  const hasActiveFilters = (category === 'all' && effectiveFilter !== 'all')
    || priceFilter !== 'all'
    || effectiveTagFilter !== 'all'
    || capabilityFilter !== 'all'
    || Boolean(query.trim());

  const surfaceName = 'Browse';
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
          <div className="store-filter-group">
            <span className="store-filter-label">Category</span>
          {availableStoreFilters.map(filter => (
            <button key={filter} type="button" className={effectiveFilter === filter ? 'page-filter-option page-filter-option-active' : 'page-filter-option'} onClick={event => {
              setActiveFilter(filter);
              event.currentTarget.closest('details')?.removeAttribute('open');
            }}>
              {STORE_FILTER_LABELS[filter]}
            </button>
          ))}
          </div>
          <label className="store-filter-group">
            <span className="store-filter-label">Price</span>
            <select className="os-input-field" value={priceFilter} onChange={event => setPriceFilter(event.target.value as PriceFilter)}>
              <option value="all">Any price</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </label>
          {selectedTagExperience && <label className="store-filter-group">
            <span className="store-filter-label">Tag</span>
            <select className="os-input-field" value={effectiveTagFilter} onChange={event => setTagFilter(event.target.value)}>
              <option value="all">Any tag</option>
              {availableTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </label>}
          <label className="store-filter-group">
            <span className="store-filter-label">Features</span>
            <select className="os-input-field" value={capabilityFilter} onChange={event => setCapabilityFilter(event.target.value as 'all' | 'achievements')}>
              <option value="all">Any feature</option>
              <option value="achievements">Achievements</option>
            </select>
          </label>
          {hasActiveFilters && (
            <button type="button" className="page-filter-option" onClick={() => {
              setActiveFilter('all');
              setPriceFilter('all');
              setTagFilter('all');
              setCapabilityFilter('all');
              setQuery('');
            }}>Clear filters</button>
          )}
        </div>
      </details>
    </div>
  );

  const copy = CATEGORY_COPY[category];
  const pageTitle = copy.title;

  if (category === 'all') {
    const featuredProducts = visibleProducts.filter(product => product.featured).slice(0, 8);
    const freeListeningProducts = visibleProducts.filter(product => (
      getProductExperience(product) === 'music' && (product.capability_keys ?? []).includes('streaming')
    )).slice(0, 8);
    const recentProducts = visibleProducts.slice(0, 8);

    return (
      <PageShell>
        <main className="app-page">
          <HubHero title={pageTitle} copy={copy.copy} actions={storeTools} />
          {loading ? (
            <EmptyMessage>Loading...</EmptyMessage>
          ) : error ? (
            <EmptyMessage>{error}</EmptyMessage>
          ) : visibleProducts.length === 0 ? (
            <EmptyMessage>{query ? 'No items match your search.' : 'No items match this filter.'}</EmptyMessage>
          ) : (
            <>
              {featuredProducts.length > 0 && (
                <HubSection title="Featured by 44">
                  <ProductGrid>
                    {featuredProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
                </HubSection>
              )}
              {!hasActiveFilters && freeListeningProducts.length > 0 && (
                <HubSection title="Free to Listen">
                  <ProductGrid>
                    {freeListeningProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
                </HubSection>
              )}
              {!hasActiveFilters && recentProducts.length > 0 && (
                <HubSection title="Recently Released">
                  <ProductGrid>
                    {recentProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
                </HubSection>
              )}
              <HubSection title={hasActiveFilters ? 'Browse' : 'All Items'}>
                  <ProductGrid>
                    {visibleProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
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
        <HubHero title={pageTitle} copy={copy.copy} actions={storeTools} />
        {loading ? (
          <EmptyMessage>Loading...</EmptyMessage>
        ) : error ? (
          <EmptyMessage>{error}</EmptyMessage>
        ) : visibleProducts.length === 0 ? (
          <EmptyMessage>{query ? 'No items match your search.' : effectiveFilter === 'all' ? copy.empty : `No ${STORE_FILTER_LABELS[effectiveFilter].toLowerCase()} match this view.`}</EmptyMessage>
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
