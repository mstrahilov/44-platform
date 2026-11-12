'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useContextMenu, type ContextMenuEntry } from '@/components/ContextMenu';
import { PageShell, HubHero, CenteredMessage, EmptyMessage } from '@/components/Ui';
import { getProductExperience, productLibraryHref } from '@/lib/experience';
import { pinDockItem } from '@/lib/dockPreferences';
import type { LibraryCategory } from '@/lib/libraryRoutes';
import type { Product } from '@/lib/products';
import { creatorHref } from '@/lib/platform';
import { useAuth } from '@/lib/useAuth';
import { hideLibraryItem, listVisibleLibraryItems } from '@/lib/domain/library';
import { getPlaylist, listPlaylists, type Playlist } from '@/lib/domain/playlists';

type LibraryFilter = 'all' | 'music' | 'book' | 'interactive' | 'beats' | 'asset' | 'playlists';

const CATEGORY_FILTER: Record<LibraryCategory, LibraryFilter> = {
  all: 'all',
  music: 'music',
  books: 'book',
  games: 'interactive',
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

const LIBRARY_FILTER_ORDER: LibraryFilter[] = ['all', 'music', 'beats', 'asset', 'book', 'interactive', 'playlists'];
const LIBRARY_FILTER_HREFS: Record<LibraryFilter, string> = {
  all: '/library',
  music: '/library/music',
  beats: '/library/beats',
  asset: '/library/sample-packs',
  book: '/library/books',
  interactive: '/library/games',
  playlists: '/library',
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
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const availableFilters = useMemo(() => (
    (['music', 'book', 'interactive', 'beats', 'asset'] as LibraryFilter[]).filter(filter => rows.some(row => {
      if (!row.products) return false;
      if (filter === 'beats') return isBeatProduct(row.products);
      if (filter === 'music') return getProductExperience(row.products) === 'music' && !isBeatProduct(row.products);
      return getProductExperience(row.products) === filter;
    }))
  ), [rows]);

  useEffect(() => {
    const queryFilter = searchParams.get('filter');
    const requested = queryFilter === 'playlists' ? 'playlists' : CATEGORY_FILTER[category];
    Promise.resolve().then(() => setActiveFilter(requested));
  }, [category, searchParams]);

  useEffect(() => {
    function toggleFilterMenu() { setFilterMenuOpen(current => !current); }
    window.addEventListener('44:toggle-filter-popover', toggleFilterMenu);
    return () => window.removeEventListener('44:toggle-filter-popover', toggleFilterMenu);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    let alive = true;

    async function load(userId: string) {
      setLoading(true);
      setError('');

      try {
        const [data, playlistData] = await Promise.all([listVisibleLibraryItems(userId), listPlaylists(userId)]);
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
  const libraryFilters = LIBRARY_FILTER_ORDER.filter(filter => (
    filter === 'all' || filter === activeFilter || availableFilters.includes(filter) || (filter === 'playlists' && playlists.length > 0)
  ));
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
            <Link className="os-button os-button-primary" href="/login">Log In</Link>
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
        <div className="library-opening">
          <HubHero title="Library" />
        </div>
        {filterMenuOpen ? <div className="library-filter-menu ui44-paper-menu" role="menu" aria-label="Filter Library">
          {libraryFilters.map(filter => {
            const label = filter === 'asset' ? 'Samples' : FILTER_LABELS[filter];
            return <button key={filter} type="button" role="menuitem" className={activeFilter === filter ? 'ui44-paper-menu-item ui44-paper-menu-item-selected' : 'ui44-paper-menu-item'} onClick={() => { setFilterMenuOpen(false); router.push(filter === 'playlists' ? '/library?filter=playlists' : LIBRARY_FILTER_HREFS[filter]); }}>{label}</button>;
          })}
        </div> : null}
        {error ? (
          <EmptyMessage>{error}</EmptyMessage>
        ) : libraryEntries.length === 0 ? (
          <EmptyMessage>{activeFilter === 'all' ? 'Your library is empty.' : `No ${FILTER_LABELS[activeFilter].toLowerCase()} in your Library.`}</EmptyMessage>
        ) : (
          <div className="library-item-groups">
            <div className="app-grid ui44-catalog-grid">
              {libraryEntries.map(entry => entry.kind === 'playlist'
                ? <LibraryPlaylistCard key={`playlist-${entry.playlist.id}`} playlist={entry.playlist} />
                : <LibraryCard key={entry.row.id} row={entry.row} onRemove={removeLibraryRow} />)}
            </div>
          </div>
        )}
      </main>
    </PageShell>
  );
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
  if (experience === 'asset') return 'Sample Pack';
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
