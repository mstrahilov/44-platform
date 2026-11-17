'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useContextMenu, type ContextMenuEntry } from '@/components/ContextMenu';
import { FilterPopover } from '@/components/FilterPopover';
import { SectionTab, SectionTabs } from '@/components/SectionTabs';
import { OS44Button } from '@/components/OS44Button';
import type { TopbarTab } from '@/components/TopbarContext';
import { PageShell, HubHero, CenteredMessage, EmptyMessage } from '@/components/Ui';
import { getProductExperience, productLibraryHref } from '@/lib/experience';
import { pinDockItem } from '@/lib/dockPreferences';
import type { LibraryCategory } from '@/lib/libraryRoutes';
import type { Product } from '@/lib/products';
import { creatorHref } from '@/lib/platform';
import { useAuth } from '@/lib/useAuth';
import { hideLibraryItem, isSavedMusicContractMissing, listSavedMusicAlbums, listVisibleLibraryItems } from '@/lib/domain/library';
import { getPlaylist, listPlaylists, type Playlist } from '@/lib/domain/playlists';

type LibraryFilter = 'all' | 'music' | 'book' | 'interactive' | 'beats' | 'asset' | 'playlists';

const CATEGORY_FILTER: Record<LibraryCategory, LibraryFilter> = {
  all: 'all',
  music: 'music',
  playlists: 'playlists',
  books: 'book',
  games: 'interactive',
  assets: 'asset',
  beats: 'beats',
  'sample-packs': 'asset',
};

const FILTER_LABELS: Record<LibraryFilter, string> = {
  all: 'All',
  music: 'Music',
  book: 'Books',
  interactive: 'Games',
  beats: 'Beats',
  asset: 'Sample Packs',
  playlists: 'Playlists',
};

function isBeatProduct(product: Product) {
  return product.browse_type?.slug === 'beat' || product.capability_keys?.includes('beat_licensing') || Boolean(product.beat);
}

interface LibraryRow {
  id: string;
  item_id: string;
  acquisition_type: string;
  acquired_at: string;
  status: 'visible' | 'hidden' | 'archived';
  products: Product | null;
}

export default function LibraryApp({ category }: { category: LibraryCategory }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>(() => CATEGORY_FILTER[category]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [savedAlbums, setSavedAlbums] = useState<Array<{ item_id: string; product: Product; track_count: number; saved_at: string }>>([]);
  const [savedMusicContractAvailable, setSavedMusicContractAvailable] = useState(true);
  const [sortMode, setSortMode] = useState<'recently-added' | 'creator' | 'release-date'>('recently-added');

  useEffect(() => {
    const queryFilter = searchParams.get('filter');
    const requested = queryFilter === 'playlists' ? 'playlists' : CATEGORY_FILTER[category];
    Promise.resolve().then(() => setActiveFilter(requested));
  }, [category, searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    let alive = true;

    async function load(userId: string) {
      setLoading(true);
      setError('');

      try {
        const [data, playlistData] = await Promise.all([listVisibleLibraryItems(userId), listPlaylists(userId)]);
        let musicAlbums: Awaited<ReturnType<typeof listSavedMusicAlbums>> = [];
        let musicContractAvailable = true;
        try {
          musicAlbums = await listSavedMusicAlbums(userId);
        } catch (musicError) {
          if (!isSavedMusicContractMissing(musicError)) throw musicError;
          // An older database may not have the additive M0 table yet. Keep the
          // established Library entries visible until that contract is installed.
          musicContractAvailable = false;
        }
        const playlistsWithArtwork = await Promise.all(playlistData.map(async playlist => {
          if (playlist.artwork_url) return playlist;
          const detail = await getPlaylist(userId, playlist.id);
          return {
            ...playlist,
            artwork_url: detail?.tracks?.find(track => track.track?.item?.cover_url)?.track?.item?.cover_url || null,
          };
        }));
        if (!alive) return;
        setRows(data as LibraryRow[]);
        setPlaylists(playlistsWithArtwork);
        setSavedAlbums(musicAlbums);
        setSavedMusicContractAvailable(musicContractAvailable);
      } catch (fetchError) {
        if (!alive) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Could not load your Library.');
        setRows([]);
      }
      setLoading(false);
    }

    load(user.id);
    return () => { alive = false; };
  }, [authLoading, user]);

  const visibleRows = useMemo(() => {
    const productRows = rows.filter(row => row.products);
    return productRows.filter(row => {
      const product = row.products!;
      if (activeFilter === 'playlists') return false;
      const experience = getProductExperience(product);
      if (!['music', 'book', 'asset', 'interactive'].includes(experience)) return false;
      if (activeFilter === 'beats' && !isBeatProduct(product)) return false;
      if (activeFilter === 'music' && (experience !== 'music' || isBeatProduct(product))) return false;
      if (!['all', 'beats', 'music'].includes(activeFilter) && experience !== activeFilter) return false;
      return true;
    });
  }, [activeFilter, rows]);

  const libraryEntries = useMemo(() => [
    ...(activeFilter === 'all' || activeFilter === 'playlists' ? playlists : [])
      .map(playlist => ({ kind: 'playlist' as const, date: playlist.updated_at, playlist })),
    ...(activeFilter === 'playlists' ? [] : visibleRows.map(row => ({ kind: 'item' as const, date: row.acquired_at, row }))),
  ].sort((left, right) => right.date.localeCompare(left.date)), [activeFilter, playlists, visibleRows]);
  const legacyMusicRows = useMemo(() => rows.filter(row => row.products && getProductExperience(row.products) === 'music' && !isBeatProduct(row.products)), [rows]);
  const releaseDateAvailable = category === 'music' ? savedAlbums.some(album => album.product.release_date) || legacyMusicRows.some(row => row.products?.release_date) : rows.some(row => row.products?.release_date);
  const useReleaseSort = sortMode === 'release-date' && releaseDateAvailable;
  const compareDate = (left: string | null | undefined, right: string | null | undefined, newestFirst: boolean) => {
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    return newestFirst ? right.localeCompare(left) : left.localeCompare(right);
  };
  const sortedAlbums = useMemo(() => [...savedAlbums].sort((left, right) => {
    if (sortMode === 'creator') {
      const leftCreator = left.product.creators?.display_name || left.product.creator || '';
      const rightCreator = right.product.creators?.display_name || right.product.creator || '';
      return leftCreator.localeCompare(rightCreator, undefined, { sensitivity: 'base' }) || right.saved_at.localeCompare(left.saved_at);
    }
    if (useReleaseSort) return compareDate(left.product.release_date, right.product.release_date, true) || right.saved_at.localeCompare(left.saved_at);
    return right.saved_at.localeCompare(left.saved_at);
  }), [savedAlbums, sortMode, useReleaseSort]);
  const sortedLibraryEntries = useMemo(() => sortMode === 'recently-added' ? libraryEntries : [...libraryEntries].sort((left, right) => {
    const leftProduct = left.kind === 'item' ? left.row.products : null;
    const rightProduct = right.kind === 'item' ? right.row.products : null;
    if (sortMode === 'creator') {
      const leftCreator = leftProduct?.creators?.display_name || leftProduct?.creator || '';
      const rightCreator = rightProduct?.creators?.display_name || rightProduct?.creator || '';
      return leftCreator.localeCompare(rightCreator, undefined, { sensitivity: 'base' }) || right.date.localeCompare(left.date);
    }
    if (useReleaseSort) return compareDate(leftProduct?.release_date, rightProduct?.release_date, true) || right.date.localeCompare(left.date);
    return right.date.localeCompare(left.date);
  }), [libraryEntries, sortMode, useReleaseSort]);
  const availableCategories = useMemo(() => [
    ...(savedAlbums.length || (!savedMusicContractAvailable && legacyMusicRows.length) ? [{ id: 'music', label: 'Music', href: '/library/music' }] : []),
    ...(playlists.length ? [{ id: 'playlists', label: 'Playlists', href: '/library/playlists' }] : []),
    ...(rows.some(row => row.products && getProductExperience(row.products) === 'book') ? [{ id: 'books', label: 'Books', href: '/library/books' }] : []),
    ...(rows.some(row => row.products && getProductExperience(row.products) === 'interactive') ? [{ id: 'games', label: 'Games', href: '/library/games' }] : []),
    ...(rows.some(row => row.products && getProductExperience(row.products) === 'asset') ? [{ id: 'assets', label: 'Assets', href: '/library/assets' }] : []),
  ], [legacyMusicRows.length, playlists.length, rows, savedAlbums.length, savedMusicContractAvailable]);
  const topbarTabs = useMemo(() => availableCategories.map(entry => ({
    id: entry.id, label: entry.label, href: entry.href, active: category === entry.id, variant: 'section' as const,
  } satisfies TopbarTab)), [availableCategories, category]);
  useEffect(() => {
    const active = sortMode !== 'recently-added';
    window.dispatchEvent(new CustomEvent('44:library-sort-state', { detail: { active } }));
    return () => { window.dispatchEvent(new CustomEvent('44:library-sort-state', { detail: { active: false } })); };
  }, [sortMode]);
  useEffect(() => {
    if (category !== 'all' || loading || !availableCategories.length) return;
    router.replace(availableCategories[0].href);
  }, [availableCategories, category, loading, router]);
  useEffect(() => {
    if (category === 'all' || loading || !availableCategories.length) return;
    const categoryId = category === 'beats' || category === 'sample-packs' ? 'assets' : category;
    if (availableCategories.some(entry => entry.id === categoryId)) return;
    router.replace(availableCategories[0].href);
  }, [availableCategories, category, loading, router]);
  if (authLoading) {
    return <PageShell><CenteredMessage status>Loading...</CenteredMessage></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <main className="app-page">
          <HubHero title="Library" />
          <EmptyMessage>Log in to save items to your Library.</EmptyMessage>
          <div className="ui44-centered-action">
            <OS44Button href="/login">Log In</OS44Button>
          </div>
        </main>
      </PageShell>
    );
  }

  if (loading) {
    return <PageShell><CenteredMessage status>Loading...</CenteredMessage></PageShell>;
  }

  async function removeLibraryRow(row: LibraryRow) {
    if (!user) return;
    try {
      await hideLibraryItem(user.id, row.id);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Could not update your Library.');
      return;
    }
    setRows(current => current.filter(item => item.id !== row.id));
  }

  return (
    <PageShell>
      <main className="app-page">
        <div className="library-opening section-tab-page-opening">
          <HubHero title="Library" />
          {availableCategories.length > 1 ? <SectionTabs ariaLabel="Library categories" dockToTopbar toolbarSpacing topbarTabs={topbarTabs} className="library-category-tabs">
            {availableCategories.map(entry => <SectionTab key={entry.id} href={entry.href} active={category === entry.id}>{entry.label}</SectionTab>)}
          </SectionTabs> : null}
        </div>
        {category !== 'playlists' ? <div className="library-collection-actions"><FilterPopover label="Sort Library" active={sortMode !== 'recently-added'} hideTrigger popoverClassName="library-sort-popover">
          {({ close }) => <div role="menu" aria-label="Sort Library" className="library-sort-options">
            {([['recently-added', 'Recently Added'], ['creator', 'Creator (A–Z)'], ...(releaseDateAvailable ? [['release-date', 'Release Date']] : [])] as Array<[typeof sortMode, string]>).map(([value, label]) => <button key={value} type="button" role="menuitemradio" aria-checked={sortMode === value} className={sortMode === value ? 'ui44-paper-menu-item ui44-paper-menu-item-selected' : 'ui44-paper-menu-item'} onClick={() => { setSortMode(value); close(); }}><span aria-hidden="true">{sortMode === value ? '✓' : '◯'}</span>{label}</button>)}
          </div>}
        </FilterPopover></div> : null}
        {error ? (
          <EmptyMessage>{error}</EmptyMessage>
        ) : (category === 'music' ? (savedMusicContractAvailable ? savedAlbums.length === 0 : legacyMusicRows.length === 0) : category === 'playlists' ? playlists.length === 0 : libraryEntries.length === 0) ? (
          <EmptyMessage>{activeFilter === 'all' ? 'Your library is empty.' : `No ${FILTER_LABELS[activeFilter].toLowerCase()} in your Library.`}</EmptyMessage>
        ) : (
          <div className="library-item-groups">
            <div className="app-grid ui44-catalog-grid">
              {category === 'music' ? (savedMusicContractAvailable ? sortedAlbums.map(album => <SavedMusicAlbumCard key={album.item_id} product={album.product} count={album.track_count} />) : sortedLibraryEntries.filter((entry): entry is Extract<typeof entry, { kind: 'item' }> => entry.kind === 'item').map(entry => <LibraryCard key={entry.row.id} row={entry.row} onRemove={removeLibraryRow} />)) : category === 'playlists' ? playlists.map(playlist => <LibraryPlaylistCard key={playlist.id} playlist={playlist} />) : sortedLibraryEntries.map(entry => entry.kind === 'playlist'
                ? <LibraryPlaylistCard key={`playlist-${entry.playlist.id}`} playlist={entry.playlist} />
                : <LibraryCard key={entry.row.id} row={entry.row} onRemove={removeLibraryRow} />)}
            </div>
          </div>
        )}
      </main>
    </PageShell>
  );
}

function SavedMusicAlbumCard({ product, count }: { product: Product; count: number }) {
  return <Link className="product-tile ui44-catalog-card" href={`/library/music/${product.id}`}>
    <span className="product-tile-art product-tile-art-square ui44-catalog-art">{product.cover_url || product.hero_url ? <img src={product.cover_url || product.hero_url || ''} alt="" loading="lazy" /> : null}</span>
    <span className="product-tile-info ui44-catalog-copy"><span className="product-tile-title ui44-catalog-title">{product.title}</span><span className="product-tile-subtitle ui44-catalog-subheadline">{product.creators?.display_name || product.creator} · {count} saved {count === 1 ? 'track' : 'tracks'}</span></span>
  </Link>;
}

function LibraryPlaylistCard({ playlist }: { playlist: Playlist }) {
  const [artwork, setArtwork] = useState(playlist.artwork_url || playlist.cover_url || null);

  useEffect(() => {
    if (artwork) return;
    let alive = true;
    void getPlaylist(playlist.user_id, playlist.id).then(detail => {
      if (!alive) return;
      setArtwork(detail?.tracks?.find(track => track.track?.item?.cover_url)?.track?.item?.cover_url || null);
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [artwork, playlist.id, playlist.user_id]);

  return <Link className="product-tile ui44-catalog-card library-playlist-card" href={`/library/playlists/${playlist.id}`}>
    <span className="product-tile-art product-tile-art-square ui44-catalog-art library-playlist-art">{artwork ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={artwork} alt="" />
    ) : null}</span>
    <span className="product-tile-info ui44-catalog-copy"><span className="product-tile-title ui44-catalog-title">{playlist.title}</span><span className="product-tile-subtitle ui44-catalog-subheadline">Playlist</span></span>
  </Link>;
}

function LibraryCard({ row, onRemove }: { row: LibraryRow; onRemove: (row: LibraryRow) => void }) {
  const { openContextMenu } = useContextMenu();
  const product = row.products!;
  const image = product.cover_url || product.hero_url;
  const creatorName = product.creators?.display_name || product.creator || '44 Creator';
  const href = productLibraryHref(product, row.id);
  const experience = getProductExperience(product);
  const label = getLibraryItemLabel(product);
  const iconClass = getDockIconForProduct(product);
  const creatorLink = creatorHref(product.creators ?? product.creator);
  const entries: ContextMenuEntry[] = [
    { id: 'open', label: `Open ${label}`, href },
    { id: 'creator', label: 'View Creator', href: creatorLink },
    { id: 'pin', label: 'Pin to Sidebar', onSelect: () => pinDockItem({
      id: `library:${row.id}`,
      label: product.title,
      href,
      iconClass,
      kind: experience === 'music' ? 'music' : experience === 'book' ? 'book' : experience === 'asset' ? 'asset' : 'item',
      imageUrl: image ?? null,
    }) },
    { id: 'pin-creator', label: 'Pin Creator to Sidebar', onSelect: () => pinDockItem({
      id: `profile:${product.creators?.id ?? creatorLink}`,
      label: creatorName,
      href: creatorLink,
      iconClass: 'os-icon-user',
      kind: 'profile',
      imageUrl: product.creators?.avatar_url ?? null,
    }) },
    { kind: 'divider', id: 'divider-1' },
    { id: 'remove', label: 'Remove From Library', danger: true, onSelect: () => onRemove(row) },
  ];

  return (
    <Link className="product-tile ui44-catalog-card" href={href} onContextMenu={event => openContextMenu(event, entries)}>
      <span className={`product-tile-art product-tile-art-${experience === 'book' ? 'book' : 'square'} ui44-catalog-art`}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" decoding="async" />
        )}
      </span>
      <span className="product-tile-info ui44-catalog-copy">
        <span className="product-tile-title ui44-catalog-title">{product.title}</span>
        <span className="product-tile-subtitle ui44-catalog-subheadline">{creatorName}</span>
      </span>
    </Link>
  );
}

function getLibraryItemLabel(product: Product) {
  const experience = getProductExperience(product);
  if (experience === 'music') return 'Release';
  if (experience === 'book') return 'Book';
  if (experience === 'asset') return isBeatProduct(product) ? 'Beat' : product.browse_type?.label || (product.item_type.toLowerCase().includes('sample') ? 'Sample Pack' : 'Asset');
  if (experience === 'interactive') return 'Game';
  return 'Item';
}

function getDockIconForProduct(product: Product) {
  const experience = getProductExperience(product);
  if (experience === 'music') return 'os-icon-music';
  if (experience === 'book') return 'os-icon-books';
  if (experience === 'asset') return 'os-icon-assets';
  if (experience === 'interactive') return 'os-icon-games';
  return 'os-icon-home';
}
