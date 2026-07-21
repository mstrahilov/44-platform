'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmptyMessage, HubHero, PageShell } from '@/components/Ui';
import { Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';
import { AdminAccessBoundary, AdminAvatar, AdminPager, AdminStatusBadge, formatAdminDate } from '@/components/admin/AdminPrimitives';
import { listAdminPeople, type AdminPersonRow } from '@/lib/domain/adminOperations';

export default function AdminPeopleApp() {
  return <AdminAccessBoundary><PeopleDirectory /></AdminAccessBoundary>;
}

function PeopleDirectory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const role = searchParams.get('role') || 'all';
  const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);
  const [search, setSearch] = useState(query);
  const [rows, setRows] = useState<AdminPersonRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { Promise.resolve().then(() => setSearch(query)); }, [query]);
  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => { if (alive) { setLoading(true); setError(''); } });
    void listAdminPeople({ query, role, page }).then(result => {
      if (!alive) return;
      setRows(result.rows); setTotal(result.total); setLoading(false);
    }).catch(loadError => {
      if (!alive) return;
      setError(loadError instanceof Error ? loadError.message : 'Could not load people.'); setLoading(false);
    });
    return () => { alive = false; };
  }, [page, query, role]);

  function buildHref(nextPage: number, nextQuery = query, nextRole = role) {
    const params = new URLSearchParams();
    if (nextQuery) params.set('q', nextQuery);
    if (nextRole !== 'all') params.set('role', nextRole);
    if (nextPage > 1) params.set('page', String(nextPage));
    return `/admin/people${params.size ? `?${params}` : ''}`;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    router.push(buildHref(1, search.trim(), role));
  }

  return <PageShell><main className="admin-page">
    <HubHero title="People" copy="Review Creator requests, Team access, and every 44OS account." />
    <form className="admin-filter-bar ui44-panel" onSubmit={submit}>
      <label><span>Search</span><Ui44TextInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, username, or email" /></label>
      <label><span>Role</span><Ui44SelectInput value={role} onChange={event => router.push(buildHref(1, search.trim(), event.target.value))}>
        <option value="all">All people</option><option value="creator_request">Creator requests</option><option value="team">Team access</option><option value="member">Members</option><option value="creator">Creators</option><option value="admin">Admins</option>
      </Ui44SelectInput></label>
      <button className="os-button os-button-secondary" type="submit">Search</button>
    </form>
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
    {loading ? <div className="ui44-loading-shell" role="status" aria-label="Loading people" /> : rows.length === 0 ? <EmptyMessage>No accounts match this view.</EmptyMessage> : <>
      <div className="admin-record-list ui44-panel" role="list" aria-label="People">
        <div className="admin-record-heading admin-people-grid" aria-hidden="true"><span>Person</span><span>Role</span><span>Joined</span><span>Content</span></div>
        {rows.map(person => <Link key={person.profile_id} href={`/admin/people/${person.profile_id}`} className="admin-record-row admin-people-grid" role="listitem">
          <span className="admin-person-cell"><AdminAvatar src={person.avatar_url} name={person.display_name || person.username || person.email} /><span><strong>{person.display_name || person.username || person.email || 'Unnamed account'}</strong><small>{person.username ? `@${person.username} · ` : ''}{person.email || 'No email'}{person.profile_missing ? ' · Profile missing' : ''}</small></span></span>
          <span className="admin-status-stack">{person.creator_request_status === 'pending'
            ? <AdminStatusBadge tone="warning">Creator request</AdminStatusBadge>
            : <AdminStatusBadge tone={person.profile_role === 'creator' ? 'success' : person.profile_role === 'admin' ? 'warning' : 'quiet'}>{person.profile_role}</AdminStatusBadge>}
            {person.team_access ? <AdminStatusBadge tone="success">Team</AdminStatusBadge> : null}</span>
          <time dateTime={person.signed_up_at}>{formatAdminDate(person.signed_up_at)}</time>
          <span className="admin-row-count">{person.item_count}<span aria-hidden="true">›</span></span>
        </Link>)}
      </div>
      <AdminPager page={page} total={total} hrefForPage={nextPage => buildHref(nextPage)} />
    </>}
  </main></PageShell>;
}
