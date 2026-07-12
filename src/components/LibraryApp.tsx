'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useContextMenu, type ContextMenuEntry } from '@/components/ContextMenu';
import { PageShell, HubHero, HubSection, CenteredMessage, EmptyMessage } from '@/components/Ui';
import { getProductExperience, productLibraryHref, type ProductExperience } from '@/lib/experience';
import { pinDockItem } from '@/lib/dockPreferences';
import type { LibraryCategory } from '@/lib/libraryRoutes';
import type { Product } from '@/lib/products';
import { creatorHref } from '@/lib/platform';
import { useAuth } from '@/lib/useAuth';
import { hideLibraryItem, listVisibleLibraryItems } from '@/lib/domain/library';

const CATEGORY_EXPERIENCE: Partial<Record<LibraryCategory, ProductExperience>> = {
  music: 'music',
  books: 'book',
  assets: 'asset',
};

type LibraryFilter = 'all' | 'music' | 'book' | 'asset';

const FILTER_LABELS: Record<LibraryFilter, string> = {
  all: 'All',
  music: 'Music',
  book: 'Books',
  asset: 'Assets',
};

interface LibraryRow {
  id: string;
  item_id: string;
  acquisition_type: string;
  acquired_at: string;
  status: 'visible' | 'hidden' | 'archived';
  products: Product | null;
}

export default function LibraryApp({ category }: { category: LibraryCategory }) {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>(() => (
    (CATEGORY_EXPERIENCE[category] as LibraryFilter | undefined) ?? 'all'
  ));

  const ownedExperiences = useMemo(() => new Set(
    rows
      .filter(row => row.products)
      .map(row => getProductExperience(row.products!))
      .filter((experience): experience is ProductExperience => ['music', 'book', 'asset'].includes(experience)),
  ), [rows]);

  const availableFilters = useMemo(() => (
    (['music', 'book', 'asset'] as LibraryFilter[]).filter(filter => ownedExperiences.has(filter as ProductExperience))
  ), [ownedExperiences]);

  useEffect(() => {
    const requested = (CATEGORY_EXPERIENCE[category] as LibraryFilter | undefined) ?? 'all';
    Promise.resolve().then(() => setActiveFilter(requested));
  }, [category]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    let alive = true;

    async function load(userId: string) {
      setLoading(true);
      setError('');

      try {
        const data = await listVisibleLibraryItems(userId);
        if (!alive) return;
        setRows(data as LibraryRow[]);
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
    const normalizedQuery = query.trim().toLowerCase();
    return productRows.filter(row => {
      const product = row.products!;
      const experience = getProductExperience(product);
      if (!['music', 'book', 'asset'].includes(experience)) return false;
      if (activeFilter !== 'all' && experience !== activeFilter) return false;
      if (!normalizedQuery) return true;
      const creator = product.creators?.display_name || product.creator || '';
      return `${product.title} ${creator}`.toLowerCase().includes(normalizedQuery);
    });
  }, [activeFilter, query, rows]);

  const groupedRows = useMemo(() => {
    if (activeFilter !== 'all') return [];
    return [
      { id: 'music', title: 'Music', rows: visibleRows.filter(row => getProductExperience(row.products!) === 'music') },
      { id: 'books', title: 'Books', rows: visibleRows.filter(row => getProductExperience(row.products!) === 'book') },
      { id: 'assets', title: 'Assets', rows: visibleRows.filter(row => getProductExperience(row.products!) === 'asset') },
    ].filter(group => group.rows.length > 0);
  }, [activeFilter, visibleRows]);

  if (authLoading) {
    return <PageShell><CenteredMessage>Loading...</CenteredMessage></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <main className="app-page">
          <HubHero title="Library" copy="Saved music, books, assets, and purchases live here once you sign in." />
          <EmptyMessage>Log in to save items to your Library.</EmptyMessage>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--os-space-4)' }}>
            <Link className="os-button os-button-primary" href="/login">Log In</Link>
          </div>
        </main>
      </PageShell>
    );
  }

  if (loading) {
    return <PageShell><CenteredMessage>Loading...</CenteredMessage></PageShell>;
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
        <HubHero
          title="Library"
          copy="Everything you have saved, added, or purchased."
          actions={(
            <div className="page-header-tools">
              <label className="page-search-control library-filter-control">
                <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter Library" aria-label="Filter Library" />
              </label>
              <details className="page-filter-menu">
                <summary className="page-filter-button" aria-label="Filter Library" title="Filter Library">
                  <span className="page-filter-icon" aria-hidden="true"><i /><i /><i /></span>
                </summary>
                <div className="page-filter-popover">
                  {(['all', ...availableFilters] as LibraryFilter[]).map(filter => (
                    <button key={filter} type="button" className={activeFilter === filter ? 'page-filter-option page-filter-option-active' : 'page-filter-option'} onClick={event => {
                      setActiveFilter(filter);
                      event.currentTarget.closest('details')?.removeAttribute('open');
                    }}>
                      {FILTER_LABELS[filter]}
                    </button>
                  ))}
                </div>
              </details>
            </div>
          )}
        />
        {error ? (
          <EmptyMessage>{error}</EmptyMessage>
        ) : visibleRows.length === 0 ? (
          <EmptyMessage>{query ? 'No Library items match your search.' : activeFilter === 'all' ? 'Your library is empty.' : `No ${FILTER_LABELS[activeFilter].toLowerCase()} in your Library.`}</EmptyMessage>
        ) : activeFilter === 'all' ? (
          <>
            {groupedRows.map(group => (
              <HubSection key={group.id} title={group.title}>
                <div className="app-grid">
                  {group.rows.map(row => (
                    <LibraryCard key={row.id} row={row} onRemove={removeLibraryRow} />
                  ))}
                </div>
              </HubSection>
            ))}
          </>
        ) : (
          <div className="app-grid">
            {visibleRows.map(row => (
              <LibraryCard key={row.id} row={row} onRemove={removeLibraryRow} />
            ))}
          </div>
        )}
      </main>
    </PageShell>
  );
}

function LibraryCard({ row, onRemove }: { row: LibraryRow; onRemove: (row: LibraryRow) => void }) {
  const { openContextMenu } = useContextMenu();
  const product = row.products!;
  const image = product.cover_url || product.hero_url;
  const shape = getLibraryTileShape(product);
  const creatorName = product.creators?.display_name || product.creator || '44 Creator';
  const href = productLibraryHref(product, row.id);
  const experience = getProductExperience(product);
  const label = getLibraryItemLabel(product);
  const iconClass = getDockIconForProduct(product);
  const creatorLink = creatorHref(product.creators ?? product.creator);
  const entries: ContextMenuEntry[] = [
    { id: 'open', label: `Open ${label}`, href },
    { id: 'creator', label: 'View Creator', href: creatorLink },
    { id: 'pin', label: 'Pin to Dock', onSelect: () => pinDockItem({
      id: `library:${row.id}`,
      label: product.title,
      href,
      iconClass,
      kind: experience === 'music' ? 'music' : experience === 'book' ? 'book' : experience === 'asset' ? 'asset' : 'item',
      imageUrl: image ?? null,
    }) },
    { id: 'pin-creator', label: 'Pin Creator to Dock', onSelect: () => pinDockItem({
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
    <Link className="product-tile" href={href} onContextMenu={event => openContextMenu(event, entries)}>
      <span className={`product-tile-art product-tile-art-${shape}`}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" decoding="async" />
        )}
      </span>
      <span className="product-tile-info">
        <span className="product-tile-title">{product.title}</span>
        <span className="product-tile-subtitle">{creatorName}</span>
      </span>
    </Link>
  );
}

function getLibraryItemLabel(product: Product) {
  const experience = getProductExperience(product);
  if (experience === 'music') return 'Release';
  if (experience === 'book') return 'Book';
  if (experience === 'asset') return 'Asset';
  return 'Item';
}

function getDockIconForProduct(product: Product) {
  const experience = getProductExperience(product);
  if (experience === 'music') return 'os-icon-music';
  if (experience === 'book') return 'os-icon-books';
  if (experience === 'asset') return 'os-icon-assets';
  return 'os-icon-home';
}

function getLibraryTileShape(product: Product): 'square' | 'book' | 'landscape' {
  const experience = getProductExperience(product);
  if (experience === 'book') return 'book';
  if (experience === 'asset') return 'landscape';
  return 'square';
}
