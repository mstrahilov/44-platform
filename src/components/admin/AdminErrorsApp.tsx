'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmptyMessage, HubHero, PageShell } from '@/components/Ui';
import { Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';
import { AdminAccessBoundary, AdminPager, AdminStatusBadge, formatAdminDate } from '@/components/admin/AdminPrimitives';
import { listAdminErrorEvents, type AdminErrorEvent } from '@/lib/domain/adminOperations';

export default function AdminErrorsApp() {
  return <AdminAccessBoundary><ErrorsDirectory /></AdminAccessBoundary>;
}

function ErrorsDirectory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const path = searchParams.get('path') || '';
  const range = searchParams.get('range') || '24h';
  const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);
  const [search, setSearch] = useState(path);
  const [rows, setRows] = useState<AdminErrorEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => { Promise.resolve().then(() => setSearch(path)); }, [path]);
  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => { if (alive) { setLoading(true); setError(''); } });
    void listAdminErrorEvents({ path, since: sinceForRange(range), page }).then(result => {
      if (!alive) return;
      setRows(result.rows); setTotal(result.total); setLoading(false);
    }).catch(loadError => {
      if (!alive) return;
      setError(loadError instanceof Error ? loadError.message : 'Could not load operational errors.'); setLoading(false);
    });
    return () => { alive = false; };
  }, [page, path, range]);

  function buildHref(nextPage: number, nextPath = path, nextRange = range) {
    const params = new URLSearchParams();
    if (nextPath) params.set('path', nextPath);
    if (nextRange !== '24h') params.set('range', nextRange);
    if (nextPage > 1) params.set('page', String(nextPage));
    return `/admin/errors${params.size ? `?${params}` : ''}`;
  }
  function submit(event: FormEvent) { event.preventDefault(); router.push(buildHref(1, search.trim())); }

  async function copyDigest(event: AdminErrorEvent) {
    if (!event.error_digest) return;
    await navigator.clipboard.writeText(event.error_digest);
    setCopied(event.id);
    window.setTimeout(() => setCopied(''), 1500);
  }

  return <PageShell><main className="admin-page">
    <HubHero title="Operational errors" copy="Sanitized application events without request bodies, user content, credentials, or tokens." />
    <form className="admin-filter-bar ui44-panel" onSubmit={submit}>
      <label><span>Route</span><Ui44TextInput value={search} onChange={event => setSearch(event.target.value)} placeholder="/store, /studio…" /></label>
      <label><span>Time</span><Ui44SelectInput value={range} onChange={event => router.push(buildHref(1, search.trim(), event.target.value))}><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="all">All time</option></Ui44SelectInput></label>
      <button className="os-button os-button-secondary" type="submit">Filter</button>
    </form>
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
    {loading ? <div className="ui44-loading-shell" role="status" aria-label="Loading errors" /> : rows.length === 0 ? <EmptyMessage>No operational errors match this view.</EmptyMessage> : <>
      <div className="admin-log-list" role="list" aria-label="Operational error events">{rows.map(event => <article className="admin-log-entry ui44-panel" role="listitem" key={event.id}>
        <header><span><AdminStatusBadge tone="danger">{event.runtime}</AdminStatusBadge><strong>{event.error_name}</strong></span><time dateTime={event.occurred_at}>{formatAdminDate(event.occurred_at, true)}</time></header>
        <code>{event.method} {event.path}</code>
        {event.safe_message ? <p>{event.safe_message}</p> : null}
        <footer><span>Release {event.release.slice(0, 20)}{event.error_code ? ` · ${event.error_code}` : ''}</span>{event.error_digest ? <button type="button" onClick={() => { void copyDigest(event); }}>{copied === event.id ? 'Copied' : `Copy digest ${event.error_digest.slice(0, 10)}…`}</button> : null}</footer>
      </article>)}</div>
      <AdminPager page={page} total={total} hrefForPage={nextPage => buildHref(nextPage)} />
    </>}
  </main></PageShell>;
}

function sinceForRange(range: string) {
  if (range === 'all') return null;
  const hours = range === '7d' ? 24 * 7 : 24;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}
