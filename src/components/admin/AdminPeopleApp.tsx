'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmptyMessage, HubHero, PageShell } from '@/components/Ui';
import { Ui44TextInput } from '@/components/ui44/Inputs';
import { AdminAccessBoundary, AdminAvatar } from '@/components/admin/AdminPrimitives';
import { listAdminPeople, type AdminPersonRow } from '@/lib/domain/adminOperations';
import { FilterPopover } from '@/components/FilterPopover';
import { useTopbarBack, useTopbarMobileTrailingAction } from '@/components/TopbarContext';

const PREVIEW_PENDING_CREATOR: AdminPersonRow = {
  profile_id: 'preview-pending-creator',
  email: null,
  email_confirmed_at: null,
  last_sign_in_at: null,
  signed_up_at: '2026-11-18T12:00:00.000Z',
  display_name: 'Sample Creator',
  username: 'samplecreator',
  avatar_url: null,
  profile_role: 'member',
  creator_type: null,
  item_count: 0,
  profile_missing: false,
  creator_request_status: 'pending',
  creator_request_requested_at: '2026-11-18T12:00:00.000Z',
  team_access: false,
  total_count: 1,
};

export default function AdminPeopleApp() {
  return <AdminAccessBoundary><PeopleDirectory /></AdminAccessBoundary>;
}

function PeopleDirectory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const requestedRole = searchParams.get('role') || 'all';
  const role = ['all', 'member', 'creator', 'admin', 'creator_request'].includes(requestedRole) ? requestedRole : 'all';
  const showPendingPreview = process.env.NODE_ENV === 'development' && searchParams.get('previewPending') === '1';
  const [search, setSearch] = useState(query);
  const [rows, setRows] = useState<AdminPersonRow[]>([]);
  const [pendingRows, setPendingRows] = useState<AdminPersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const visiblePendingRows = showPendingPreview ? [PREVIEW_PENDING_CREATOR] : pendingRows;
  const visibleRows = [...visiblePendingRows, ...rows];
  useTopbarBack({ href: '/admin', label: 'Admin', alwaysNavigate: true });
  const mobileFilterAction = useMemo(() => <button
    type="button"
    data-filter-popover-trigger="true"
    aria-pressed={role !== 'all'}
    className={`ui44-symbol-button ui44-symbol-button-filter page-filter-button${role !== 'all' ? ' ui44-symbol-button-active page-filter-button-active' : ''}`}
    aria-label="Filter Users"
    title="Filter Users"
    onClick={() => window.dispatchEvent(new CustomEvent('44:toggle-filter-popover', { detail: { label: 'Filter Users' } }))}
  ><span className="page-filter-icon" aria-hidden="true"><i /><i /><i /></span></button>, [role]);
  useTopbarMobileTrailingAction(mobileFilterAction);

  useEffect(() => { Promise.resolve().then(() => setSearch(query)); }, [query]);
  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => { if (alive) { setLoading(true); setError(''); } });
    const usersRequest = role === 'creator_request' ? Promise.resolve([] as AdminPersonRow[]) : listAdminPeople({ query, role: role === 'creator' ? 'all' : role });
    const pendingRequest = listAdminPeople({ query, role: 'creator_request' });
    void Promise.all([usersRequest, pendingRequest]).then(([nextRows, nextPendingRows]) => {
      if (!alive) return;
      const matchingRows = role === 'creator' ? nextRows.filter(isCreatorAccount) : nextRows;
      setRows(matchingRows.filter(person => person.creator_request_status !== 'pending'));
      setPendingRows(nextPendingRows.filter(person => person.creator_request_status === 'pending'));
      setLoading(false);
    }).catch(loadError => {
      if (!alive) return;
      setError(loadError instanceof Error ? loadError.message : 'Could not load users.'); setLoading(false);
    });
    return () => { alive = false; };
  }, [query, role]);

  function buildHref(nextQuery = query, nextRole = role) {
    const params = new URLSearchParams();
    if (nextQuery) params.set('q', nextQuery);
    if (nextRole !== 'all') params.set('role', nextRole);
    return `/admin/people${params.size ? `?${params}` : ''}`;
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (window.location.pathname !== '/admin/people') return;
      const params = new URLSearchParams(searchParams.toString());
      if (search.trim()) params.set('q', search.trim());
      else params.delete('q');
      if (role !== 'all') params.set('role', role);
      else params.delete('role');
      const nextSearch = params.toString();
      if (nextSearch !== searchParams.toString()) {
        router.replace(`/admin/people${nextSearch ? `?${nextSearch}` : ''}`, { scroll: false });
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [role, router, search, searchParams]);

  return <PageShell><main className="dashboard-page admin-page admin-users-page">
    <HubHero title="Users" hideDivider />
    <div className="admin-users-search">
      <span className="os-icon os-icon-search os-icon-sm admin-users-search-icon" aria-hidden="true" />
      <Ui44TextInput surface="bare" type="search" className="admin-users-search-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Filter users" aria-label="Filter users" />
    </div>
    <div className="admin-users-filter-anchor"><FilterPopover
      label="Filter Users"
      active={role !== 'all'}
      hideTrigger
      popoverClassName="admin-users-filter-popover"
      popoverStyle={{ position: 'fixed', zIndex: 1200, top: 'calc(var(--os-topbar-height) + 8px)', right: 'var(--os-content-inset)', left: 'auto', width: 'min(220px, calc(100vw - (var(--os-content-inset) * 2)))' }}
    >
      {({ close }) => <div role="menu" aria-label="Filter Users">{[
        ['all', 'All users'], ['member', 'Members'], ['creator', 'Creators'], ['admin', 'Admins'],
      ].map(([value, label]) => <button
        key={value}
        type="button"
        role="menuitemradio"
        aria-checked={role === value}
        className={role === value ? 'ui44-paper-menu-item ui44-paper-menu-item-selected page-filter-option page-filter-option-active' : 'ui44-paper-menu-item page-filter-option'}
        onClick={() => { router.push(buildHref(search.trim(), value)); close(); }}
      >{label}</button>)}</div>}
    </FilterPopover></div>
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
    <section className="dashboard-section admin-users-results">
      {loading ? <div className="ui44-loading-shell" role="status" aria-label="Loading users" /> : <>
        {visibleRows.length > 0 ? <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip admin-users-list" role="list" aria-label="Users">
          {visibleRows.map(person => person.creator_request_status === 'pending'
            ? <PendingRequestRow key={person.profile_id} person={person} previewOnly={showPendingPreview && person.profile_id === PREVIEW_PENDING_CREATOR.profile_id} />
            : <Link key={person.profile_id} href={`/admin/people/${person.profile_id}`} className="dashboard-list-row ui44-list-row ui44-list-row-interactive admin-user-row" role="listitem">
              <AdminAvatar src={person.avatar_url} name={person.display_name || person.username} />
              <span className="admin-user-copy"><strong>{person.display_name || person.username || 'Unnamed account'}</strong><small>{person.username ? `@${person.username}` : 'No username'}</small></span>
              <span className="admin-user-chevron" aria-hidden="true">›</span>
            </Link>)}
        </div> : null}
        {visibleRows.length === 0 ? <EmptyMessage>No users match this view.</EmptyMessage> : null}
      </>}
    </section>
  </main></PageShell>;
}

function PendingRequestRow({ person, previewOnly }: { person: AdminPersonRow; previewOnly: boolean }) {
  const className = 'dashboard-list-row ui44-list-row ui44-list-row-interactive admin-user-row admin-user-request-row';
  const content = <>
    <AdminAvatar src={person.avatar_url} name={person.display_name || person.username} />
    <span className="admin-user-copy"><strong>{person.display_name || person.username || 'Unnamed account'}</strong><small>{person.username ? `@${person.username}` : 'No username'}</small></span>
    <span className="admin-user-request-meta"><span className="admin-user-request-pill">Pending</span><span className="admin-user-chevron" aria-hidden="true">›</span></span>
  </>;
  return previewOnly
    ? <div className={className} role="listitem" aria-label="Pending creator request preview">{content}</div>
    : <Link href={`/admin/people/${person.profile_id}`} className={className} role="listitem">{content}</Link>;
}

function isCreatorAccount(person: AdminPersonRow) {
  return person.profile_role === 'creator'
    || (person.profile_role === 'admin' && (Boolean(person.creator_type) || person.item_count > 0));
}
