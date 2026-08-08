'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageShell, ProductCard, ProductGrid, HubHero, HubSection, EmptyMessage } from '@/components/Ui';
import { getProductExperience, type ProductExperience } from '@/lib/experience';
import { comparePublicCatalogProducts, type Product } from '@/lib/products';
import type { StoreCategory } from '@/lib/storeRoutes';
import { useAuth } from '@/lib/useAuth';
import {
  listHomeFeaturedItemIds,
  listNewDiscoveryCreators,
  loadStoreDiscoveryCatalog,
  type DiscoveryCreator,
} from '@/lib/domain/catalog';
import { listVisibleLibraryItemIds } from '@/lib/domain/library';
import { itemMatchesStoreType } from '@/lib/storeTaxonomy';
import { listFollowedProfileIds } from '@/lib/domain/community';
import { FilterPopover } from '@/components/FilterPopover';
import { Ui44SectionArrow } from '@/components/ui44/Controls';
import { Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';
import { beatReviewSurfacesEnabled } from '@/lib/domain/beats';
import { SectionTab, SectionTabs } from '@/components/SectionTabs';

const CATEGORY_EXPERIENCE: Partial<Record<StoreCategory, ProductExperience>> = {
  music: 'music',
  beats: 'music',
  books: 'book',
  'sample-packs': 'asset',
  merch: 'physical',
  games: 'interactive',
};

const CATEGORY_COPY: Record<StoreCategory, { title: string; copy: string; empty: string }> = {
  all: {
    title: 'Store',
    copy: 'Find releases, books, Beats, sample packs, and merch from independent creators.',
    empty: 'No items are published yet.',
  },
  music: {
    title: 'Browse Music',
    copy: 'Explore albums, EPs, singles, and releases built to grow over time.',
    empty: 'No music releases are published yet.',
  },
  beats: {
    title: 'Browse Beats',
    copy: 'Explore Beats with clear non-exclusive Basic, Premium, and Trackout licenses.',
    empty: 'No Beats are available yet.',
  },
  books: {
    title: 'Browse Books',
    copy: 'Explore art books, poetry, and stories from independent creators.',
    empty: 'No books are published yet.',
  },
  'sample-packs': {
    title: 'Browse Samples',
    copy: 'Explore downloadable sample packs from independent creators.',
    empty: 'No sample packs are published yet.',
  },
  games: {
    title: 'Browse Games',
    copy: 'Explore games and interactive releases from independent creators.',
    empty: 'No games are published yet.',
  },
  merch: {
    title: 'Browse Merch',
    copy: 'Explore apparel, accessories, and physical goods from creators.',
    empty: 'No merch is published yet.',
  },
};

type StoreFilter = 'all' | 'music' | 'book' | 'interactive' | 'asset' | 'physical';
type StoreSort = 'release-date' | 'recently-added';

const STORE_FILTER_LABELS: Record<StoreFilter, string> = {
  all: 'All Categories',
  music: 'Music',
  book: 'Books',
  asset: 'Samples',
  physical: 'Merch',
  interactive: 'Games',
};

const STORE_FILTER_ORDER: StoreFilter[] = ['all', 'music', 'physical', 'asset', 'book', 'interactive'];
const STORE_FILTER_TITLES: Record<StoreFilter, string> = {
  all: 'Discover',
  music: 'Browse Music',
  physical: 'Browse Merch',
  asset: 'Browse Samples',
  book: 'Browse Books',
  interactive: 'Browse Games',
};
const MOBILE_DISCOVER_CATEGORIES: Array<{
  category: StoreCategory;
  filter: StoreFilter;
  label: string;
  href: string;
}> = [
  { category: 'all', filter: 'all', label: 'Featured', href: '/' },
  { category: 'music', filter: 'music', label: 'Music', href: '/store/music' },
  ...(beatReviewSurfacesEnabled ? [{ category: 'beats' as const, filter: 'music' as const, label: 'Beats', href: '/store/beats' }] : []),
  { category: 'sample-packs', filter: 'asset', label: 'Samples', href: '/store/sample-packs' },
  { category: 'merch', filter: 'physical', label: 'Merch', href: '/store/merch' },
  { category: 'books', filter: 'book', label: 'Books', href: '/store/books' },
  { category: 'games', filter: 'interactive', label: 'Games', href: '/store/games' },
];

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
  return Array.from(productsByCreator.values()).flatMap(creatorProducts => {
    const product = creatorProducts.find(candidate => !avoidedProductIds.has(candidate.id));
    return product ? [product] : [];
  });
}

export default function StoreApp({ category, frontDoor = false }: { category: StoreCategory; frontDoor?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(new Set());
  const [followedProfileIds, setFollowedProfileIds] = useState<Set<string>>(new Set());
  const [newCreators, setNewCreators] = useState<DiscoveryCreator[]>([]);
  const [featuredItemIds, setFeaturedItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StoreFilter>('all');
  const [sortBy, setSortBy] = useState<StoreSort>('release-date');
  const [typeFilter, setTypeFilter] = useState('all');
  const [urlFilterReady, setUrlFilterReady] = useState(false);
  const [tagFilter, setTagFilter] = useState('all');
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
        const [items, creators, featuredIds] = await Promise.all([
          loadStoreDiscoveryCatalog(200, user?.id),
          frontDoor ? listNewDiscoveryCreators(10) : Promise.resolve([]),
          frontDoor ? listHomeFeaturedItemIds() : Promise.resolve([]),
        ]);
        if (!alive) return;
        setProducts(items);
        setNewCreators(creators);
        setFeaturedItemIds(featuredIds);
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load Browse.');
        setProducts([]);
      }
      setLoading(false);
    }

    load();
    return () => { alive = false; };
  }, [authLoading, frontDoor, user?.id]);

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
      : category === 'beats' ? 'Beat' : 'all';
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
  const hasBeatProducts = beatReviewSurfacesEnabled && products.some(isBeatProduct);
  const effectiveFilter = CATEGORY_EXPERIENCE[category] as StoreFilter | undefined
    ?? (availableStoreFilters.includes(activeFilter) ? activeFilter : 'all');
  const selectedExperience = CATEGORY_EXPERIENCE[category] ?? (effectiveFilter === 'all' ? null : effectiveFilter);
  const availableTypes = useMemo(() => {
    const types = new Set(products
      .filter(product => getProductExperience(product) === selectedExperience)
      .flatMap(product => product.browse_type?.label ? [product.browse_type.label] : []));
    if (hasBeatProducts && selectedExperience === 'music') types.add('Beat');
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [hasBeatProducts, products, selectedExperience]);
  const effectiveTypeFilter = category === 'beats'
    ? 'Beat'
    : selectedExperience
    ? availableTypes.find(type => type.toLowerCase() === typeFilter.toLowerCase()) ?? 'all'
    : 'all';
  const browsingBeats = beatReviewSurfacesEnabled
    && effectiveFilter === 'music'
    && effectiveTypeFilter.toLowerCase() === 'beat';
  const beatFiltersVisible = beatReviewSurfacesEnabled && (category === 'beats' || (selectedExperience === 'music' && effectiveTypeFilter.toLowerCase() === 'beat'));
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
      if (category === 'beats' && !isBeatProduct(product)) return false;
      if (category === 'music' && isBeatProduct(product)) return false;
      if (frontDoor && effectiveFilter === 'music' && effectiveTypeFilter === 'all' && isBeatProduct(product)) return false;
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
      if (effectiveTagFilter !== 'all' && !(product.browse_tags ?? []).some(tag => tag.label.toLowerCase() === effectiveTagFilter.toLowerCase())) return false;
      if (effectiveCreatorFilter === 'following' && !(product.author_id && followedProfileIds.has(product.author_id))) return false;
      if (effectiveCreatorFilter !== 'all' && effectiveCreatorFilter !== 'following' && creatorFilterKey(product) !== effectiveCreatorFilter) return false;
      if (!normalizedQuery) return true;
      const creator = product.creators?.display_name || product.creator || '';
      const taxonomy = [product.browse_type?.label, ...(product.browse_tags ?? []).map(tag => tag.label)].filter(Boolean).join(' ');
      return `${product.title} ${creator} ${taxonomy}`.toLowerCase().includes(normalizedQuery);
    }).sort(sortBy === 'recently-added' ? compareRecentlyAddedProducts : comparePublicCatalogProducts);
  }, [beatBpmMax, beatBpmMin, beatFiltersVisible, beatInstrument, beatKey, beatMood, beatTier, category, effectiveCreatorFilter, effectiveFilter, effectiveTagFilter, effectiveTypeFilter, followedProfileIds, frontDoor, products, query, sortBy]);
  const hasActiveFacetFilters = (Boolean(selectedExperience) && sortBy !== 'release-date')
    || (effectiveTypeFilter !== 'all' && !browsingBeats)
    || effectiveTagFilter !== 'all'
    || effectiveCreatorFilter !== 'all'
    || (beatFiltersVisible && Boolean(beatBpmMin || beatBpmMax || beatKey !== 'all' || beatMood !== 'all' || beatInstrument !== 'all' || beatTier !== 'all'));
  const showProductGrid = category !== 'all'
    || effectiveFilter !== 'all'
    || hasActiveFacetFilters
    || Boolean(query.trim());
  const showStoreFilter = !frontDoor || effectiveFilter !== 'all' || hasActiveFacetFilters;

  const copy = CATEGORY_COPY[category];
  const pageTitle = frontDoor
    ? effectiveFilter === 'all' ? 'Discover' : browsingBeats ? 'Browse Beats' : STORE_FILTER_TITLES[effectiveFilter]
    : copy.title;
  const surfaceName = frontDoor
    ? effectiveFilter === 'all' ? 'Discover' : browsingBeats ? 'Beats' : STORE_FILTER_LABELS[effectiveFilter]
    : category === 'sample-packs' ? 'Samples' : category === 'beats' ? 'Beats' : copy.title.replace('Browse ', '');
  const storeTools = (
    <div className="page-header-tools">
      {!frontDoor && category !== 'beats' && <label className="page-search-control ui44-composed-field ui44-composed-field-search">
        <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
        <Ui44TextInput surface="bare" value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${surfaceName}`} aria-label={`Search ${surfaceName}`} />
      </label>}
      {showStoreFilter && <FilterPopover label={`Filter ${surfaceName}`} active={hasActiveFacetFilters}>
        {() => <>
          {selectedExperience && category !== 'beats' && <label className="store-filter-group">
            <span className="store-filter-label">Sort by</span>
            <Ui44SelectInput value={sortBy} onChange={event => setSortBy(event.target.value as StoreSort)}>
              <option value="release-date">Release date</option>
              <option value="recently-added">Recently added</option>
            </Ui44SelectInput>
          </label>}
          {selectedExperience && <label className="store-filter-group">
            <span className="store-filter-label">{selectedExperience === 'music' ? 'Release type' : 'Type'}</span>
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
          {hasActiveFacetFilters && (
            <button type="button" className="ui44-paper-menu-item page-filter-option" onClick={() => {
              setSortBy('release-date');
              setTypeFilter('all');
              setTagFilter('all');
              setCreatorFilter('all');
              setBeatBpmMin(''); setBeatBpmMax(''); setBeatKey('all'); setBeatMood('all'); setBeatInstrument('all'); setBeatTier('all');
            }}><span className="store-clear-filters">Clear filters</span></button>
          )}
        </>}
      </FilterPopover>}
    </div>
  );

  const storeHeader = (
    <div className="store-browse-header">
      <HubHero title={pageTitle} actions={storeTools} />
    </div>
  );

  function browseCategory(filter: StoreFilter, nextSort: StoreSort = 'release-date') {
    setActiveFilter(filter);
    setSortBy(nextSort);
    setTypeFilter('all');
    setTagFilter('all');
    setCreatorFilter('all');
    setQuery('');
    document.querySelector<HTMLElement>('.app-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function browseBeats() {
    setActiveFilter('music');
    setSortBy('release-date');
    setTypeFilter('Beat');
    setTagFilter('all');
    setCreatorFilter('all');
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
    setCreatorFilter('following');
    setQuery('');
    document.querySelector<HTMLElement>('.app-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const discoverOptions = MOBILE_DISCOVER_CATEGORIES.filter(option => option.category !== 'beats' || hasBeatProducts);
  function discoverOptionSelected(option: (typeof MOBILE_DISCOVER_CATEGORIES)[number]) {
    return category === 'all'
      ? option.category === 'beats'
        ? browsingBeats
        : option.category === 'music'
          ? effectiveFilter === 'music' && !browsingBeats
          : effectiveFilter === option.filter
      : category === option.category;
  }
  const discoverTopbarTabs = discoverOptions.map(option => ({
    id: option.category,
    label: option.label,
    href: category === 'all' ? undefined : option.href,
    onClick: category === 'all' ? (option.category === 'beats' ? browseBeats : () => browseCategory(option.filter)) : undefined,
    active: discoverOptionSelected(option),
    variant: 'section' as const,
  }));
  const mobileDiscoverRail = (
    <SectionTabs ariaLabel="Discover categories" dockToTopbar topbarTabs={discoverTopbarTabs}>
      {discoverOptions.map(option => {
        const selected = discoverOptionSelected(option);
        return category === 'all' ? (
          <SectionTab
            key={option.category}
            active={selected}
            onClick={option.category === 'beats' ? browseBeats : () => browseCategory(option.filter)}
          >
            {option.label}
          </SectionTab>
        ) : (
          <SectionTab
            key={option.category}
            href={option.href}
            active={selected}
          >
            {option.label}
          </SectionTab>
        );
      })}
    </SectionTabs>
  );

  const storeOpening = (
    <div className="store-discover-opening">
      {storeHeader}
      {mobileDiscoverRail}
    </div>
  );

  if (category === 'all') {
    const musicProducts = products.filter(product => getProductExperience(product) === 'music' && !isBeatProduct(product));
    const sortedMusicProducts = [...musicProducts].sort(comparePublicCatalogProducts);
    const followingProducts = keepNewestProductPerCreator(
      products
        .filter(product => product.author_id && followedProfileIds.has(product.author_id))
        .sort(comparePublicCatalogProducts),
    ).slice(0, 8);
    const shelfProducts = (filter: StoreFilter) => products
      .filter(product => getProductExperience(product) === filter)
      .sort(comparePublicCatalogProducts)
      .slice(0, 8);
    const merchShelf = shelfProducts('physical');
    const gameShelf = shelfProducts('interactive');
    const bookShelf = shelfProducts('book');
    const beatShelf = beatReviewSurfacesEnabled ? products.filter(isBeatProduct).sort(comparePublicCatalogProducts).slice(0, 8) : [];
    const samplePackShelf = shelfProducts('asset');
    const featuredProduct = featuredItemIds
      .map(itemId => products.find(product => product.id === itemId))
      .find(Boolean) ?? sortedMusicProducts[0] ?? null;
    const featuredProductIds = new Set(featuredProduct ? [featuredProduct.id] : []);
    const newReleaseProducts = keepNewestProductPerCreator(sortedMusicProducts, featuredProductIds).slice(0, 8);
    const newReleaseProductIds = new Set(newReleaseProducts.map(product => product.id));
    const browseMusicProducts = sortedMusicProducts
      .filter(product => !featuredProductIds.has(product.id) && !newReleaseProductIds.has(product.id))
      .slice(0, 8);

    return (
      <PageShell>
        <main className="app-page store-app-page">
          {storeOpening}
          {loading ? (
            <EmptyMessage status>Loading...</EmptyMessage>
          ) : error ? (
            <EmptyMessage>{error}</EmptyMessage>
          ) : visibleProducts.length === 0 ? (
            <EmptyMessage>{query ? 'No items match your search.' : 'No items match this filter.'}</EmptyMessage>
          ) : (
            <>
              {showProductGrid ? (
                <ProductGrid>
                  {visibleProducts.map(product => (
                    <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                  ))}
                </ProductGrid>
              ) : <>
                {featuredProduct ? <DiscoverFeature product={featuredProduct} /> : null}
                {newReleaseProducts.length > 0 && (
                <HubSection title="New Releases" action={<Ui44SectionArrow label="Open Browse Music" onClick={() => browseCategory('music', 'release-date')} />}>
                  <ProductGrid className="store-mobile-shelf">
                    {newReleaseProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
                </HubSection>
                )}
                {newCreators.length > 0 && <HubSection title="New Creators">
                  <div className="discover-creator-shelf">
                    {newCreators.map(creator => <DiscoveryCreatorCard
                      key={creator.id}
                      creator={creator}
                      preferredTab={preferredCreatorContentTab(creator.id, products)}
                    />)}
                  </div>
                </HubSection>}
                {followingProducts.length > 0 && (
                <HubSection title="Creators You Follow" action={<Ui44SectionArrow label="View all from creators you follow" onClick={browseFollowedCreators} />}>
                  <ProductGrid className="store-mobile-shelf">
                    {followingProducts.map(product => (
                      <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />
                    ))}
                  </ProductGrid>
                </HubSection>
                )}
                {browseMusicProducts.length > 0 && <HomeProductShelf title="Browse Music" products={browseMusicProducts} ownedProductIds={ownedProductIds} onBrowse={() => browseCategory('music')} />}
                {beatShelf.length > 0 && <HubSection
                  title="Browse Beats"
                  action={<Ui44SectionArrow label="Open Browse Beats" onClick={browseBeats} />}
                >
                  <ProductGrid className="store-mobile-shelf">{beatShelf.map(product => <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />)}</ProductGrid>
                </HubSection>}
                {samplePackShelf.length > 0 && <HomeProductShelf title="Browse Samples" products={samplePackShelf} ownedProductIds={ownedProductIds} onBrowse={() => browseCategory('asset')} />}
                {merchShelf.length > 0 && <HomeProductShelf title="Browse Merch" products={merchShelf} ownedProductIds={ownedProductIds} onBrowse={() => browseCategory('physical')} />}
                {bookShelf.length > 0 && <HomeProductShelf title="Browse Books" products={bookShelf} ownedProductIds={ownedProductIds} onBrowse={() => browseCategory('book')} />}
                {gameShelf.length > 0 && <HomeProductShelf title="Browse Games" products={gameShelf} ownedProductIds={ownedProductIds} onBrowse={() => browseCategory('interactive')} />}
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
        {storeOpening}
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

function DiscoverFeature({ product }: { product: Product }) {
  const imageUrl = product.hero_url || product.cover_url;
  return <Link href={`/store/item/${product.slug || product.id}`} className="discover-feature" style={imageUrl ? { backgroundImage: `url(${JSON.stringify(imageUrl).slice(1, -1)})` } : undefined}>
    <span className="discover-feature-shade" aria-hidden="true" />
    <span className="discover-feature-copy">
      <span className="discover-feature-eyebrow">FEATURED RELEASE</span>
      <strong>{product.title}</strong>
      <span className="discover-feature-link">Explore release →</span>
    </span>
  </Link>;
}

function preferredCreatorContentTab(creatorId: string, products: Product[]) {
  const creatorProducts = products.filter(product => product.author_id === creatorId && product.status === 'published');
  if (creatorProducts.some(product => getProductExperience(product) === 'music' && !isBeatProduct(product))) return 'music';
  if (creatorProducts.some(isBeatProduct)) return 'beats';
  if (creatorProducts.some(product => getProductExperience(product) === 'book')) return 'books';
  if (creatorProducts.some(product => getProductExperience(product) === 'asset')) return 'sample-packs';
  if (creatorProducts.some(product => getProductExperience(product) === 'interactive')) return 'games';
  if (creatorProducts.some(product => getProductExperience(product) === 'physical')) return 'merch';
  return null;
}

function DiscoveryCreatorCard({ creator, preferredTab }: { creator: DiscoveryCreator; preferredTab: string | null }) {
  const name = creator.display_name || creator.username || 'Creator';
  const profilePath = `/profile/${creator.username || creator.slug || creator.id}`;
  const profileHref = preferredTab ? `${profilePath}?tab=${preferredTab}` : profilePath;
  return <Link href={profileHref} className="discover-creator-card" aria-label={`View ${name}'s profile`}>
    <span className="discover-creator-main">
      <Image src={creator.avatar_url || ''} alt="" width={132} height={132} unoptimized />
      <strong>{name}</strong>
    </span>
  </Link>;
}

function HomeProductShelf({ title, products, ownedProductIds, onBrowse }: {
  title: string;
  products: Product[];
  ownedProductIds: Set<string>;
  onBrowse: () => void;
}) {
  return <HubSection title={title} action={<Ui44SectionArrow label={`Open ${title}`} onClick={onBrowse} />}>
    <ProductGrid className="store-mobile-shelf">{products.map(product => <ProductCard key={product.id} product={product} owned={ownedProductIds.has(product.id)} />)}</ProductGrid>
  </HubSection>;
}
