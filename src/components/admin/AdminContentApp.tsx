'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmptyMessage, HubHero, PageShell } from '@/components/Ui';
import { Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';
import { AdminAccessBoundary, AdminPager, AdminStatusBadge, formatAdminDate } from '@/components/admin/AdminPrimitives';
import { listAdminContent, type AdminContentRow } from '@/lib/domain/adminOperations';

export default function AdminContentApp() {
  return <AdminAccessBoundary><ContentDirectory /></AdminAccessBoundary>;
}

function ContentDirectory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const status = searchParams.get('status') || 'all';
  const type = searchParams.get('type') || 'all';
  const sort = searchParams.get('sort') === 'release_date' ? 'release_date' : 'created';
  const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);
  const [search, setSearch] = useState(query);
  const [rows, setRows] = useState<AdminContentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { Promise.resolve().then(() => setSearch(query)); }, [query]);
  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => { if (alive) { setLoading(true); setError(''); } });
    void listAdminContent({ query, status, type, sort, page }).then(result => {
      if (!alive) return;
      setRows(result.rows); setTotal(result.total); setLoading(false);
    }).catch(loadError => {
      if (!alive) return;
      setError(loadError instanceof Error ? loadError.message : 'Could not load content.'); setLoading(false);
    });
    return () => { alive = false; };
  }, [page, query, sort, status, type]);

  function buildHref(nextPage: number, nextQuery = query, nextStatus = status, nextType = type, nextSort = sort) {
    const params = new URLSearchParams();
    if (nextQuery) params.set('q', nextQuery);
    if (nextStatus !== 'all') params.set('status', nextStatus);
    if (nextType !== 'all') params.set('type', nextType);
    if (nextSort !== 'created') params.set('sort', nextSort);
    if (nextPage > 1) params.set('page', String(nextPage));
    return `/admin/content${params.size ? `?${params}` : ''}`;
  }

  function submit(event: FormEvent) { event.preventDefault(); router.push(buildHref(1, search.trim())); }

  return <PageShell><main className="admin-page">
    <HubHero title="Content" copy="Inspect every Item, review pending submissions, and manage publication state." />
    <form className="admin-filter-bar admin-filter-bar-content ui44-panel" onSubmit={submit}>
      <label><span>Search</span><Ui44TextInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Release or creator" /></label>
      <label><span>Status</span><Ui44SelectInput value={status} onChange={event => router.push(buildHref(1, search.trim(), event.target.value, type))}>
        <option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option><option value="pending">Pending review</option><option value="approved">Approved review</option><option value="rejected">Rejected review</option>
      </Ui44SelectInput></label>
      <label><span>Type</span><Ui44SelectInput value={type} onChange={event => router.push(buildHref(1, search.trim(), status, event.target.value))}>
        <option value="all">All types</option><option value="music">Music</option><option value="book">Books</option><option value="asset">Sample Packs</option><option value="merch">Merch</option><option value="game">Games</option><option value="beat">Beats</option>
      </Ui44SelectInput></label>
      <label><span>Sort</span><Ui44SelectInput value={sort} onChange={event => router.push(buildHref(1, search.trim(), status, type, event.target.value))}>
        <option value="created">Recently created</option><option value="release_date">Newest release date</option>
      </Ui44SelectInput></label>
      <button className="os-button os-button-secondary" type="submit">Search</button>
    </form>
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
    {loading ? <div className="ui44-loading-shell" role="status" aria-label="Loading content" /> : rows.length === 0 ? <EmptyMessage>No content matches this view.</EmptyMessage> : <>
      <div className="admin-record-list ui44-panel" role="list" aria-label="Content">
        <div className="admin-record-heading admin-content-grid" aria-hidden="true"><span>Content</span><span>Creator</span><span>Publication</span><span>Review</span><span>{sort === 'release_date' ? 'Release Date' : 'Created'}</span></div>
        {rows.map(item => <Link key={item.item_id} href={`/admin/content/${item.item_id}`} className="admin-record-row admin-content-grid" role="listitem">
          <span className="admin-content-cell">{item.cover_url ? <span className="admin-content-art" style={{ backgroundImage: `url(${item.cover_url})` }} /> : <span className="admin-content-art admin-content-art-empty" aria-hidden="true" />}<span><strong>{item.title}</strong><small>{item.assigned_type || item.item_type}</small></span></span>
          <span className="admin-row-secondary">{item.creator_name || 'Unknown'}{item.creator_username ? <small>@{item.creator_username}</small> : null}</span>
          <AdminStatusBadge tone={item.publication_status === 'published' ? 'success' : item.publication_status === 'archived' ? 'danger' : 'quiet'}>{item.publication_status}</AdminStatusBadge>
          <AdminStatusBadge tone={item.review_status === 'pending' ? 'warning' : item.review_status === 'approved' ? 'success' : item.review_status === 'rejected' ? 'danger' : 'quiet'}>{item.review_status}</AdminStatusBadge>
          <span className="admin-row-count">{sort === 'release_date' ? (item.release_date ? <time dateTime={item.release_date}>{formatAdminDate(item.release_date)}</time> : <span className="admin-row-missing-date">No release date</span>) : <time dateTime={item.created_at}>{formatAdminDate(item.created_at)}</time>}<span aria-hidden="true">›</span></span>
        </Link>)}
      </div>
      <AdminPager page={page} total={total} hrefForPage={nextPage => buildHref(nextPage)} />
    </>}
  </main></PageShell>;
}
