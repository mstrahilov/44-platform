'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmptyMessage, HubHero, PageShell } from '@/components/Ui';
import { Ui44TextInput } from '@/components/ui44/Inputs';
import { AdminAccessBoundary } from '@/components/admin/AdminPrimitives';
import { listAdminContent, type AdminContentRow } from '@/lib/domain/adminOperations';
import { FilterPopover } from '@/components/FilterPopover';
import { useTopbarBack, useTopbarMobileTrailingAction } from '@/components/TopbarContext';

const RELEASE_TYPES = [
  ['all', 'All releases'],
  ['music', 'Music'],
  ['book', 'Books'],
  ['asset', 'Assets'],
  ['game', 'Games'],
  ['merch', 'Merch'],
] as const;

export default function AdminContentApp() {
  return <AdminAccessBoundary><ContentDirectory /></AdminAccessBoundary>;
}

function ContentDirectory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const requestedType = searchParams.get('type') || 'all';
  const type = RELEASE_TYPES.some(([value]) => value === requestedType) ? requestedType : 'all';
  const [search, setSearch] = useState(query);
  const [rows, setRows] = useState<AdminContentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const moreRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const requestGenerationRef = useRef(0);

  const visibleRows = useMemo(() => rows.filter(item => matchesReleaseType(item, type)), [rows, type]);
  useTopbarBack({ href: '/admin', label: 'Admin', alwaysNavigate: true });

  const mobileFilterAction = useMemo(() => <button
    type="button"
    data-filter-popover-trigger="true"
    aria-pressed={type !== 'all'}
    className={`ui44-symbol-button ui44-symbol-button-filter page-filter-button${type !== 'all' ? ' ui44-symbol-button-active page-filter-button-active' : ''}`}
    aria-label="Filter Releases"
    title="Filter Releases"
    onClick={() => window.dispatchEvent(new CustomEvent('44:toggle-filter-popover', { detail: { label: 'Filter Releases' } }))}
  ><span className="page-filter-icon" aria-hidden="true"><i /><i /><i /></span></button>, [type]);
  useTopbarMobileTrailingAction(mobileFilterAction);

  useEffect(() => { Promise.resolve().then(() => setSearch(query)); }, [query]);

  useEffect(() => {
    let alive = true;
    requestGenerationRef.current += 1;
    loadingMoreRef.current = false;
    Promise.resolve().then(() => { if (alive) { setLoading(true); setLoadingMore(false); setRows([]); setTotal(0); setPage(1); setError(''); } });
    void listAdminContent({ query, page: 1 }).then(result => {
      if (!alive) return;
      setRows(result.rows);
      setTotal(result.total);
      setLoading(false);
    }).catch(loadError => {
      if (!alive) return;
      setError(loadError instanceof Error ? loadError.message : 'Could not load releases.');
      setLoading(false);
    });
    return () => { alive = false; };
  }, [query]);

  async function loadMore() {
    if (loading || loadingMoreRef.current || rows.length >= total) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError('');
    const generation = requestGenerationRef.current;
    const nextPage = page + 1;
    try {
      const result = await listAdminContent({ query, page: nextPage });
      if (generation !== requestGenerationRef.current) return;
      setRows(current => [...current, ...result.rows]);
      setTotal(result.total);
      setPage(nextPage);
    } catch (loadError) {
      if (generation === requestGenerationRef.current) setError(loadError instanceof Error ? loadError.message : 'Could not load more releases.');
    } finally {
      loadingMoreRef.current = false;
      if (generation === requestGenerationRef.current) setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (loading || loadingMore || rows.length >= total || !moreRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void loadMore();
    }, { rootMargin: '400px 0px' });
    observer.observe(moreRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, page, query, rows.length, total]);

  function buildHref(nextQuery = query, nextType = type) {
    const params = new URLSearchParams();
    if (nextQuery) params.set('q', nextQuery);
    if (nextType !== 'all') params.set('type', nextType);
    return `/admin/content${params.size ? `?${params}` : ''}`;
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (window.location.pathname !== '/admin/content') return;
      router.replace(buildHref(search.trim(), type), { scroll: false });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [router, search, type]);

  return <PageShell><main className="dashboard-page admin-page admin-users-page">
    <HubHero title="Releases" hideDivider />
    <div className="admin-users-search">
      <span className="os-icon os-icon-search os-icon-sm admin-users-search-icon" aria-hidden="true" />
      <Ui44TextInput surface="bare" type="search" className="admin-users-search-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Filter releases" aria-label="Filter releases" />
    </div>
    <div className="admin-users-filter-anchor"><FilterPopover
      label="Filter Releases"
      active={type !== 'all'}
      hideTrigger
      popoverClassName="admin-users-filter-popover"
      popoverStyle={{ position: 'fixed', zIndex: 1200, top: 'calc(var(--os-topbar-height) + 8px)', right: 'var(--os-content-inset)', left: 'auto', width: 'min(220px, calc(100vw - (var(--os-content-inset) * 2)))' }}
    >
      {({ close }) => <div role="menu" aria-label="Filter Releases">{RELEASE_TYPES.map(([value, label]) => <button
        key={value}
        type="button"
        role="menuitemradio"
        aria-checked={type === value}
        className={type === value ? 'ui44-paper-menu-item ui44-paper-menu-item-selected page-filter-option page-filter-option-active' : 'ui44-paper-menu-item page-filter-option'}
        onClick={() => { router.push(buildHref(search.trim(), value)); close(); }}
      >{label}</button>)}</div>}
    </FilterPopover></div>
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
    <section className="dashboard-section admin-users-results">
      {loading ? <div className="ui44-loading-shell" role="status" aria-label="Loading releases" /> : visibleRows.length ? <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip admin-users-list admin-releases-list" role="list" aria-label="Releases">
        {visibleRows.map(item => <ReleaseRow key={item.item_id} item={item} />)}
      </div> : rows.length >= total ? <EmptyMessage>No releases match this view.</EmptyMessage> : null}
      {rows.length < total ? <div ref={moreRef} className="admin-releases-load-more" role={loadingMore ? 'status' : undefined} aria-label={loadingMore ? 'Loading more releases' : undefined}>{loadingMore ? 'Loading more releases…' : null}</div> : null}
    </section>
  </main></PageShell>;
}

function matchesReleaseType(item: AdminContentRow, type: string) {
  if (type === 'all') return true;
  const experience = item.experience_type.toLowerCase();
  const subtypes = `${item.item_type} ${item.assigned_type ?? ''}`.toLowerCase();
  const isBeat = experience === 'music' && /(beat|instrumental|acapella)/.test(subtypes);
  if (type === 'asset') return experience === 'asset' || isBeat;
  if (type === 'music') return experience === 'music' && !isBeat;
  return experience === type;
}

function ReleaseRow({ item }: { item: AdminContentRow }) {
  return <Link href={`/admin/content/${item.item_id}`} className="dashboard-list-row studio-overview-row ui44-list-row ui44-list-row-dashboard ui44-list-row-interactive admin-release-row" role="listitem">
    <span className={`studio-overview-artwork${item.cover_url ? '' : ' admin-release-artwork-empty'}`} aria-hidden="true">
      {item.cover_url ? <Image className="studio-overview-artwork-image" src={item.cover_url} alt="" width={56} height={56} unoptimized /> : '44'}
    </span>
    <span className="studio-overview-copy">
      <span className="studio-overview-title">{item.title}</span>
      <span className="studio-overview-subtitle">{item.creator_name || 'Unknown creator'}</span>
    </span>
    <span className="studio-overview-trailing"><span className="studio-overview-chevron" aria-hidden="true">›</span></span>
  </Link>;
}
