'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { AdminAccessBoundary, AdminActionDialog, AdminAvatar, AdminStatusBadge, formatAdminDate } from '@/components/admin/AdminPrimitives';
import { getAdminPersonDetail, reviewAdminCreatorAccessRequest, setAdminCreatorAccess, setAdminCreatorPaidSales, setAdminTeamAccess, type AdminPersonDetail } from '@/lib/domain/adminOperations';

export default function AdminPersonDetailApp({ profileId }: { profileId: string }) {
  return <AdminAccessBoundary><PersonDetail profileId={profileId} /></AdminAccessBoundary>;
}

function PersonDetail({ profileId }: { profileId: string }) {
  const [detail, setDetail] = useState<AdminPersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestDialog, setRequestDialog] = useState<'approved' | 'rejected' | null>(null);
  const [paidSalesDialog, setPaidSalesDialog] = useState<'approved' | 'disabled' | 'rebase' | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
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
  const commerce = detail.commerce;
  const creatorRequest = detail.creator_request;

  async function changeRole(reason: string) {
    setSaving(true); setError(''); setMessage('');
    try {
      await setAdminCreatorAccess(profileId, nextRole, reason);
      setDialogOpen(false);
      setMessage(nextRole === 'creator' ? 'Creator access granted.' : 'Creator access removed.');
      setReloadKey(value => value + 1);
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : 'Creator access could not be changed.');
    } finally { setSaving(false); }
  }

  async function reviewCreatorRequest(reason: string) {
    if (!requestDialog) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await reviewAdminCreatorAccessRequest(profileId, requestDialog, reason);
      setRequestDialog(null);
      setMessage(requestDialog === 'approved' ? 'Creator request approved.' : 'Creator request rejected. The account remains a member.');
      setReloadKey(value => value + 1);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Creator request could not be reviewed.');
    } finally { setSaving(false); }
  }

  async function changePaidSales(status: 'approved' | 'disabled' | 'rebase', reason: string) {
    setSaving(true); setError(''); setMessage('');
    try {
      await setAdminCreatorPaidSales(profileId, status === 'rebase' ? 'approved' : status, reason);
      setPaidSalesDialog(null);
      setMessage(status === 'disabled' ? 'Paid digital sales paused. Purchase and entitlement history is preserved.' : status === 'rebase' ? 'The 30-day manual paperwork follow-up was re-based and recorded.' : 'Paid digital sales restored with a new 30-day paperwork follow-up.');
      setReloadKey(value => value + 1);
    } catch (salesError) {
      setError(salesError instanceof Error ? salesError.message : 'Paid-sales access could not be changed.');
    } finally { setSaving(false); }
  }

  async function changeTeamAccess(reason: string) {
    const enabled = !detail!.team.authorized;
    setSaving(true); setError(''); setMessage('');
    try {
      await setAdminTeamAccess(profileId, enabled, reason);
      setTeamDialogOpen(false);
      setMessage(enabled ? 'Team access granted. Email and in-app notices were queued.' : 'Team access revoked immediately.');
      setReloadKey(value => value + 1);
    } catch (teamError) {
      setError(teamError instanceof Error ? teamError.message : 'Team access could not be changed.');
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
      {role !== 'admin' && creatorRequest?.status !== 'pending' ? <div className="admin-detail-actions"><button className={nextRole === 'member' ? 'os-button os-button-danger' : 'os-button os-button-primary'} type="button" onClick={() => setDialogOpen(true)}>{nextRole === 'creator' ? 'Grant Creator Access' : 'Return to Member'}</button></div> : role === 'admin' ? <p className="admin-detail-note">Administrator access is visible here but cannot be changed from the web control center.</p> : <p className="admin-detail-note">This account has a pending Creator request. Review it below.</p>}
    </Ui44Panel>

    <section className="dashboard-section">
      <SectionHeader title="Team workspace" description="Private Brand Guide and published public directories" />
      <Ui44Panel overflow="visible" className="admin-detail-card">
        <div className="admin-person-hero">
          <div><h2>{detail.team.authorized ? 'Team access active' : 'No Team access'}</h2><p>{detail.team.source === 'admin' ? 'Inherited from the Administrator role' : detail.team.source === 'grant' ? 'Additional audited permission' : 'Member or Creator role remains unchanged'}</p></div>
          <AdminStatusBadge tone={detail.team.authorized ? 'success' : 'quiet'}>{detail.team.authorized ? 'Team' : 'Not granted'}</AdminStatusBadge>
        </div>
        {role === 'admin' ? <p className="admin-detail-note">Administrators inherit Team access. No grant row is needed and inherited access cannot be disabled here.</p> : <>
          <div className="admin-detail-actions"><button className={detail.team.authorized ? 'os-button os-button-danger' : 'os-button os-button-primary'} type="button" onClick={() => setTeamDialogOpen(true)}>{detail.team.authorized ? 'Revoke Team Access' : 'Grant Team Access'}</button></div>
          <p className="admin-detail-note">This permission does not change Creator publishing, seller setup, payouts, or public profile behavior. Every change requires an audit reason.</p>
        </>}
      </Ui44Panel>
    </section>

    <section className="dashboard-section"><SectionHeader title="Team access history" description="Immutable grant and revocation decisions" />
      {detail.team.history.length === 0 ? <EmptyMessage>No Team access change has been recorded.</EmptyMessage> : <div className="admin-history-list ui44-panel">{detail.team.history.map(event => <div className="admin-history-row" key={event.id}><div><strong>{event.previousActive ? 'active' : 'not granted'} → {event.newActive ? 'active' : 'revoked'}</strong><p>{event.reason}</p></div><span>{event.changedBy}<time dateTime={event.createdAt}>{formatAdminDate(event.createdAt, true)}</time></span></div>)}</div>}
    </section>

    {creatorRequest ? <section className="dashboard-section">
      <SectionHeader title="Creator access request" description="Creator access requested during account signup" />
      <Ui44Panel overflow="visible" className="admin-detail-card">
        <div className="admin-person-hero">
          <div><h2>{creatorRequest.status === 'pending' ? 'Awaiting review' : `Request ${creatorRequest.status}`}</h2><p>Requested {formatAdminDate(creatorRequest.requested_at, true)}</p></div>
          <AdminStatusBadge tone={creatorRequest.status === 'approved' ? 'success' : creatorRequest.status === 'rejected' ? 'danger' : 'warning'}>{creatorRequest.status}</AdminStatusBadge>
        </div>
        {creatorRequest.reviewed_at ? <dl className="admin-fact-grid">
          <div><dt>Reviewed</dt><dd>{formatAdminDate(creatorRequest.reviewed_at, true)}</dd></div>
          <div><dt>Reviewed by</dt><dd>{creatorRequest.reviewed_by || 'Administrator'}</dd></div>
          <div><dt>Decision reason</dt><dd>{creatorRequest.decision_reason || 'No reason recorded'}</dd></div>
        </dl> : null}
        {creatorRequest.status === 'pending' ? <>
          <div className="admin-detail-actions">
            <button className="os-button os-button-primary" type="button" onClick={() => setRequestDialog('approved')}>Approve Creator Request</button>
            <button className="os-button os-button-danger" type="button" onClick={() => setRequestDialog('rejected')}>Reject Request</button>
          </div>
          <p className="admin-detail-note">Approval follows the existing verified Creator-access workflow. Rejection keeps the account as a member.</p>
        </> : null}
      </Ui44Panel>
    </section> : null}

    {(role === 'creator' || role === 'admin') ? <section className="dashboard-section">
      <SectionHeader title="Creator seller setup" description="Creator promotion plus private tax and Wise email-to-claim readiness" />
      <Ui44Panel overflow="visible" className="admin-detail-card">
        <div className="admin-person-hero">
          <div><h2>{commerce.can_sell_paid ? 'Paid sales enabled' : 'Paid sales unavailable'}</h2><p>Effective state: {commerce.state.replaceAll('_', ' ')}</p></div>
          <AdminStatusBadge tone={commerce.can_sell_paid ? 'success' : commerce.state === 'restricted' || commerce.state === 'country_unavailable' ? 'warning' : 'quiet'}>{commerce.state.replaceAll('_', ' ')}</AdminStatusBadge>
        </div>
        <dl className="admin-fact-grid">
          <div><dt>Creator access</dt><dd>{commerce.admin_status.replaceAll('_', ' ')}</dd></div>
          <div><dt>Paperwork follow-up</dt><dd>{commerce.paperwork_due_at ? formatAdminDate(commerce.paperwork_due_at, true) : 'Not scheduled'}</dd></div>
          <div><dt>Payout provider</dt><dd>{commerce.provider?.replaceAll('_', ' ') || (commerce.is_platform_seller ? '44 platform seller' : 'Not connected')}</dd></div>
          <div><dt>Provider status</dt><dd>{commerce.provider_status?.replaceAll('_', ' ') || 'Not started'}</dd></div>
          <div><dt>Market</dt><dd>{[commerce.country_code, commerce.currency].filter(Boolean).join(' · ') || 'Not reported'}</dd></div>
          <div><dt>Wise transfer mode</dt><dd>{commerce.is_platform_seller ? 'Not applicable' : 'Owner-operated email-to-claim'}</dd></div>
          <div><dt>Decision reason</dt><dd>{commerce.decision_reason || 'No decision recorded'}</dd></div>
        </dl>
        {commerce.requirements_due.length ? <p className="admin-detail-note">Setup state: {commerce.requirements_due.join(', ')}</p> : null}
        {!commerce.is_platform_seller ? <>
          <div className="admin-detail-actions">
            <button className={commerce.admin_status === 'disabled' ? 'os-button os-button-primary' : 'os-button os-button-danger'} type="button" onClick={() => setPaidSalesDialog(commerce.admin_status === 'disabled' ? 'approved' : 'disabled')}>
              {commerce.admin_status === 'disabled' ? 'Restore Paid Digital Sales' : 'Pause Paid Digital Sales'}
            </button>
            {commerce.admin_status === 'approved' ? <button className="os-button os-button-secondary" type="button" onClick={() => setPaidSalesDialog('rebase')}>Restart 30-Day Paperwork Window</button> : null}
          </div>
          <p className="admin-detail-note">The follow-up date is an Admin-only reminder, never an automatic sales switch. Pausing or restoring paid digital sales requires a recorded reason and does not change purchase, entitlement, earnings, tax, or payout history.</p>
        </> : <p className="admin-detail-note">44-owned catalog items use the platform Stripe account and do not require creator payout onboarding.</p>}
      </Ui44Panel>
    </section> : null}

    {(role === 'creator' || role === 'admin') && !commerce.is_platform_seller ? <section className="dashboard-section">
      <SectionHeader title="Paid-sales history" description="Immutable Admin paperwork decisions" />
      {commerce.history.length === 0 ? <EmptyMessage>No paid-sales decision has been recorded.</EmptyMessage> : <div className="admin-history-list ui44-panel">{commerce.history.map(event => <div className="admin-history-row" key={event.id}><div><strong>{event.previous_status || 'not reviewed'} → {event.new_status}</strong><p>{event.reason}</p></div><span>{event.changed_by}<time dateTime={event.created_at}>{formatAdminDate(event.created_at, true)}</time></span></div>)}</div>}
    </section> : null}

    <section className="dashboard-section"><SectionHeader title="Authored content" description={`${detail.items.length} Item${detail.items.length === 1 ? '' : 's'}`} />
      {detail.items.length === 0 ? <EmptyMessage>No content is assigned to this account.</EmptyMessage> : <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        {detail.items.map(item => <Link key={item.id} href={`/admin/content/${item.id}`} className="dashboard-list-row ui44-list-row ui44-list-row-dashboard ui44-list-row-interactive"><span className="dashboard-row-copy"><strong className="dashboard-row-title">{item.title}</strong><span className="dashboard-row-subtitle">{item.item_type} · {formatAdminDate(item.created_at)}</span></span><AdminStatusBadge tone={item.status === 'published' ? 'success' : item.status === 'archived' ? 'danger' : 'quiet'}>{item.status}</AdminStatusBadge></Link>)}
      </div>}
    </section>

    <section className="dashboard-section"><SectionHeader title="Role history" description="Immutable administrator actions" />
      {detail.role_history.length === 0 ? <EmptyMessage>No administrator role changes have been recorded.</EmptyMessage> : <div className="admin-history-list ui44-panel">{detail.role_history.map(event => <div className="admin-history-row" key={event.id}><div><strong>{event.previous_role} → {event.new_role}</strong><p>{event.reason}</p></div><span>{event.changed_by}<time dateTime={event.created_at}>{formatAdminDate(event.created_at, true)}</time></span></div>)}</div>}
    </section>

    <AdminActionDialog open={dialogOpen} title={nextRole === 'creator' ? 'Promote to Creator' : 'Return account to member'} description={nextRole === 'creator' ? 'This records Creator approval and starts the documented manual paperwork follow-up. Tax and Wise onboarding remain separate from digital publication and paid-sale eligibility.' : 'This account will lose Studio publishing access. Existing content and history remain.'} confirmLabel={nextRole === 'creator' ? 'Promote to Creator' : 'Change to Member'} danger={nextRole === 'member'} saving={saving} onClose={() => setDialogOpen(false)} onConfirm={changeRole} />
    <AdminActionDialog open={requestDialog !== null} title={requestDialog === 'approved' ? 'Approve Creator Request' : 'Reject Creator Request'} description={requestDialog === 'approved' ? 'This uses the existing verified Creator-access workflow. Publication access is granted only if the account satisfies its current approval requirements.' : 'The request will be closed and the account will remain a member. Existing Library activity and account history are preserved.'} confirmLabel={requestDialog === 'approved' ? 'Approve Creator Request' : 'Reject Request'} danger={requestDialog === 'rejected'} saving={saving} onClose={() => setRequestDialog(null)} onConfirm={reviewCreatorRequest} />
    <AdminActionDialog open={paidSalesDialog !== null} title={paidSalesDialog === 'disabled' ? 'Pause Paid Digital Sales' : paidSalesDialog === 'rebase' ? 'Restart 30-Day Paperwork Window' : 'Restore Paid Digital Sales'} description={paidSalesDialog === 'disabled' ? 'This removes the Creator’s paid digital offers from sale. Existing purchases, Library access, entitlements, earnings, and audit history are preserved.' : paidSalesDialog === 'rebase' ? 'Use only at the documented launch point. This records a new 30-day Admin paperwork follow-up without changing paid-sale availability, payouts, tax review, Wise readiness, purchases, or entitlements.' : 'This restores the Creator’s paid digital offers and records a new 30-day Admin paperwork follow-up. It does not make payouts, tax review, or Wise readiness eligible.'} confirmLabel={paidSalesDialog === 'disabled' ? 'Pause Paid Sales' : paidSalesDialog === 'rebase' ? 'Restart Paperwork Window' : 'Restore Paid Sales'} danger={paidSalesDialog === 'disabled'} saving={saving} onClose={() => setPaidSalesDialog(null)} onConfirm={reason => changePaidSales(paidSalesDialog!, reason)} />
    <AdminActionDialog open={teamDialogOpen} title={detail.team.authorized ? 'Revoke Team Access' : 'Grant Team Access'} description={detail.team.authorized ? 'Access to the private Brand Guide, directories, and Brand Kit ends immediately. The account role and all public activity remain unchanged.' : 'This adds the private Team workspace without changing Member or Creator status, publishing, seller setup, or payouts.'} confirmLabel={detail.team.authorized ? 'Revoke Team Access' : 'Grant Team Access'} danger={detail.team.authorized} saving={saving} onClose={() => setTeamDialogOpen(false)} onConfirm={changeTeamAccess} />
  </main></PageShell>;
}
