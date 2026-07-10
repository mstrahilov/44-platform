'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useContextMenu, type ContextMenuEntry } from '@/components/ContextMenu';
import { PageShell, HubHero, HubSection, CenteredMessage, EmptyMessage } from '@/components/Ui';
import { useTopbarTabs } from '@/components/TopbarContext';
import { browseIndexHref, getProductExperience, productLibraryHref, type ProductExperience } from '@/lib/experience';
import { pinDockItem } from '@/lib/dockPreferences';
import type { LibraryCategory } from '@/lib/libraryRoutes';
import type { Product } from '@/lib/products';
import { creatorHref } from '@/lib/platform';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';

const LIBRARY_TABS: Array<{ id: LibraryCategory; label: string; href: string }> = [
  { id: 'all', label: 'All', href: '/library' },
  { id: 'music', label: 'Music', href: '/library/music' },
  { id: 'books', label: 'Books', href: '/library/books' },
  { id: 'assets', label: 'Assets', href: '/library/assets' },
];

const CATEGORY_EXPERIENCE: Partial<Record<LibraryCategory, ProductExperience>> = {
  music: 'music',
  books: 'book',
  assets: 'asset',
};

const CATEGORY_COPY: Record<LibraryCategory, { title: string; copy: string; empty: string; storeHref: string }> = {
  all: {
    title: 'Library',
    copy: 'Everything you have saved, added, or purchased.',
    empty: 'Your library is empty.',
    storeHref: '/browse',
  },
  music: {
    title: 'Music',
    copy: 'Saved releases. Purchased music unlocks downloads.',
    empty: 'No saved music yet.',
    storeHref: browseIndexHref('music'),
  },
  books: {
    title: 'Books',
    copy: 'Books and artbooks you own.',
    empty: 'No books in your library yet.',
    storeHref: browseIndexHref('books'),
  },
  assets: {
    title: 'Assets',
    copy: 'Assets, remix stems, and creative files you own.',
    empty: 'No assets in your library yet.',
    storeHref: browseIndexHref('assets'),
  },
};

interface LibraryRow {
  id: string;
  product_id: string;
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

  const ownedExperiences = useMemo(() => new Set(
    rows
      .filter(row => row.products)
      .map(row => getProductExperience(row.products!))
      .filter((experience): experience is ProductExperience => ['music', 'book', 'asset'].includes(experience)),
  ), [rows]);

  const libraryTabs = useMemo(() => (
    LIBRARY_TABS
      .filter(tab => tab.id === 'all' || ownedExperiences.has(CATEGORY_EXPERIENCE[tab.id]!))
      .map(tab => ({ ...tab, active: tab.id === category }))
  ), [category, ownedExperiences]);

  useTopbarTabs(libraryTabs);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    let alive = true;

    async function load(userId: string) {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('library_items')
        .select('id,product_id,acquisition_type,acquired_at,status,products(*, creators:profiles!author_id(*))')
        .eq('user_id', userId)
        .neq('status', 'archived')
        .neq('status', 'hidden')
        .order('acquired_at', { ascending: false });

      if (!alive) return;
      if (fetchError) {
        setError(fetchError.message);
        setRows([]);
      } else {
        setRows((data ?? []) as unknown as LibraryRow[]);
      }
      setLoading(false);
    }

    load(user.id);
    return () => { alive = false; };
  }, [authLoading, user]);

  const visibleRows = useMemo(() => {
    const expected = CATEGORY_EXPERIENCE[category];
    const productRows = rows.filter(row => row.products);
    if (!expected) return productRows.filter(row => ['music', 'book', 'asset'].includes(getProductExperience(row.products!)));
    return productRows.filter(row => getProductExperience(row.products!) === expected);
  }, [category, rows]);

  const groupedRows = useMemo(() => {
    if (category !== 'all') return [];
    return [
      { id: 'music', title: 'Music', rows: visibleRows.filter(row => getProductExperience(row.products!) === 'music') },
      { id: 'books', title: 'Books', rows: visibleRows.filter(row => getProductExperience(row.products!) === 'book') },
      { id: 'assets', title: 'Assets', rows: visibleRows.filter(row => getProductExperience(row.products!) === 'asset') },
    ].filter(group => group.rows.length > 0);
  }, [category, visibleRows]);

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

  const copy = CATEGORY_COPY[category];

  async function removeLibraryRow(row: LibraryRow) {
    if (!user) return;
    const result = await supabase
      .from('library_items')
      .update({ status: 'hidden' })
      .eq('id', row.id)
      .eq('user_id', user.id);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setRows(current => current.filter(item => item.id !== row.id));
  }

  return (
    <PageShell>
      <main className="app-page">
        <HubHero title={copy.title} copy={copy.copy} />
        {error ? (
          <EmptyMessage>{error}</EmptyMessage>
        ) : visibleRows.length === 0 ? (
          <EmptyMessage>{copy.empty}</EmptyMessage>
        ) : category === 'all' ? (
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
          <img src={image} alt="" />
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
