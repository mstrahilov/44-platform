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
import { Ui44SectionArrow } from '@/components/ui44/Controls';
import { Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';
import { beatReviewSurfacesEnabled } from '@/lib/domain/beats';
import { listHomeFeaturedItemIds } from '@/lib/domain/homeDiscovery';

const CATEGORY_EXPERIENCE: Partial<Record<StoreCategory, ProductExperience>> = {
  music: 'music',
  books: 'book',
  'sample-packs': 'asset',
  merch: 'physical',
  games: 'interactive',
};

const CATEGORY_COPY: Record<StoreCategory, { title: string; copy: string; empty: string }> = {
  all: {
    title: 'Store',
    copy: 'Find releases, books, sample packs, and merch from independent creators.',
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
  'sample-packs': {
    title: 'Sample Packs',
    copy: 'Explore downloadable sample packs from independent creators.',
    empty: 'No sample packs are published yet.',
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
type StoreSort = 'release-date' | 'recently-added';

const STORE_FILTER_LABELS: Record<StoreFilter, string> = {
  all: 'All Categories',
  music: 'Music',
  book: 'Books',
  asset: 'Sample Packs',
  physical: 'Merch',
  interactive: 'Games',
};

const STORE_FILTER_ORDER: StoreFilter[] = ['all', 'music', 'physical', 'book', 'asset', 'interactive'];
const HOME_BROWSE_SHELF_ORDER: Array<Exclude<StoreFilter, 'all' | 'music'>> = ['book', 'asset', 'physical', 'interactive'];

const HOME_BROWSE_SHELF_TITLES: Record<Exclude<StoreFilter, 'all' | 'music'>, string> = {
  book: 'Browse Books',
  asset: 'Browse Sample Packs',
  physical: 'Browse Merch',
  interactive: 'Browse Games',
};

function creatorFilterKey(product: Product) {
  return product.author_id || product.creators?.id || product.creator;
}

function isBeatProduct(product: Product) {
  return product.browse_type?.slug === 'beat' || product.capability_keys?.includes('beat_licensing') || Boolean(product.beat);
}

function compareRecentlyAddedProducts(a: Product, b: Product) {
  const createdAtDifference = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  return createdAtDifference || a.id.localeCompare(b.id);
}

function keepNewestProductPerCreator(products: Product[], avoidedProductIds = new Set<string>()) {
  const productsByCreator = new Map<string, Product[]>();
  products.forEach(product => {
    const creatorId = creatorFilterKey(product);
    productsByCreator.set(creatorId, [...(productsByCreator.get(creatorId) ?? []), product]);
  });
  return Array.from(productsByCreator.values()).map(creatorProducts => (
    creatorProducts.find(product => !avoidedProductIds.has(product.id)) ?? creatorProducts[0]
  ));
}

function buildRecentlyAddedProducts(products: Product[], featuredProductIds: Set<string>, limit: number) {
  return products
    .filter(product => !featuredProductIds.has(product.id))
    .slice(0, limit);
}

export default function StoreApp({ category, frontDoor = false }: { category: StoreCategory; frontDoor?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredItemIds, setFeaturedItemIds] = useState<string[] | null>(null);
  const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(new Set());
  const [followedProfileIds, setFollowedProfileIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StoreFilter>('all');
  const [sortBy, setSortBy] = useState<StoreSort>('release-date');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [urlFilterReady, setUrlFilterReady] = useState(false);
  const [tagFilter, setTagFilter] = useState('all');
  const [capabilityFilter, setCapabilityFilter] = useState<'all' | 'achievements'>('all');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [beatBpmMin, setBeatBpmMin] = useState('');
  const [beatBpmMax, setBeatBpmMax] = useState('');
  const [beatKey, setBeatKey] = useState('all');
  const [beatMood, setBeatMood] = useState('all');
  const [beatInstrument, setBeatInstrument] = useState('all');
  const [beatTier, setBeatTier] = useState('all');

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');

      if (authLoading) return;
      try {
        const [items, nextFeaturedItemIds] = await Promise.all([
          loadStoreDiscoveryCatalog(200, user?.id),
          listHomeFeaturedItemIds(),
        ]);
        if (!alive) return;
        setProducts(items);
        setFeaturedItemIds(nextFeaturedItemIds);
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load Browse.');
        setProducts([]);
      }
      setLoading(false);
    }

    load();
    return () => { alive = false; };
  }, [authLoading, user?.id]);

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

  useEffect(() => {
    let alive = true;
    if (typeof window === 'undefined') return;
    const requestedType = beatReviewSurfacesEnabled && category === 'music'
      ? new URLSearchParams(window.location.search).get('type') || 'all'
      : 'all';
    Promise.resolve().then(() => {
      if (!alive) return;
      setTypeFilter(requestedType);
      setUrlFilterReady(true);
    });
    return () => { alive = false; };
  }, [category]);

  const availableStoreFilters = useMemo(() => {
    const expected = CATEGORY_EXPERIENCE[category] as StoreFilter | undefined;
    return expected ? [expected] : STORE_FILTER_ORDER.filter(filter => (
      filter === 'all' || products.some(product => getProductExperience(product) === filter)
    ));
  }, [category, products]);
  const effectiveFilter = CATEGORY_EXPERIENCE[category] as StoreFilter | undefined
    ?? (availableStoreFilters.includes(activeFilter) ? activeFilter : 'all');
  const selectedExperience = CATEGORY_EXPERIENCE[category] ?? (effectiveFilter === 'all' ? null : effectiveFilter);
  const availableTypes = useMemo(() => {
    const types = new Set(products
      .filter(product => getProductExperience(product) === selectedExperience)
      .flatMap(product => product.browse_type?.label ? [product.browse_type.label] : []));
    if (beatReviewSurfacesEnabled && selectedExperience === 'music') types.add('Beat');
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [products, selectedExperience]);
  const effectiveTypeFilter = selectedExperience
    ? availableTypes.find(type => type.toLowerCase() === typeFilter.toLowerCase()) ?? 'all'
    : 'all';
  const beatFiltersVisible = beatReviewSurfacesEnabled && selectedExperience === 'music' && effectiveTypeFilter.toLowerCase() === 'beat';
  const availableBeatKeys = useMemo(() => Array.from(new Set(products.filter(isBeatProduct).map(product => (
    product.beat?.keyNotApplicable ? 'Atonal / N/A' : [product.beat?.keyRoot, product.beat?.keyMode].filter(Boolean).join(' ')
  )).filter(Boolean))).sort(), [products]);
  const availableBeatMoods = useMemo(() => Array.from(new Set(products.filter(isBeatProduct).flatMap(product => product.beat?.moods ?? []))).sort(), [products]);
  const availableBeatInstruments = useMemo(() => Array.from(new Set(products.filter(isBeatProduct).flatMap(product => product.beat?.instruments ?? []))).sort(), [products]);
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
      if (beatFiltersVisible) {
        if (!product.beat) return false;
        const minimum = Number(beatBpmMin || 0);
        const maximum = Number(beatBpmMax || 999);
        const key = product.beat.keyNotApplicable ? 'Atonal / N/A' : [product.beat.keyRoot, product.beat.keyMode].filter(Boolean).join(' ');
        if (product.beat.bpm < minimum || product.beat.bpm > maximum) return false;
        if (beatKey !== 'all' && key !== beatKey) return false;
        if (beatMood !== 'all' && !product.beat.moods.includes(beatMood)) return false;
        if (beatInstrument !== 'all' && !product.beat.instruments.includes(beatInstrument)) return false;
        if (beatTier !== 'all' && !product.beat.availableTierCodes.includes(beatTier)) return false;
      }
      const hasPaidPrice = product.beat ? product.beat.hasPaidOffers : !(product.is_free || product.price_cents === 0);
      if (priceFilter === 'free' && hasPaidPrice) return false;
      if (priceFilter === 'paid' && !hasPaidPrice) return false;
      if (effectiveTagFilter !== 'all' && !(product.browse_tags ?? []).some(tag => tag.label.toLowerCase() === effectiveTagFilter.toLowerCase())) return false;
      if (capabilityFilter !== 'all' && !(product.capability_keys ?? []).includes(capabilityFilter)) return false;
      if (effectiveCreatorFilter === 'following' && !(product.author_id && followedProfileIds.has(product.author_id))) return false;
      if (effectiveCreatorFilter !== 'all' && effectiveCreatorFilter !== 'following' && creatorFilterKey(product) !== effectiveCreatorFilter) return false;
      if (!normalizedQuery) return true;
      const creator = product.creators?.display_name || product.creator || '';
      const taxonomy = [product.browse_type?.label, ...(product.browse_tags ?? []).map(tag => tag.label)].filter(Boolean).join(' ');
      return `${product.title} ${creator} ${taxonomy}`.toLowerCase().includes(normalizedQuery);
    }).sort(sortBy === 'recently-added' ? compareRecentlyAddedProducts : comparePublicCatalogProducts);
  }, [beatBpmMax, beatBpmMin, beatFiltersVisible, beatInstrument, beatKey, beatMood, beatTier, capabilityFilter, category, effectiveCreatorFilter, effectiveFilter, effectiveTagFilter, effectiveTypeFilter, followedProfileIds, priceFilter, products, query, sortBy]);
  const hasActiveFilters = (category === 'all' && effectiveFilter !== 'all')
    || sortBy !== 'release-date'
    || priceFilter !== 'all'
    || effectiveTypeFilter !== 'all'
    || effectiveTagFilter !== 'all'
    || capabilityFilter !== 'all'
    || effectiveCreatorFilter !== 'all'
    || (beatFiltersVisible && Boolean(beatBpmMin || beatBpmMax || beatKey !== 'all' || beatMood !== 'all' || beatInstrument !== 'all' || beatTier !== 'all'))
    || Boolean(query.trim());

  const surfaceName = hasActiveFilters ? 'Browse' : (frontDoor ? 'Discover' : 'Store');
  const activeFilterChips = [
    sortBy === 'recently-added' ? { id: 'sort', label: 'Recently added', clear: () => setSortBy('release-date') } : null,
    effectiveTagFilter !== 'all' ? { id: 'tag', label: effectiveTagFilter, clear: () => setTagFilter('all') } : null,
    effectiveTypeFilter !== 'all' ? { id: 'type', label: effectiveTypeFilter, clear: () => { setTypeFilter('all'); setTagFilter('all'); } } : null,
    category === 'all' && effectiveFilter !== 'all' ? { id: 'category', label: STORE_FILTER_LABELS[effectiveFilter], clear: () => { setActiveFilter('all'); setTypeFilter('all'); setTagFilter('all'); } } : null,
    effectiveCreatorFilter !== 'all' ? { id: 'creator', label: effectiveCreatorFilter === 'following' ? 'Creators You Follow' : availableCreators.find(creator => creator.id === effectiveCreatorFilter)?.label || 'Creator', clear: () => setCreatorFilter('all') } : null,
    capabilityFilter !== 'all' ? { id: 'feature', label: 'Achievements', clear: () => setCapabilityFilter('all') } : null,
    priceFilter !== 'all' ? { id: 'price', label: priceFilter === 'free' ? 'Free' : 'Paid', clear: () => setPriceFilter('all') } : null,
    beatBpmMin || beatBpmMax ? { id: 'bpm', label: `BPM ${beatBpmMin || '40'}–${beatBpmMax || '240'}`, clear: () => { setBeatBpmMin(''); setBeatBpmMax(''); } } : null,
    beatKey !== 'all' ? { id: 'beat-key', label: beatKey, clear: () => setBeatKey('all') } : null,
    beatMood !== 'all' ? { id: 'beat-mood', label: beatMood, clear: () => setBeatMood('all') } : null,
    beatInstrument !== 'all' ? { id: 'beat-instrument', label: beatInstrument, clear: () => setBeatInstrument('all') } : null,
    beatTier !== 'all' ? { id: 'beat-tier', label: `${beatTier} license`, clear: () => setBeatTier('all') } : null,
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
      {!frontDoor && <label className="page-search-control ui44-composed-field ui44-composed-field-search">
        <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
        <Ui44TextInput surface="bare" value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${surfaceName}`} aria-label={`Search ${surfaceName}`} />
      </label>}
      <FilterPopover label={`Filter ${surfaceName}`} active={hasActiveFilters}>
        {() => <>
          <label className="store-filter-group">
            <span className="store-filter-label">Sort by</span>
            <Ui44SelectInput value={sortBy} onChange={event => setSortBy(event.target.value as StoreSort)}>
              <option value="release-date">Release date</option>
              <option value="recently-added">Recently added</option>
            </Ui44SelectInput>
          </label>
          <label className="store-filter-group">
            <span className="store-filter-label">Category</span>
            <Ui44SelectInput value={effectiveFilter} onChange={event => {
              setActiveFilter(event.target.value as StoreFilter);
              setTypeFilter('all');
              setTagFilter('all');
              setCreatorFilter('all');
            }}>
              {availableStoreFilters.map(filter => <option key={filter} value={filter}>{STORE_FILTER_LABELS[filter]}</option>)}
            </Ui44SelectInput>
          </label>
          {selectedExperience && <label className="store-filter-group">
            <span className="store-filter-label">Type</span>
            <Ui44SelectInput value={effectiveTypeFilter} onChange={event => {
              setTypeFilter(event.target.value);
              setTagFilter('all');
              setCreatorFilter('all');
            }}>
              <option value="all">Any type</option>
              {availableTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </Ui44SelectInput>
          </label>}
          {beatFiltersVisible && <>
            <div className="store-filter-group">
              <span className="store-filter-label">BPM range</span>
              <div className="store-beat-range">
                <Ui44TextInput inputMode="numeric" value={beatBpmMin} onChange={event => setBeatBpmMin(event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="40" aria-label="Minimum BPM" />
                <Ui44TextInput inputMode="numeric" value={beatBpmMax} onChange={event => setBeatBpmMax(event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="240" aria-label="Maximum BPM" />
              </div>
            </div>
            <label className="store-filter-group"><span className="store-filter-label">Key</span><Ui44SelectInput value={beatKey} onChange={event => setBeatKey(event.target.value)}><option value="all">Any key</option>{availableBeatKeys.map(value => <option key={value} value={value}>{value}</option>)}</Ui44SelectInput></label>
            <label className="store-filter-group"><span className="store-filter-label">Mood</span><Ui44SelectInput value={beatMood} onChange={event => setBeatMood(event.target.value)}><option value="all">Any mood</option>{availableBeatMoods.map(value => <option key={value} value={value}>{value}</option>)}</Ui44SelectInput></label>
            <label className="store-filter-group"><span className="store-filter-label">Instrument</span><Ui44SelectInput value={beatInstrument} onChange={event => setBeatInstrument(event.target.value)}><option value="all">Any instrument</option>{availableBeatInstruments.map(value => <option key={value} value={value}>{value}</option>)}</Ui44SelectInput></label>
            <label className="store-filter-group"><span className="store-filter-label">License</span><Ui44SelectInput value={beatTier} onChange={event => setBeatTier(event.target.value)}><option value="all">Any tier</option>{['basic','premium','trackout','exclusive'].map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</Ui44SelectInput></label>
          </>}
          {availableTags.length > 0 && <label className="store-filter-group">
            <span className="store-filter-label">Tags</span>
            <Ui44SelectInput value={effectiveTagFilter} onChange={event => { setTagFilter(event.target.value); setCreatorFilter('all'); }}>
              <option value="all">Any tag</option>
              {availableTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </Ui44SelectInput>
          </label>}
          <label className="store-filter-group">
            <span className="store-filter-label">Creator</span>
            <Ui44SelectInput value={effectiveCreatorFilter} onChange={event => setCreatorFilter(event.target.value)}>
              <option value="all">Any creator</option>
              {availableCreators.map(creator => <option key={creator.id} value={creator.id}>{creator.label}</option>)}
            </Ui44SelectInput>
          </label>
          <label className="store-filter-group">
            <span className="store-filter-label">Features</span>
            <Ui44SelectInput value={capabilityFilter} onChange={event => setCapabilityFilter(event.target.value as 'all' | 'achievements')}>
              <option value="all">Any feature</option>
              <option value="achievements">Achievements</option>
            </Ui44SelectInput>
          </label>
          <label className="store-filter-group">
            <span className="store-filter-label">Price</span>
            <Ui44SelectInput value={priceFilter} onChange={event => setPriceFilter(event.target.value as PriceFilter)}>
              <option value="all">Any price</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </Ui44SelectInput>
          </label>
          {hasActiveFilters && (
            <button type="button" className="ui44-paper-menu-item page-filter-option" onClick={() => {
              setActiveFilter('all');
              setSortBy('release-date');
              setPriceFilter('all');
              setTypeFilter('all');
              setTagFilter('all');
              setCapabilityFilter('all');
              setCreatorFilter('all');
              setBeatBpmMin(''); setBeatBpmMax(''); setBeatKey('all'); setBeatMood('all'); setBeatInstrument('all'); setBeatTier('all');
              setQuery('');
            }}><span className="store-clear-filters">Clear filters</span></button>
          )}
        </>}
      </FilterPopover>
    </div>
  );

  const copy = CATEGORY_COPY[category];
  const pageTitle = hasActiveFilters ? 'Browse' : (frontDoor ? 'Discover' : copy.title);
  const storeHeader = (
    <div className="store-browse-header">
      <HubHero title={pageTitle} actions={storeTools} />
      {renderActiveFilters('store-active-filters-below-header')}
    </div>
  );

  function browseCategory(filter: StoreFilter, nextSort: StoreSort = 'release-date') {
    setActiveFilter(filter);
    setSortBy(nextSort);
    setTypeFilter('all');
    setTagFilter('all');
    setCapabilityFilter('all');
    setCreatorFilter('all');
    setPriceFilter('all');
    setQuery('');
    document.querySelector<HTMLElement>('.app-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    if (!beatReviewSurfacesEnabled || !urlFilterReady || typeof window === 'undefined' || category !== 'music') return;
    const url = new URL(window.location.href);
    if (effectiveTypeFilter === 'all') url.searchParams.delete('type');
    else url.searchParams.set('type', effectiveTypeFilter.toLowerCase());
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [category, effectiveTypeFilter, urlFilterReady]);

  function browseFollowedCreators() {
    setActiveFilter('all');
    setSortBy('release-date');
    setTypeFilter('all');
    setTagFilter('all');
    setCapabilityFilter('all');
    setPriceFilter('all');
    setCreatorFilter('following');
    setQuery('');
    document.querySelector<HTMLElement>('.app-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (category === 'all') {
    const musicProducts = products.filter(product => getProductExperience(product) === 'music' && !isBeatProduct(product));
    const musicProductsById = new Map(musicProducts.map(product => [product.id, product]));
    const featuredProducts = featuredItemIds === null
      ? musicProducts.filter(product => product.featured).sort(comparePublicCatalogProducts).slice(0, 8)
      : featuredItemIds.flatMap(itemId => {
        const product = musicProductsById.get(itemId);
        return product ? [product] : [];
      }).slice(0, 8);
    const featuredProductIds = new Set(featuredProducts.map(product => product.id));
    const recentlyAddedProducts = buildRecentlyAddedProducts(
      [...musicProducts].sort(compareRecentlyAddedProducts),
      featuredProductIds,
      8,
    );
    const followingProducts = keepNewestProductPerCreator(
      products
        .filter(product => product.author_id && followedProfileIds.has(product.author_id))
        .sort(comparePublicCatalogProducts),
    ).slice(0, 4);
    const categoryShelves = HOME_BROWSE_SHELF_ORDER
      .map(filter => ({
        filter,
        title: HOME_BROWSE_SHELF_TITLES[filter],
        products: products
          .filter(product => getProductExperience(product) === filter)
          .sort(comparePublicCatalogProducts)
          .slice(0, 4),
      }))
      .filter(shelf => shelf.products.length > 0);
    const beatShelf = beatReviewSurfacesEnabled ? products.filter(isBeatProduct).sort(comparePublicCatalogProducts).slice(0, 4) : [];

    return (
      <PageShell>
        <main className="app-page store-app-page">
          {storeHeader}
          {loading ? (
            <EmptyMessage status>Loading...</EmptyMessage>
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
                <HubSection title="New Releases" action={<Ui44SectionArrow label="Browse all music by release date" onClick={() => browseCategory('music', 'release-date')} />}>
                  <ProductGrid>
                    {featuredProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
                </HubSection>
                )}
                {recentlyAddedProducts.length > 0 && (
                <HubSection title="Recently Added" action={<Ui44SectionArrow label="Browse recently added music" onClick={() => browseCategory('music', 'recently-added')} />}>
                  <ProductGrid>
                    {recentlyAddedProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
                </HubSection>
                )}
                {categoryShelves.map(shelf => (
              <HubSection
                key={shelf.filter}
                title={shelf.title}
                action={<Ui44SectionArrow label={shelf.title.replace('Browse ', 'Browse all ')} onClick={() => browseCategory(shelf.filter)} />}
              >
                  <ProductGrid>
                    {shelf.products.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
              </HubSection>
                ))}
                {beatShelf.length > 0 && <HubSection
                  title="Browse Beats"
                  action={<Ui44SectionArrow label="Browse all Beats" onClick={() => { window.location.href = '/store/music?type=beat'; }} />}
                >
                  <ProductGrid>{beatShelf.map(product => <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />)}</ProductGrid>
                </HubSection>}
                {followingProducts.length > 0 && (
                <HubSection title="Creators You Follow" action={<Ui44SectionArrow label="View all from creators you follow" onClick={browseFollowedCreators} />}>
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
      <main className="app-page store-app-page">
        {storeHeader}
        {loading ? (
          <EmptyMessage status>Loading...</EmptyMessage>
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
