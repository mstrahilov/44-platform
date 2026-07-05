'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageShell, HubHero, HubSection, CenteredMessage, EmptyMessage } from '@/components/Ui';
import { useTopbarTabs } from '@/components/TopbarContext';
import { getProductExperience, productLibraryHref, type ProductExperience } from '@/lib/experience';
import type { LibraryCategory } from '@/lib/libraryRoutes';
import type { Product } from '@/lib/products';
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
    copy: 'Everything you have added or purchased on 44.',
    empty: 'Your library is empty.',
    storeHref: '/store',
  },
  music: {
    title: 'Music',
    copy: 'Saved releases. Purchased music unlocks downloads.',
    empty: 'No saved music yet.',
    storeHref: '/store/music',
  },
  books: {
    title: 'Books',
    copy: 'Books and artbooks you own on 44.',
    empty: 'No books in your library yet.',
    storeHref: '/store/books',
  },
  assets: {
    title: 'Assets',
    copy: 'Sample packs, remix stems, and creative files you own on 44.',
    empty: 'No assets in your library yet.',
    storeHref: '/store/assets',
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

  useTopbarTabs(LIBRARY_TABS.map(tab => ({ ...tab, active: tab.id === category })));

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }

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

  if (authLoading || loading) {
    return <PageShell><CenteredMessage>Loading...</CenteredMessage></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <main className="app-page">
          <HubHero title="Library" copy="Sign in to see everything you have added or purchased on 44." />
          <div className="dashboard-list-surface">
            <div className="dashboard-empty">
              Sign in to open your Library.
              <div style={{ marginTop: 'var(--os-space-4)' }}>
                <Link className="os-button os-button-primary os-button-compact" href="/login">Log In</Link>
              </div>
            </div>
          </div>
        </main>
      </PageShell>
    );
  }

  const copy = CATEGORY_COPY[category];

  return (
    <PageShell>
      <main className="app-page">
        <HubHero title={copy.title} copy={copy.copy} />
        {error ? (
          <EmptyMessage>{error}</EmptyMessage>
        ) : visibleRows.length === 0 ? (
          <div className="dashboard-list-surface">
            <div className="dashboard-empty">
              {copy.empty}
              <div style={{ marginTop: 'var(--os-space-4)' }}>
                <Link className="os-button os-button-primary os-button-compact" href={copy.storeHref}>Open Store</Link>
              </div>
            </div>
          </div>
        ) : category === 'all' ? (
          <>
            {groupedRows.map(group => (
              <HubSection key={group.id} title={group.title}>
                <div className="app-grid">
                  {group.rows.map(row => (
                    <LibraryCard key={row.id} row={row} />
                  ))}
                </div>
              </HubSection>
            ))}
          </>
        ) : (
          <div className="app-grid">
            {visibleRows.map(row => (
              <LibraryCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </main>
    </PageShell>
  );
}

function LibraryCard({ row }: { row: LibraryRow }) {
  const product = row.products!;
  const image = product.cover_url || product.hero_url;
  const shape = getLibraryTileShape(product);
  const creatorName = product.creators?.display_name || product.creator || '44 Creator';

  return (
    <Link className="product-tile" href={productLibraryHref(product, row.id)}>
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

function getLibraryTileShape(product: Product): 'square' | 'book' | 'landscape' {
  const experience = getProductExperience(product);
  if (experience === 'book') return 'book';
  if (experience === 'asset') return 'landscape';
  return 'square';
}
