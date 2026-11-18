'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { EmptyMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { AdminAccessBoundary, AdminActionDialog, AdminAvatar, AdminStatusBadge, formatAdminDate } from '@/components/admin/AdminPrimitives';
import { banAdminUser, getAdminPersonDetail, reviewAdminCreatorAccessRequest, setAdminCreatorAccess, setAdminPlatformAccess, type AdminPersonDetailSummary } from '@/lib/domain/adminOperations';
import { countryName } from '@/lib/marketPreferences';
import { OS44Button } from '@/components/OS44Button';
import { useTopbarOverflow } from '@/components/TopbarContext';

export default function AdminPersonDetailApp({ profileId }: { profileId: string }) {
  return <AdminAccessBoundary><PersonDetail profileId={profileId} /></AdminAccessBoundary>;
}

function PersonDetail({ profileId }: { profileId: string }) {
  const [detail, setDetail] = useState<AdminPersonDetailSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banned, setBanned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const role = detail?.profile?.role || 'member';
  const nextRole = role === 'creator' ? 'member' : 'creator';
  const creatorActionLabel = role === 'creator'
    ? 'Return to Member'
    : detail?.creator_request?.status === 'pending' ? 'Approve Creator' : 'Promote to Creator';
  const overflowActions = useMemo(() => {
    if (!detail) return undefined;
    return [
      ...(role !== 'admin' ? [{ id: 'creator-role', label: creatorActionLabel, onSelect: () => setRoleDialogOpen(true) }] : []),
      ...(role !== 'admin' ? [{ id: 'admin-role', label: 'Promote to Admin', onSelect: () => setAdminDialogOpen(true) }] : []),
      ...(!banned ? [{ id: 'ban-user', label: 'Ban User', danger: true, onSelect: () => setBanDialogOpen(true) }] : []),
    ];
  }, [banned, creatorActionLabel, detail, role]);
  useTopbarOverflow(overflowActions);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => { if (alive) { setLoading(true); setError(''); } });
    void getAdminPersonDetail(profileId).then(data => { if (alive) { setDetail(data); setLoading(false); } }).catch(loadError => {
      if (alive) { setError(loadError instanceof Error ? loadError.message : 'Could not load this account.'); setLoading(false); }
    });
    return () => { alive = false; };
  }, [profileId, reloadKey]);

  if (loading) return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading account" /></PageShell>;
  if (!detail) return <PageShell><EmptyMessage>{error || 'Account not found.'}</EmptyMessage></PageShell>;

  const profile = detail.profile;
  const name = profile?.display_name || profile?.username || detail.account.email || 'Unnamed account';
  const activeItems = detail.items.filter(item => item.status !== 'archived');
  const archivedItems = detail.items.filter(item => item.status === 'archived');

  async function updateCreatorRole(reason: string) {
    setSaving(true); setError(''); setMessage('');
    try {
      if (nextRole === 'creator' && detail?.creator_request?.status === 'pending') {
        await reviewAdminCreatorAccessRequest(profileId, 'approved', reason);
      } else {
        await setAdminCreatorAccess(profileId, nextRole, reason);
      }
      setRoleDialogOpen(false);
      setMessage(nextRole === 'creator'
        ? detail?.creator_request?.status === 'pending' ? 'Creator request approved.' : 'Creator access granted.'
        : 'Returned to member access.');
      setReloadKey(value => value + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Creator access could not be changed.');
    } finally { setSaving(false); }
  }

  async function promoteToAdmin(reason: string) {
    setSaving(true); setError(''); setMessage('');
    try {
      await setAdminPlatformAccess(profileId, reason);
      setAdminDialogOpen(false);
      setMessage('Administrator access granted.');
      setReloadKey(value => value + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Administrator access could not be granted.');
    } finally { setSaving(false); }
  }

  async function banUser(reason: string) {
    setSaving(true); setError(''); setMessage('');
    try {
      await banAdminUser(profileId, reason);
      setBanDialogOpen(false);
      setBanned(true);
      setMessage('User banned until January 1, 2099.');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'User could not be banned.');
    } finally { setSaving(false); }
  }

  return <PageShell><main className="dashboard-page admin-page admin-person-detail-page">
    <HubHero title={name} hideDivider />
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
    {message ? <div className="dashboard-status dashboard-status-success ui44-status ui44-status-success" role="status">{message}</div> : null}

    <div className="admin-person-overview">
      <Ui44Panel overflow="visible" className="admin-detail-card admin-person-detail-card">
        <div className="admin-person-hero admin-person-detail-identity">
          <AdminAvatar src={profile?.avatar_url} name={name} size={56} />
          <div className="admin-person-detail-name">
            <div className="admin-person-detail-name-row"><h2>{name}</h2><AdminStatusBadge tone={role === 'creator' ? 'success' : role === 'admin' ? 'warning' : 'quiet'}>{role}</AdminStatusBadge></div>
            <p>{profile?.username ? `@${profile.username}` : 'No username'}</p>
          </div>
        </div>
      </Ui44Panel>

      <section aria-label="User details">
        <Ui44Panel overflow="visible" className="admin-detail-card admin-person-details-card">
          <dl className="admin-fact-grid admin-person-detail-facts">
            <div><dt>Email</dt><dd>{detail.account.email || 'Not provided'}</dd></div>
            <div><dt>Joined</dt><dd>{formatAdminDate(detail.account.created_at, true)}</dd></div>
            <div><dt>Last Active</dt><dd>{formatAdminDate(detail.profile?.last_active_at || detail.profile?.last_community_activity_at || detail.account.last_sign_in_at, true)}</dd></div>
            {profile?.country_code ? <div><dt>Country</dt><dd>{countryName(profile.country_code)}</dd></div> : null}
          </dl>
        </Ui44Panel>
      </section>
    </div>

    <section className="dashboard-section">
      <SectionHeader title="Releases" />
      {activeItems.length === 0 ? <EmptyMessage>No active releases are assigned to this account.</EmptyMessage> : <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip admin-person-release-list">
        {activeItems.map(item => <Link key={item.id} href={`/admin/content/${item.id}`} className="dashboard-list-row studio-overview-row ui44-list-row ui44-list-row-dashboard ui44-list-row-interactive admin-release-row">
          <span className={`studio-overview-artwork${item.cover_url ? '' : ' admin-release-artwork-empty'}`} aria-hidden="true">
            {item.cover_url ? <Image className="studio-overview-artwork-image" src={item.cover_url} alt="" width={56} height={56} unoptimized /> : '44'}
          </span>
          <span className="studio-overview-copy">
            <span className="studio-overview-title">{item.title}</span>
            <span className="studio-overview-subtitle">{item.item_type}</span>
          </span>
          <span className="studio-overview-trailing"><span className="studio-overview-chevron" aria-hidden="true">›</span></span>
        </Link>)}
      </div>}
    </section>

    {archivedItems.length ? <section className="dashboard-section">
      <SectionHeader title="Archived Releases" />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip admin-person-release-list">
        {archivedItems.map(item => <Link key={item.id} href={`/admin/content/${item.id}`} className="dashboard-list-row studio-overview-row ui44-list-row ui44-list-row-dashboard ui44-list-row-interactive admin-release-row">
          <span className={`studio-overview-artwork${item.cover_url ? '' : ' admin-release-artwork-empty'}`} aria-hidden="true">
            {item.cover_url ? <Image className="studio-overview-artwork-image" src={item.cover_url} alt="" width={56} height={56} unoptimized /> : '44'}
          </span>
          <span className="studio-overview-copy">
            <span className="studio-overview-title">{item.title}</span>
            <span className="studio-overview-subtitle">{item.item_type}</span>
          </span>
          <span className="studio-overview-trailing"><span className="studio-overview-chevron" aria-hidden="true">›</span></span>
        </Link>)}
      </div>
    </section> : null}

    <AdminActionDialog open={roleDialogOpen} title={creatorActionLabel} description={nextRole === 'creator'
      ? detail.creator_request?.status === 'pending'
        ? 'This approves the pending Creator request and grants Creator access. Enter a reason to continue.'
        : 'This grants Creator access and starts the documented manual paperwork follow-up. Enter a reason to continue.'
      : 'This account will lose Studio publishing access. Existing releases and history remain. Enter a reason to continue.'} confirmLabel="Proceed" danger={nextRole === 'member'} reasonRequired saving={saving} onClose={() => setRoleDialogOpen(false)} onConfirm={updateCreatorRole} />
    <AdminActionDialog open={adminDialogOpen} title="Promote to Admin" description="This grants administrator access to the control center and its management tools. Enter a reason to continue." confirmLabel="Proceed" reasonRequired saving={saving} onClose={() => setAdminDialogOpen(false)} onConfirm={promoteToAdmin} />
    <AdminActionDialog open={banDialogOpen} title="Ban User" description="This permanently blocks this account from signing in until January 1, 2099. Enter a reason to continue." confirmLabel="Proceed" danger reasonRequired saving={saving} onClose={() => setBanDialogOpen(false)} onConfirm={banUser} />
  </main></PageShell>;
}
