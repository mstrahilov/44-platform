'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { getCatalogItem } from '@/lib/domain/itemDetails';
import { getReadingSession, listReadingBookmarks, saveReadingProgress, toggleReadingBookmark, type ReadingBookmark } from '@/lib/domain/nativeContent';
import { useAuth } from '@/lib/useAuth';

type ReaderAppearance = { theme: 'system'; fit: 'width'; zoom: number };
const DEFAULT_APPEARANCE: ReaderAppearance = { theme: 'system', fit: 'width', zoom: 1 };

export function BookReader({ itemId, mode, returnTo }: { itemId: string; mode: 'sample' | 'full'; returnTo?: string }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? '';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [documentProxy, setDocumentProxy] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [title, setTitle] = useState('Book');
  const [page, setPage] = useState(1);
  const [pageText, setPageText] = useState('');
  const [bookmarks, setBookmarks] = useState<ReadingBookmark[]>([]);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [bookmarkStatus, setBookmarkStatus] = useState('');
  const [appearance, setAppearance] = useState<ReaderAppearance>(DEFAULT_APPEARANCE);
  const [stageWidth, setStageWidth] = useState(0);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBook = useCallback(async () => {
    if (authLoading || (mode === 'full' && !userId)) return;
    setLoading(true);
    setError('');
    try {
      const [product, session] = await Promise.all([getCatalogItem(itemId), getReadingSession(itemId, mode)]);
      setTitle(product?.title ?? 'Book');
      if (!session?.url) throw new Error(mode === 'sample' ? 'This book does not have a sample yet.' : 'Your reading access is unavailable or has expired.');
      const savedAppearance = session.progress?.appearance as Partial<ReaderAppearance> | null;
      if (mode === 'full' && savedAppearance) {
        setAppearance({
          theme: 'system',
          fit: 'width',
          zoom: typeof savedAppearance.zoom === 'number' ? Math.min(2, Math.max(.7, savedAppearance.zoom)) : 1,
        });
      }
      const { GlobalWorkerOptions, getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
      GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
      const pdf = await getDocument({ url: session.url, withCredentials: false }).promise;
      const availablePages = mode === 'sample' && session.book.sample_page_limit
        ? Math.min(pdf.numPages, session.book.sample_page_limit)
        : pdf.numPages;
      setDocumentProxy(pdf);
      setPageCount(availablePages);
      setPage(Math.min(availablePages, Math.max(1, mode === 'full' ? session.progress?.page_number ?? 1 : 1)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'This PDF could not be opened.');
    } finally {
      setLoading(false);
    }
  }, [authLoading, itemId, mode, userId]);

  useEffect(() => { Promise.resolve().then(() => void loadBook()); }, [loadBook]);
  useEffect(() => {
    if (mode !== 'full' || !userId) return;
    void listReadingBookmarks(itemId).then(setBookmarks).catch(() => setBookmarkStatus('Bookmarks could not be loaded.'));
  }, [itemId, mode, userId]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect;
      if (box) setStageWidth(box.width);
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [documentProxy]);

  useEffect(() => {
    if (!documentProxy || !canvasRef.current || !stageWidth) return;
    let alive = true;
    async function render() {
      const pdfPage = await documentProxy!.getPage(page);
      if (!alive || !canvasRef.current) return;
      const initial = pdfPage.getViewport({ scale: 1 });
      const widthScale = Math.max(.2, (stageWidth - 32) / initial.width);
      const viewport = pdfPage.getViewport({ scale: widthScale * appearance.zoom });
      const outputScale = window.devicePixelRatio || 1;
      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const context = canvas.getContext('2d');
      if (!context) return;
      await renderTaskRef.current?.cancel();
      const task = pdfPage.render({ canvasContext: context, viewport, transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0] });
      renderTaskRef.current = task;
      try { await task.promise; } catch (renderError) { if ((renderError as Error).name !== 'RenderingCancelledException') throw renderError; }
      const text = await pdfPage.getTextContent();
      if (alive) setPageText(text.items.flatMap(item => 'str' in item ? [item.str] : []).join(' '));
    }
    void render().catch(renderError => setError(renderError instanceof Error ? renderError.message : 'This page could not be rendered.'));
    return () => { alive = false; renderTaskRef.current?.cancel(); };
  }, [appearance.zoom, documentProxy, page, stageWidth]);

  useEffect(() => {
    if (mode !== 'full' || !documentProxy || !userId) return;
    const timer = window.setTimeout(() => {
      void saveReadingProgress({ itemId, page, totalPages: documentProxy.numPages, appearance }).catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [appearance, documentProxy, itemId, mode, page, userId]);

  function movePage(next: number) {
    if (!documentProxy || !pageCount) return;
    setPage(Math.min(pageCount, Math.max(1, next)));
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(event.key)) { event.preventDefault(); movePage(page + 1); }
    if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); movePage(page - 1); }
    if (event.key === 'Home') { event.preventDefault(); movePage(1); }
    if (event.key === 'End' && documentProxy) { event.preventDefault(); movePage(pageCount); }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); setAppearance(current => ({ ...current, zoom: Math.min(2, current.zoom + .1) })); }
    if (event.key === '-') { event.preventDefault(); setAppearance(current => ({ ...current, zoom: Math.max(.7, current.zoom - .1) })); }
  }

  async function toggleBookmark(targetPage: number) {
    try {
      setBookmarkStatus('');
      await toggleReadingBookmark(itemId, targetPage);
      setBookmarks(await listReadingBookmarks(itemId));
    } catch {
      setBookmarkStatus('Bookmark could not be saved.');
    }
  }

  if (authLoading || loading) return <div className="native-reader-state">Opening {mode === 'sample' ? 'sample' : 'book'}…</div>;
  if (mode === 'full' && !user) return <div className="native-reader-state"><p>Sign in to read this Library book.</p><Link className="os-button os-button-primary" href="/login">Sign In</Link></div>;
  if (error) return <div className="native-reader-state"><p>{error}</p><button className="os-button os-button-primary" type="button" onClick={() => void loadBook()} disabled={!online}>{online ? 'Refresh Access' : 'Offline'}</button></div>;

  return (
    <main className="native-reader" onKeyDown={handleKeyDown} tabIndex={-1}>
      <header className="native-reader-toolbar">
        <Link className="native-reader-close" href={returnTo || (mode === 'sample' ? `/store/item/${itemId}` : '/library')} aria-label="Close reader">×</Link>
        <div className="native-reader-title"><strong>{title}</strong></div>
        <div className="native-reader-controls" role="group" aria-label="Reader controls">
          <div className="native-reader-page-count" aria-live="polite">{page} of {pageCount}</div>
          <div className="native-reader-page-actions">
            {mode === 'full' ? <button
              type="button"
              className={bookmarks.some(bookmark => bookmark.page_number === page) ? 'native-reader-bookmark-active' : ''}
              onClick={() => void toggleBookmark(page)}
              aria-label={bookmarks.some(bookmark => bookmark.page_number === page) ? `Remove bookmark from page ${page}` : `Bookmark page ${page}`}
              title={bookmarks.some(bookmark => bookmark.page_number === page) ? 'Remove bookmark' : 'Bookmark this page'}
            ><BookmarkIcon filled={bookmarks.some(bookmark => bookmark.page_number === page)} /></button> : null}
            {mode === 'full' ? <div className="native-reader-bookmarks">
              <button type="button" onClick={() => setBookmarksOpen(current => !current)} aria-expanded={bookmarksOpen} aria-label="Show bookmarks" title="Bookmarks"><BookmarkListIcon /></button>
              {bookmarksOpen ? <div className="native-reader-bookmark-menu" role="menu" aria-label="Saved bookmarks">
                <strong>Bookmarks</strong>
                {bookmarks.length ? bookmarks.map(bookmark => <div className="native-reader-bookmark-row" key={bookmark.id}>
                  <button type="button" role="menuitem" onClick={() => { movePage(bookmark.page_number); setBookmarksOpen(false); }}>Page {bookmark.page_number}</button>
                  <button type="button" onClick={() => void toggleBookmark(bookmark.page_number)} aria-label={`Remove bookmark from page ${bookmark.page_number}`}>×</button>
                </div>) : <span>No bookmarks yet.</span>}
              </div> : null}
            </div> : null}
            <button type="button" onClick={() => movePage(page - 1)} disabled={page <= 1} aria-label="Previous page">‹</button>
            <button type="button" onClick={() => movePage(page + 1)} disabled={page >= pageCount} aria-label="Next page">›</button>
            <button type="button" onClick={() => setAppearance(current => ({ ...current, zoom: Math.max(.7, current.zoom - .1) }))} aria-label="Zoom out">−</button>
            <button type="button" onClick={() => setAppearance(current => ({ ...current, zoom: Math.min(2, current.zoom + .1) }))} aria-label="Zoom in">+</button>
          </div>
        </div>
        <span className="sr-only" role="status" aria-live="polite">{bookmarkStatus}</span>
      </header>
      {!online && <div className="native-reader-offline" role="status">Offline. The open page remains available; protected books are not stored on this device.</div>}
      <div className="native-reader-stage" ref={stageRef} tabIndex={0} aria-label={`${title}, page ${page} of ${pageCount}`}>
        <canvas ref={canvasRef} aria-hidden="true" />
        <p className="sr-only" aria-live="polite">{pageText}</p>
      </div>
    </main>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M7 4.5h10v15l-5-3.4-5 3.4z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
}

function BookmarkListIcon() {
  return <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M6 5h9v13l-4.5-3L6 18zM18 7v12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
