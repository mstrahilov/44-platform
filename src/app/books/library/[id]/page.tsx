'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { LibraryCreatorChip, LibraryProductDetailsSection } from '@/components/LibraryDetailPrimitives';
import { ProductUpdatesSection } from '@/components/ProductUpdatesSection';
import { useTopbarBack } from '@/components/TopbarContext';
import { getProductLibraryPrimaryAction, getProductRuntimeKind } from '@/lib/libraryContent';
import type { Product } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';

interface BookLibraryRow {
  id: string;
  item_id: string;
  acquisition_type: string;
  acquired_at: string;
  status: string;
  products: Product | null;
}

export default function BooksLibraryItemPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  useTopbarBack({ href: '/library/books', label: 'Books Library' });
  const [row, setRow] = useState<BookLibraryRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    async function fetchBook(userId: string) {
      setLoading(true);
      setError(null);

      const { data, error: itemError } = await supabase
        .from('library_entries')
        .select('id,item_id,acquisition_type,acquired_at,status,products:catalog_items(*, creators:profiles!author_id(*))')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (itemError || !data) {
        setError(itemError?.message ?? 'Book not found.');
        setLoading(false);
        return;
      }

      const libraryRow = data as unknown as BookLibraryRow;
      if (!libraryRow.products || getProductRuntimeKind(libraryRow.products) !== 'book') {
        setError('Book not found.');
        setLoading(false);
        return;
      }

      setRow(libraryRow);
      setLoading(false);
    }

    fetchBook(user.id);
  }, [authLoading, id, user]);

  if (authLoading) return <BookStateMessage>Loading...</BookStateMessage>;
  if (!user) return <BookStateMessage>Sign in to read this book.</BookStateMessage>;
  if (loading) return <BookStateMessage>Loading...</BookStateMessage>;
  if (error) return <BookStateMessage>{error}</BookStateMessage>;
  if (!row?.products) return <BookStateMessage>Book not found.</BookStateMessage>;

  return <OwnedBook key={row.id} userId={user.id} row={row} />;
}

function OwnedBook({
  userId,
  row,
}: {
  userId: string;
  row: BookLibraryRow;
}) {
  const product = row.products!;
  const action = getProductLibraryPrimaryAction(product);
  const heroImage = product.hero_url || product.cover_url;
  const description = product.long_description || product.short_description || '';
  const creatorDisplayName = product.creators?.display_name || product.creator || '44 Creator';
  const [page, setPage] = useState(1);

  const readerSrc = useMemo(() => {
    if (!product.read_url) return null;
    const hash = `page=${page}&toolbar=0&navpanes=0`;
    return product.read_url.includes('#') ? `${product.read_url}&${hash}` : `${product.read_url}#${hash}`;
  }, [page, product.read_url]);

  function readBook() {
    if (product.read_url) {
      document.getElementById('book-reader')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      recordReaderProgress();
      return;
    }

    runProductAction(action);
  }

  function goToPage(nextPage: number) {
    const safePage = Math.max(1, nextPage);
    setPage(safePage);
    recordReaderProgress();
  }

  function recordReaderProgress() {
    const today = new Date().toISOString().slice(0, 10);
    const storageKey = `44-book-read-day:${userId}:${product.id}`;
    const firstReadDay = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
    if (!firstReadDay && typeof window !== 'undefined') window.localStorage.setItem(storageKey, today);

  }

  return (
    <div className="view-detail-single library-detail-page">
      <div
        className={heroImage ? 'view-album-header book-release-header' : 'view-album-header view-album-header-fallback book-release-header'}
        style={heroImage ? { backgroundImage: `url(${heroImage})` } as CSSProperties : undefined}
      >
        <div className="view-album-cover book-release-cover">
          {heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt={product.title} />
          )}
        </div>
        <div className="view-album-copy">
          <div className="view-album-eyebrow view-product-meta-line">
            <span>{(product.item_type || 'Book').toUpperCase()}</span>
            {product.year && (<><span className="view-album-meta-sep" /><span>{product.year}</span></>)}
            <span className="view-album-meta-sep" />
            <span className="view-album-meta-strong view-album-meta-accent">OWNED</span>
          </div>
          <h1 className="view-album-title">{product.title}</h1>
          <LibraryCreatorChip creator={product.creators ?? null} fallbackName={creatorDisplayName} sourceProductId={product.id} />
          <div className="view-album-actions">
            <button className="os-button os-button-primary" type="button" onClick={readBook}>{product.read_url ? 'Read' : action.label}</button>
            {(product.download_url || product.read_url) && (
              <a className="os-button os-button-secondary" href={product.download_url || product.read_url || '#'} target="_blank" rel="noreferrer">Download</a>
            )}
          </div>
        </div>
      </div>

      {description.length > 0 && (
        <div className="view-section">
          <p className="os-type-body view-description">{description}</p>
        </div>
      )}

      <div className="view-section" id="book-reader">
        <div className="book-reader-toolbar">
          <div>
            <h2 className="view-section-title" style={{ margin: 0 }}>Reader</h2>
            <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-muted)' }}>Page {page}</div>
          </div>
          <div className="book-reader-actions">
            <button className="os-button os-button-secondary" type="button" onClick={() => goToPage(page - 1)} disabled={!readerSrc || page <= 1}>Previous</button>
            <button className="os-button os-button-secondary" type="button" onClick={() => goToPage(page + 1)} disabled={!readerSrc}>Next</button>
            {product.read_url && <a className="os-button os-button-secondary" href={product.read_url} target="_blank" rel="noreferrer">Open File</a>}
          </div>
        </div>

        {readerSrc ? (
          <div className="book-reader-shell">
            <iframe className="book-reader-frame" src={readerSrc} title={`${product.title} reader`} />
          </div>
        ) : (
          <div className="book-reader-empty">
            <h3 className="os-type-panel-title">Reader file coming soon.</h3>
            <p className="os-type-body">This book is in your Library. The creator has not attached a readable file yet.</p>
          </div>
        )}
      </div>

      <LibraryProductDetailsSection product={product} />

      <ProductUpdatesSection productId={product.id} emptyMessage="No updates from this creator yet." />
    </div>
  );
}

function BookStateMessage({ children }: { children: ReactNode }) {
  return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>{children}</div>;
}

function runProductAction(action: ReturnType<typeof getProductLibraryPrimaryAction>) {
  if (action.href) {
    window.open(action.href, '_blank', 'noopener,noreferrer');
    return;
  }

  alert(action.missingMessage);
}
