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
import { FilterPopover } from '@/components/FilterPopover';

const CATEGORY_EXPERIENCE: Partial<Record<StoreCategory, ProductExperience>> = {
  music: 'music',
  books: 'book',
  assets: 'asset',
  merch: 'physical',
  games: 'interactive',
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

const STORE_FILTER_ORDER: StoreFilter[] = ['all', 'music', 'physical', 'book', 'asset', 'interactive'];

function creatorFilterKey(product: Product) {
  return product.author_id || product.creators?.id || product.creator;
}

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
  const [creatorFilter, setCreatorFilter] = useState('all');

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
  const availableCreators = useMemo(() => {
    const creators = new Map<string, string>();
    products
      .filter(product => {
        const experience = getProductExperience(product);
        if (selectedExperience && experience !== selectedExperience) return false;
        if (effectiveTypeFilter !== 'all' && !itemMatchesStoreType(product, effectiveTypeFilter)) return false;
        if (effectiveTagFilter !== 'all' && !(product.browse_tags ?? []).some(tag => tag.label.toLowerCase() === effectiveTagFilter.toLowerCase())) return false;
        return true;
      })
      .forEach(product => creators.set(
        creatorFilterKey(product),
        product.creators?.display_name || product.creators?.username || product.creator,
      ));
    return Array.from(creators, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [effectiveTagFilter, effectiveTypeFilter, products, selectedExperience]);
  const effectiveCreatorFilter = creatorFilter === 'following' && followedProfileIds.size > 0
    ? 'following'
    : availableCreators.some(creator => creator.id === creatorFilter) ? creatorFilter : 'all';

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
      if (effectiveCreatorFilter === 'following' && !(product.author_id && followedProfileIds.has(product.author_id))) return false;
      if (effectiveCreatorFilter !== 'all' && effectiveCreatorFilter !== 'following' && creatorFilterKey(product) !== effectiveCreatorFilter) return false;
      if (!normalizedQuery) return true;
      const creator = product.creators?.display_name || product.creator || '';
      const taxonomy = [product.browse_type?.label, ...(product.browse_tags ?? []).map(tag => tag.label)].filter(Boolean).join(' ');
      return `${product.title} ${creator} ${taxonomy}`.toLowerCase().includes(normalizedQuery);
    }).sort(comparePublicCatalogProducts);
  }, [capabilityFilter, category, effectiveCreatorFilter, effectiveFilter, effectiveTagFilter, effectiveTypeFilter, followedProfileIds, priceFilter, products, query]);
  const hasActiveFilters = (category === 'all' && effectiveFilter !== 'all')
    || priceFilter !== 'all'
    || effectiveTypeFilter !== 'all'
    || effectiveTagFilter !== 'all'
    || capabilityFilter !== 'all'
    || effectiveCreatorFilter !== 'all'
    || Boolean(query.trim());

  const surfaceName = hasActiveFilters ? 'Browse' : 'Store';
  const activeFilterChips = [
    effectiveTagFilter !== 'all' ? { id: 'tag', label: effectiveTagFilter, clear: () => setTagFilter('all') } : null,
    effectiveTypeFilter !== 'all' ? { id: 'type', label: effectiveTypeFilter, clear: () => { setTypeFilter('all'); setTagFilter('all'); } } : null,
    category === 'all' && effectiveFilter !== 'all' ? { id: 'category', label: STORE_FILTER_LABELS[effectiveFilter], clear: () => { setActiveFilter('all'); setTypeFilter('all'); setTagFilter('all'); } } : null,
    effectiveCreatorFilter !== 'all' ? { id: 'creator', label: effectiveCreatorFilter === 'following' ? 'Creators You Follow' : availableCreators.find(creator => creator.id === effectiveCreatorFilter)?.label || 'Creator', clear: () => setCreatorFilter('all') } : null,
    capabilityFilter !== 'all' ? { id: 'feature', label: 'Achievements', clear: () => setCapabilityFilter('all') } : null,
    priceFilter !== 'all' ? { id: 'price', label: priceFilter === 'free' ? 'Free' : 'Paid', clear: () => setPriceFilter('all') } : null,
  ].filter((chip): chip is { id: string; label: string; clear: () => void } => Boolean(chip));
  const renderActiveFilters = (className: string) => activeFilterChips.length > 0 ? (
    <div className={`store-active-filters ${className}`} aria-label="Active filters">
      {activeFilterChips.map(chip => (
        <span key={chip.id} className="tag-select-pill">
          <span className="tag-select-pill-label">{chip.label}</span>
          <button type="button" aria-label={`Remove ${chip.label} filter`} onClick={chip.clear}>×</button>
        </span>
      ))}
    </div>
  ) : null;
  const storeTools = (
    <div className="page-header-tools">
      {!frontDoor && <label className="page-search-control">
        <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${surfaceName}`} aria-label={`Search ${surfaceName}`} />
      </label>}
      {renderActiveFilters('store-active-filters-header')}
      <FilterPopover label={`Filter ${surfaceName}`}>
        {() => <>
          <label className="store-filter-group">
            <span className="store-filter-label">Category</span>
            <select className="os-input-field" value={effectiveFilter} onChange={event => {
              setActiveFilter(event.target.value as StoreFilter);
              setTypeFilter('all');
              setTagFilter('all');
              setCreatorFilter('all');
            }}>
              {availableStoreFilters.map(filter => <option key={filter} value={filter}>{STORE_FILTER_LABELS[filter]}</option>)}
            </select>
          </label>
          {selectedExperience && <label className="store-filter-group">
            <span className="store-filter-label">Type</span>
            <select className="os-input-field" value={effectiveTypeFilter} onChange={event => {
              setTypeFilter(event.target.value);
              setTagFilter('all');
              setCreatorFilter('all');
            }}>
              <option value="all">Any type</option>
              {availableTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>}
          {availableTags.length > 0 && <label className="store-filter-group">
            <span className="store-filter-label">Tags</span>
            <select className="os-input-field" value={effectiveTagFilter} onChange={event => { setTagFilter(event.target.value); setCreatorFilter('all'); }}>
              <option value="all">Any tag</option>
              {availableTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </label>}
          <label className="store-filter-group">
            <span className="store-filter-label">Creator</span>
            <select className="os-input-field" value={effectiveCreatorFilter} onChange={event => setCreatorFilter(event.target.value)}>
              <option value="all">Any creator</option>
              {availableCreators.map(creator => <option key={creator.id} value={creator.id}>{creator.label}</option>)}
            </select>
          </label>
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
              setCreatorFilter('all');
              setQuery('');
            }}><span className="store-clear-filters">Clear filters</span></button>
          )}
        </>}
      </FilterPopover>
    </div>
  );

  const copy = CATEGORY_COPY[category];
  const pageTitle = category === 'all' && hasActiveFilters ? 'Browse' : copy.title;
  const storeHeader = (
    <div className="store-browse-header">
      <HubHero title={pageTitle} copy={copy.copy} actions={storeTools} />
      {renderActiveFilters('store-active-filters-mobile')}
    </div>
  );

  function browseCategory(filter: StoreFilter) {
    setActiveFilter(filter);
    setTypeFilter('all');
    setTagFilter('all');
    setCapabilityFilter('all');
    setCreatorFilter('all');
    setPriceFilter('all');
    setQuery('');
    document.querySelector<HTMLElement>('.app-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function browseFollowedCreators() {
    setActiveFilter('all');
    setTypeFilter('all');
    setTagFilter('all');
    setCapabilityFilter('all');
    setPriceFilter('all');
    setCreatorFilter('following');
    setQuery('');
    document.querySelector<HTMLElement>('.app-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (category === 'all') {
    const featuredProducts = products.filter(product => product.featured).sort(comparePublicCatalogProducts).slice(0, 4);
    const followingProducts = products.filter(product => product.author_id && followedProfileIds.has(product.author_id)).sort(comparePublicCatalogProducts).slice(0, 8);
    const categoryShelves = STORE_FILTER_ORDER
      .filter((filter): filter is Exclude<StoreFilter, 'all'> => filter !== 'all')
      .map(filter => ({
        filter,
        title: `New in ${STORE_FILTER_LABELS[filter]}`,
        products: products.filter(product => getProductExperience(product) === filter).sort(comparePublicCatalogProducts).slice(0, 8),
      }))
      .filter(shelf => shelf.products.length > 0);

    return (
      <PageShell>
        <main className="app-page">
          {storeHeader}
          {loading ? (
            <EmptyMessage>Loading...</EmptyMessage>
          ) : error ? (
            <EmptyMessage>{error}</EmptyMessage>
          ) : visibleProducts.length === 0 ? (
            <EmptyMessage>{query ? 'No items match your search.' : 'No items match this filter.'}</EmptyMessage>
          ) : (
            <>
              {hasActiveFilters ? (
                <ProductGrid>
                  {visibleProducts.map(product => (
                    <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                  ))}
                </ProductGrid>
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
                {categoryShelves.map(shelf => (
              <HubSection
                key={shelf.filter}
                title={shelf.title}
                action={<button type="button" className="os-button os-button-primary store-shelf-action" aria-label={`View all ${shelf.title}`} onClick={() => browseCategory(shelf.filter)}><span className="store-shelf-action-label">View All</span><span className="store-shelf-action-chevron" aria-hidden="true" /></button>}
              >
                  <ProductGrid>
                    {shelf.products.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
              </HubSection>
                ))}
                {followingProducts.length > 0 && (
                <HubSection title="Creators You Follow" action={<button type="button" className="os-button os-button-primary store-shelf-action" aria-label="View all from creators you follow" onClick={browseFollowedCreators}><span className="store-shelf-action-label">View All</span><span className="store-shelf-action-chevron" aria-hidden="true" /></button>}>
                  <ProductGrid>
                    {followingProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
                </HubSection>
                )}
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
        {storeHeader}
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
