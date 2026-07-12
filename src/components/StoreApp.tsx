'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageShell, ProductCard, ProductGrid, HubHero, HubSection, EmptyMessage } from '@/components/Ui';
import { getProductExperience, type ProductExperience } from '@/lib/experience';
import { comparePublicCatalogProducts, type Product } from '@/lib/products';
import type { StoreCategory } from '@/lib/storeRoutes';
import { useAuth } from '@/lib/useAuth';
import { loadStoreDiscoveryCatalog } from '@/lib/domain/catalog';
import { listVisibleLibraryItemIds } from '@/lib/domain/library';
import { itemMatchesStoreType } from '@/lib/storeTaxonomy';
import { listFollowedProfileIds } from '@/lib/domain/community';

const CATEGORY_EXPERIENCE: Partial<Record<StoreCategory, ProductExperience>> = {
  music: 'music',
  books: 'book',
  assets: 'asset',
  merch: 'physical',
  games: 'interactive',
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
  games: {
    title: 'Games',
    copy: 'Explore games and interactive releases from independent creators.',
    empty: 'No games are published yet.',
  },
  merch: {
    title: 'Merch',
    copy: 'Explore apparel, accessories, and physical goods from creators.',
    empty: 'No merch is published yet.',
  },
};

type StoreFilter = 'all' | 'music' | 'book' | 'interactive' | 'asset' | 'physical';
type PriceFilter = 'all' | 'free' | 'paid';

const STORE_FILTER_LABELS: Record<StoreFilter, string> = {
  all: 'All Categories',
  music: 'Music',
  book: 'Books',
  asset: 'Assets',
  physical: 'Merch',
  interactive: 'Games',
};

const STORE_FILTER_ORDER: StoreFilter[] = ['all', 'music', 'book', 'interactive', 'physical', 'asset'];

export default function StoreApp({ category, frontDoor = false }: { category: StoreCategory; frontDoor?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(new Set());
  const [followedProfileIds, setFollowedProfileIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StoreFilter>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
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
        if (alive) setFollowedProfileIds(new Set());
      });
      return () => { alive = false; };
    }

    void Promise.all([listVisibleLibraryItemIds(user.id), listFollowedProfileIds(user.id)])
      .then(([itemIds, followedIds]) => {
        if (!alive) return;
        setOwnedProductIds(new Set(itemIds));
        setFollowedProfileIds(new Set(followedIds));
      });

    return () => { alive = false; };
  }, [authLoading, user]);

  const availableStoreFilters = useMemo(() => {
    const expected = CATEGORY_EXPERIENCE[category] as StoreFilter | undefined;
    return expected ? [expected] : STORE_FILTER_ORDER.filter(filter => (
      filter === 'all' || products.some(product => getProductExperience(product) === filter)
    ));
  }, [category, products]);
  const effectiveFilter = CATEGORY_EXPERIENCE[category] as StoreFilter | undefined
    ?? (availableStoreFilters.includes(activeFilter) ? activeFilter : 'all');
  const selectedExperience = CATEGORY_EXPERIENCE[category] ?? (effectiveFilter === 'all' ? null : effectiveFilter);
  const availableTypes = useMemo(
    () => Array.from(new Set(products
      .filter(product => getProductExperience(product) === selectedExperience)
      .flatMap(product => product.browse_type?.label ? [product.browse_type.label] : []),
    )).sort((a, b) => a.localeCompare(b)),
    [products, selectedExperience],
  );
  const effectiveTypeFilter = selectedExperience
    && availableTypes.some(type => type.toLowerCase() === typeFilter.toLowerCase())
    ? typeFilter
    : 'all';
  const availableTags = useMemo(() => {
    if (!selectedExperience) return [];
    return Array.from(new Set(products
      .filter(product => getProductExperience(product) === selectedExperience && (effectiveTypeFilter === 'all' || itemMatchesStoreType(product, effectiveTypeFilter)))
      .flatMap(product => (product.browse_tags ?? []).map(tag => tag.label))
    )).sort((a, b) => a.localeCompare(b));
  }, [effectiveTypeFilter, products, selectedExperience]);
  const effectiveTagFilter = selectedExperience
    && availableTags.some(tag => tag.toLowerCase() === tagFilter.toLowerCase())
    ? tagFilter
    : 'all';

  const visibleProducts = useMemo(() => {
    const expected = CATEGORY_EXPERIENCE[category];
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter(product => {
      const experience = getProductExperience(product);
      if (!['music', 'book', 'interactive', 'asset', 'physical'].includes(experience)) return false;
      if (expected && experience !== expected) return false;
      if (effectiveFilter !== 'all' && experience !== effectiveFilter) return false;
      if (effectiveTypeFilter !== 'all' && !itemMatchesStoreType(product, effectiveTypeFilter)) return false;
      if (priceFilter === 'free' && !(product.is_free || product.price_cents === 0)) return false;
      if (priceFilter === 'paid' && (product.is_free || product.price_cents === 0)) return false;
      if (effectiveTagFilter !== 'all' && !(product.browse_tags ?? []).some(tag => tag.label.toLowerCase() === effectiveTagFilter.toLowerCase())) return false;
      if (capabilityFilter !== 'all' && !(product.capability_keys ?? []).includes(capabilityFilter)) return false;
      if (!normalizedQuery) return true;
      const creator = product.creators?.display_name || product.creator || '';
      const taxonomy = [product.browse_type?.label, ...(product.browse_tags ?? []).map(tag => tag.label)].filter(Boolean).join(' ');
      return `${product.title} ${creator} ${taxonomy}`.toLowerCase().includes(normalizedQuery);
    }).sort(comparePublicCatalogProducts);
  }, [capabilityFilter, category, effectiveFilter, effectiveTagFilter, effectiveTypeFilter, priceFilter, products, query]);
  const hasActiveFilters = (category === 'all' && effectiveFilter !== 'all')
    || priceFilter !== 'all'
    || effectiveTypeFilter !== 'all'
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
              setTypeFilter('all');
              setTagFilter('all');
              event.currentTarget.closest('details')?.removeAttribute('open');
            }}>
              {STORE_FILTER_LABELS[filter]}
            </button>
          ))}
          </div>
          {selectedExperience && <label className="store-filter-group">
            <span className="store-filter-label">Type</span>
            <select className="os-input-field" value={effectiveTypeFilter} onChange={event => {
              setTypeFilter(event.target.value);
              setTagFilter('all');
            }}>
              <option value="all">Any type</option>
              {availableTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>}
          {availableTags.length > 0 && <label className="store-filter-group">
            <span className="store-filter-label">Tags</span>
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
          <label className="store-filter-group">
            <span className="store-filter-label">Price</span>
            <select className="os-input-field" value={priceFilter} onChange={event => setPriceFilter(event.target.value as PriceFilter)}>
              <option value="all">Any price</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </label>
          {hasActiveFilters && (
            <button type="button" className="page-filter-option" onClick={() => {
              setActiveFilter('all');
              setPriceFilter('all');
              setTypeFilter('all');
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

  function browseCategory(filter: StoreFilter) {
    setActiveFilter(filter);
    setTypeFilter('all');
    setTagFilter('all');
    setCapabilityFilter('all');
    setPriceFilter('all');
    setQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (category === 'all') {
    const featuredProducts = products.filter(product => product.featured).sort(comparePublicCatalogProducts).slice(0, 4);
    const followingProducts = products.filter(product => product.author_id && followedProfileIds.has(product.author_id)).sort(comparePublicCatalogProducts).slice(0, 8);
    const categoryShelves = STORE_FILTER_ORDER
      .filter((filter): filter is Exclude<StoreFilter, 'all'> => filter !== 'all')
      .map(filter => ({
        filter,
        title: `New Releases in ${STORE_FILTER_LABELS[filter]}`,
        products: products.filter(product => getProductExperience(product) === filter).sort(comparePublicCatalogProducts).slice(0, 8),
      }))
      .filter(shelf => shelf.products.length > 0);

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
              {hasActiveFilters ? (
                <HubSection title="Browse">
                  <ProductGrid>
                    {visibleProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
                </HubSection>
              ) : <>
                {featuredProducts.length > 0 && (
                <HubSection title="Featured">
                  <ProductGrid>
                    {featuredProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
                </HubSection>
                )}
                {followingProducts.length > 0 && (
                <HubSection title="Creators You Follow">
                  <ProductGrid>
                    {followingProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
                </HubSection>
                )}
                {categoryShelves.map(shelf => (
              <HubSection
                key={shelf.filter}
                title={shelf.title}
                action={<button type="button" className="os-button os-button-primary" onClick={() => browseCategory(shelf.filter)}>View All</button>}
              >
                  <ProductGrid>
                    {shelf.products.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
              </HubSection>
                ))}
              </>}
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
