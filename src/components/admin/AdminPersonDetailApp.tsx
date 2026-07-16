'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { AdminAccessBoundary, AdminActionDialog, AdminAvatar, AdminStatusBadge, formatAdminDate } from '@/components/admin/AdminPrimitives';
import { getAdminPersonDetail, setAdminCreatorAccess, type AdminPersonDetail } from '@/lib/domain/adminOperations';

export default function AdminPersonDetailApp({ profileId }: { profileId: string }) {
  return <AdminAccessBoundary><PersonDetail profileId={profileId} /></AdminAccessBoundary>;
}

function PersonDetail({ profileId }: { profileId: string }) {
  const [detail, setDetail] = useState<AdminPersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
  const role = profile?.role || 'member';
  const nextRole = role === 'creator' ? 'member' : 'creator';

  async function changeRole(reason: string) {
    setSaving(true); setError(''); setMessage('');
    try {
      await setAdminCreatorAccess(profileId, nextRole, reason);
      setDialogOpen(false);
      setMessage(nextRole === 'creator' ? 'Creator access granted.' : 'Creator access removed.');
      setReloadKey(value => value + 1);
    } finally { setSaving(false); }
  }

  return <PageShell><main className="admin-page">
    <div className="admin-back-row"><Link href="/admin/people">‹ All people</Link></div>
    <HubHero title={name} copy="Account details, creator access, authored content, and administrator history." />
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
    {message ? <div className="dashboard-status dashboard-status-success ui44-status ui44-status-success" role="status">{message}</div> : null}

    <Ui44Panel overflow="visible" className="admin-detail-card">
      <div className="admin-person-hero"><AdminAvatar src={profile?.avatar_url} name={name} size={72} /><div><h2>{name}</h2><p>{profile?.username ? `@${profile.username}` : 'No username'} · {detail.account.email || 'No email'}</p></div><AdminStatusBadge tone={role === 'creator' ? 'success' : role === 'admin' ? 'warning' : 'quiet'}>{role}</AdminStatusBadge></div>
      <dl className="admin-fact-grid">
        <div><dt>Email confirmed</dt><dd>{detail.account.email_confirmed_at ? formatAdminDate(detail.account.email_confirmed_at, true) : 'Not confirmed'}</dd></div>
        <div><dt>Last sign-in</dt><dd>{formatAdminDate(detail.account.last_sign_in_at, true)}</dd></div>
        <div><dt>Joined</dt><dd>{formatAdminDate(detail.account.created_at, true)}</dd></div>
        <div><dt>Creator type</dt><dd>{profile?.creator_type || 'Not specified'}</dd></div>
      </dl>
      {role !== 'admin' ? <div className="admin-detail-actions"><button className={nextRole === 'member' ? 'os-button os-button-danger' : 'os-button os-button-primary'} type="button" onClick={() => setDialogOpen(true)}>{nextRole === 'creator' ? 'Grant Creator Access' : 'Return to Member'}</button></div> : <p className="admin-detail-note">Administrator access is visible here but cannot be changed from the web control center.</p>}
    </Ui44Panel>

    <section className="dashboard-section"><SectionHeader title="Authored content" description={`${detail.items.length} Item${detail.items.length === 1 ? '' : 's'}`} />
      {detail.items.length === 0 ? <EmptyMessage>No content is assigned to this account.</EmptyMessage> : <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        {detail.items.map(item => <Link key={item.id} href={`/admin/content/${item.id}`} className="dashboard-list-row ui44-list-row ui44-list-row-dashboard ui44-list-row-interactive"><span className="dashboard-row-copy"><strong className="dashboard-row-title">{item.title}</strong><span className="dashboard-row-subtitle">{item.item_type} · {formatAdminDate(item.created_at)}</span></span><AdminStatusBadge tone={item.status === 'published' ? 'success' : item.status === 'archived' ? 'danger' : 'quiet'}>{item.status}</AdminStatusBadge></Link>)}
      </div>}
    </section>

    <section className="dashboard-section"><SectionHeader title="Role history" description="Immutable administrator actions" />
      {detail.role_history.length === 0 ? <EmptyMessage>No administrator role changes have been recorded.</EmptyMessage> : <div className="admin-history-list ui44-panel">{detail.role_history.map(event => <div className="admin-history-row" key={event.id}><div><strong>{event.previous_role} → {event.new_role}</strong><p>{event.reason}</p></div><span>{event.changed_by}<time dateTime={event.created_at}>{formatAdminDate(event.created_at, true)}</time></span></div>)}</div>}
    </section>

    <AdminActionDialog open={dialogOpen} title={nextRole === 'creator' ? 'Grant creator access' : 'Return account to member'} description={nextRole === 'creator' ? 'This account will gain Studio publishing access.' : 'This account will lose Studio publishing access. Existing content and history remain.'} confirmLabel={nextRole === 'creator' ? 'Grant Access' : 'Change to Member'} danger={nextRole === 'member'} saving={saving} onClose={() => setDialogOpen(false)} onConfirm={changeRole} />
  </main></PageShell>;
}
