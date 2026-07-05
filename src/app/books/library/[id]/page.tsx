'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { LibraryAchievementsSection, LibraryCreatorChip } from '@/components/LibraryDetailPrimitives';
import { ProductUpdatesSection } from '@/components/ProductUpdatesSection';
import { useTopbarBack } from '@/components/TopbarContext';
import { trackProductAchievementTrigger } from '@/lib/achievementTracking';
import { getProductLibraryPrimaryAction, getProductRuntimeKind } from '@/lib/libraryContent';
import type { Product } from '@/lib/products';
import { type ProductAchievement, type UserAchievement } from '@/lib/platform';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';

interface BookLibraryRow {
  id: string;
  product_id: string;
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
  const [achievements, setAchievements] = useState<ProductAchievement[]>([]);
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      setError('Sign in to read this book.');
      return;
    }

    async function fetchBook(userId: string) {
      setLoading(true);
      setError(null);

      const { data, error: itemError } = await supabase
        .from('library_items')
        .select('id,product_id,acquisition_type,acquired_at,status,products(*, creators:profiles!author_id(*))')
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
      const [{ data: achievementRows }, { data: unlockedRows }] = await Promise.all([
        supabase
          .from('product_achievements')
          .select('id,product_id,code,title,description,trigger_type,trigger_config,reward_product_id,reward_config,points,icon,sort_order,is_secret')
          .eq('product_id', libraryRow.product_id)
          .order('sort_order'),
        supabase
          .from('user_achievements')
          .select('id,user_id,achievement_id,product_id,unlocked_at')
          .eq('user_id', userId)
          .eq('product_id', libraryRow.product_id),
      ]);

      setAchievements((achievementRows as ProductAchievement[] | null) ?? []);
      setUnlockedAchievementIds(new Set(((unlockedRows as UserAchievement[] | null) ?? []).map(item => item.achievement_id)));
      setLoading(false);
    }

    fetchBook(user.id);
  }, [authLoading, id, user]);

  if (authLoading || loading) return <BookStateMessage>Loading...</BookStateMessage>;
  if (error) return <BookStateMessage>{error}</BookStateMessage>;
  if (!user) return <BookStateMessage>Sign in to read this book.</BookStateMessage>;
  if (!row?.products) return <BookStateMessage>Book not found.</BookStateMessage>;

  return <OwnedBook userId={user.id} row={row} achievements={achievements} unlockedAchievementIds={unlockedAchievementIds} />;
}

function OwnedBook({
  userId,
  row,
  achievements,
  unlockedAchievementIds,
}: {
  userId: string;
  row: BookLibraryRow;
  achievements: ProductAchievement[];
  unlockedAchievementIds: Set<string>;
}) {
  const product = row.products!;
  const action = getProductLibraryPrimaryAction(product);
  const heroImage = product.hero_url || product.cover_url;
  const description = product.long_description || product.short_description || '';
  const [page, setPage] = useState(1);
  const [localUnlockedAchievementIds, setLocalUnlockedAchievementIds] = useState(unlockedAchievementIds);
  const [toast, setToast] = useState<AchievementToastData | null>(null);

  useEffect(() => { setLocalUnlockedAchievementIds(unlockedAchievementIds); }, [unlockedAchievementIds]);

  const readerSrc = useMemo(() => {
    if (!product.read_url) return null;
    const hash = `page=${page}&toolbar=0&navpanes=0`;
    return product.read_url.includes('#') ? `${product.read_url}&${hash}` : `${product.read_url}#${hash}`;
  }, [page, product.read_url]);

  function readBook() {
    if (product.read_url) {
      document.getElementById('book-reader')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      recordReaderProgress(1);
      return;
    }

    runProductAction(action);
  }

  function goToPage(nextPage: number) {
    const safePage = Math.max(1, nextPage);
    setPage(safePage);
    recordReaderProgress(safePage);
  }

  async function recordReaderProgress(nextPage: number) {
    const today = new Date().toISOString().slice(0, 10);
    const storageKey = `44-book-read-day:${userId}:${product.id}`;
    const firstReadDay = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
    if (!firstReadDay && typeof window !== 'undefined') window.localStorage.setItem(storageKey, today);

    if (nextPage >= 5) {
      await unlockTrigger('book_quarter_single_session', { source: 'book_reader', page: nextPage });
    }

    if (firstReadDay && firstReadDay !== today && nextPage > 1) {
      await unlockTrigger('book_progress_on_second_day', { source: 'book_reader', page: nextPage });
    }

    const hour = new Date().getHours();
    if ((hour >= 22 || hour < 4) && nextPage > 1) {
      await unlockTrigger('book_read_at_night', { source: 'book_reader', page: nextPage, local_hour: hour });
    }
  }

  async function unlockTrigger(triggerType: string, metadata?: Record<string, unknown>) {
    const result = await trackProductAchievementTrigger({
      userId,
      productId: product.id,
      triggerType,
      achievements,
      unlockedAchievementIds: localUnlockedAchievementIds,
      metadata,
    });
    if (result.unlockedIds.length === 0) return;
    setLocalUnlockedAchievementIds(current => {
      const next = new Set(current);
      result.unlockedIds.forEach(id => next.add(id));
      return next;
    });
    const lastUnlocked = result.unlockedAchievements[result.unlockedAchievements.length - 1];
    if (lastUnlocked) setToast(lastUnlocked);
  }

  return (
    <div className="view-detail-single library-detail-page">
      <div
        className={heroImage ? 'view-album-header book-release-header library-detail-header' : 'view-album-header view-album-header-fallback book-release-header library-detail-header'}
        style={heroImage ? { backgroundImage: `url(${heroImage})` } as CSSProperties : undefined}
      >
        <div className="view-album-cover book-release-cover">
          {heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt={product.title} />
          )}
        </div>
        <div className="view-album-copy">
          <h1 className="view-album-title">{product.title}</h1>
          <div className="library-release-meta-row">
            <LibraryCreatorChip creator={product.creators ?? null} fallbackName={product.creator} sourceProductId={product.id} />
            <div className="view-album-meta">
              <span>{product.product_type || 'Book'}</span>
              {product.year && (
                <>
                  <span className="view-album-meta-sep" />
                  <span>{product.year}</span>
                </>
              )}
            </div>
          </div>
          <div className="view-album-actions">
            <button className="os-button os-button-primary" type="button" onClick={readBook}>{product.read_url ? 'Read' : action.label}</button>
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

      <LibraryAchievementsSection
        achievements={achievements}
        unlockedAchievementIds={localUnlockedAchievementIds}
        emptyMessage="Book achievements will appear here when the creator enables them."
      />

      <ProductUpdatesSection productId={product.id} emptyMessage="No updates from the creator yet." />
      <AchievementToast toast={toast} onDone={() => setToast(null)} />
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
