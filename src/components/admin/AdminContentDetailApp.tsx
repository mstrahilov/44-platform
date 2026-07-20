'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { Ui44TextInput } from '@/components/ui44/Inputs';
import { AdminAccessBoundary, AdminActionDialog, AdminStatusBadge, formatAdminDate } from '@/components/admin/AdminPrimitives';
import { decideAdminSubmission, getAdminContentDetail, setAdminItemLifecycle, setAdminItemReleaseDate, setAdminOfferLifecycle, type AdminContentDetail } from '@/lib/domain/adminOperations';

type AdminContentAction = 'approve' | 'reject' | 'publish' | 'unpublish' | 'archive';
type AdminOfferAction = { action: 'pause' | 'restore'; offerId: string };

export default function AdminContentDetailApp({ itemId }: { itemId: string }) {
  return <AdminAccessBoundary><ContentDetail itemId={itemId} /></AdminAccessBoundary>;
}

function ContentDetail({ itemId }: { itemId: string }) {
  const [detail, setDetail] = useState<AdminContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [action, setAction] = useState<AdminContentAction | null>(null);
  const [offerAction, setOfferAction] = useState<AdminOfferAction | null>(null);
  const [releaseDateAction, setReleaseDateAction] = useState(false);
  const [releaseDate, setReleaseDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => { if (alive) { setLoading(true); setError(''); } });
    void getAdminContentDetail(itemId).then(data => { if (alive) { setDetail(data); setReleaseDate(data.item.release_date ?? ''); setLoading(false); } }).catch(loadError => {
      if (alive) { setError(loadError instanceof Error ? loadError.message : 'Could not load this Item.'); setLoading(false); }
    });
    return () => { alive = false; };
  }, [itemId, reloadKey]);

  if (loading) return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading content" /></PageShell>;
  if (!detail) return <PageShell><EmptyMessage>{error || 'Content not found.'}</EmptyMessage></PageShell>;
  const item = detail.item;
  const pending = detail.submissions.find(submission => submission.status === 'pending') ?? null;

  async function completeAction(reason: string) {
    if (!action) return;
    setSaving(true); setError(''); setMessage('');
    try {
      if (action === 'approve' || action === 'reject') {
        if (!pending) throw new Error('This submission is no longer pending.');
        await decideAdminSubmission(pending.id, action === 'approve' ? 'approved' : 'rejected', reason);
      } else {
        await setAdminItemLifecycle(item.id, action, reason);
      }
      setAction(null);
      setMessage(ACTION_COPY[action].success);
      setReloadKey(value => value + 1);
    } finally { setSaving(false); }
  }

  async function completeOfferAction(reason: string) {
    if (!offerAction) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await setAdminOfferLifecycle(offerAction.offerId, offerAction.action, reason);
      setOfferAction(null);
      setMessage(OFFER_ACTION_COPY[offerAction.action].success);
      setReloadKey(value => value + 1);
    } finally { setSaving(false); }
  }

  async function completeReleaseDateAction(reason: string) {
    if (!releaseDate) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await setAdminItemReleaseDate(item.id, releaseDate, reason);
      setReleaseDateAction(false);
      setMessage('Release Date updated.');
      setReloadKey(value => value + 1);
    } finally { setSaving(false); }
  }

  return <PageShell><main className="admin-page">
    <div className="admin-back-row"><Link href="/admin/content">‹ All content</Link></div>
    <HubHero title={item.title} copy="Read-only release details, review history, and approved lifecycle controls." />
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
    {message ? <div className="dashboard-status dashboard-status-success ui44-status ui44-status-success" role="status">{message}</div> : null}

    <Ui44Panel overflow="visible" className="admin-detail-card">
      <div className="admin-content-hero">
        {item.cover_url ? <span className="admin-detail-art" style={{ backgroundImage: `url(${item.cover_url})` }} /> : <span className="admin-detail-art admin-content-art-empty" aria-hidden="true" />}
        <div><span className="admin-detail-eyebrow">{detail.taxonomy.type?.label || item.item_type}</span><h2>{item.title}</h2><p>{detail.creator?.display_name || detail.creator?.username || item.creator}</p><div className="admin-inline-status"><AdminStatusBadge tone={item.status === 'published' ? 'success' : item.status === 'archived' ? 'danger' : 'quiet'}>{item.status}</AdminStatusBadge>{pending ? <AdminStatusBadge tone="warning">pending review</AdminStatusBadge> : null}</div></div>
      </div>
      <dl className="admin-fact-grid">
        <div><dt>Created</dt><dd>{formatAdminDate(item.created_at, true)}</dd></div>
        <div><dt>Updated</dt><dd>{formatAdminDate(item.updated_at, true)}</dd></div>
        <div><dt>Experience</dt><dd>{item.experience_type}</dd></div>
        <div><dt>Release Date</dt><dd>{item.release_date || 'Not set'}</dd></div>
        <div><dt>Fulfillment</dt><dd>{item.fulfillment_type}</dd></div>
        <div><dt>Price</dt><dd>{item.is_free ? 'Free' : formatCurrency(item.price_cents, 'USD')}</dd></div>
        <div><dt>Public URL</dt><dd><Link href={`/store/item/${item.slug}`}>/store/item/{item.slug}</Link></dd></div>
      </dl>
      {!pending && item.status !== 'archived' ? <div className="admin-detail-actions">
        {item.status === 'draft' ? <button className="os-button os-button-primary" type="button" onClick={() => setAction('publish')}>Publish</button> : <button className="os-button os-button-secondary" type="button" onClick={() => setAction('unpublish')}>Unpublish</button>}
        <button className="os-button os-button-danger" type="button" onClick={() => setAction('archive')}>Archive</button>
      </div> : pending ? <p className="admin-detail-note">Resolve the pending review before changing publication state.</p> : <p className="admin-detail-note">Archived content is permanent. Historical Library access and entitlements remain preserved.</p>}
    </Ui44Panel>

    {item.experience_type === 'music' ? <section className="dashboard-section"><SectionHeader title="Release Date" description="Correct the public release chronology without changing the creator’s other release data." />
      <Ui44Panel overflow="visible" className="admin-copy-card">
        <div className="dashboard-form-grid dashboard-form-grid-2 ui44-form-grid">
          <label className="dashboard-field">
            <span className="dashboard-field-label">Release Date</span>
            <Ui44TextInput className="os-input-field release-date-input" type="date" value={releaseDate} onChange={event => setReleaseDate(event.target.value)} />
          </label>
          <div className="admin-detail-actions">
            <button className="os-button os-button-primary" type="button" disabled={!releaseDate || releaseDate === item.release_date} onClick={() => setReleaseDateAction(true)}>Save date</button>
          </div>
        </div>
      </Ui44Panel>
    </section> : null}

    {pending ? <section className="dashboard-section"><SectionHeader title="Pending review" description={pending.submission_kind === 'revision' ? 'Proposed revision' : 'New Item submission'} />
      <Ui44Panel overflow="visible" className="admin-review-card">
        <dl className="admin-fact-grid"><div><dt>Submitted</dt><dd>{formatAdminDate(pending.submitted_at, true)}</dd></div><div><dt>Proposed title</dt><dd>{String(pending.proposed_item?.title || item.title)}</dd></div><div><dt>Proposed creator</dt><dd>{String(pending.proposed_item?.creator || item.creator)}</dd></div><div><dt>Policy</dt><dd>{String(pending.proposed_item?.experience_type || item.experience_type)}</dd></div></dl>
        {pending.proposed_item?.short_description ? <p className="admin-review-description">{String(pending.proposed_item.short_description)}</p> : null}
        <div className="admin-detail-actions"><button className="os-button os-button-primary" type="button" onClick={() => setAction('approve')}>Approve</button><button className="os-button os-button-danger" type="button" onClick={() => setAction('reject')}>Reject</button></div>
      </Ui44Panel>
    </section> : null}

    {detail.health.length > 0 ? <section className="dashboard-section"><SectionHeader title="Publication health" />
      <div className="admin-health-list ui44-panel">{detail.health.map(issue => <div className="admin-health-row" key={issue.code}><strong>{issue.code.replaceAll('_', ' ')}</strong><span>{issue.message}</span></div>)}</div>
    </section> : null}

    <section className="dashboard-section"><SectionHeader title="Metadata" description="Current approved Item" />
      <Ui44Panel overflow="visible" className="admin-copy-card">
        {item.short_description ? <p><strong>Summary</strong>{item.short_description}</p> : null}
        {item.long_description ? <p><strong>Description</strong>{item.long_description}</p> : null}
        <p><strong>Tags</strong>{detail.taxonomy.tags.length ? detail.taxonomy.tags.map(tag => tag.label).join(', ') : 'None'}</p>
      </Ui44Panel>
    </section>

    <section className="dashboard-section"><SectionHeader title="Files and offers" description="Safe presence summaries; private paths are not exposed" />
      <div className="admin-detail-groups">
        <DetailGroup title="Tracks" empty="No tracks" rows={detail.tracks.map(track => ({ id: track.id, title: `${track.number}. ${track.title}`, meta: track.has_audio ? 'Audio present' : 'Audio missing' }))} />
        <DetailGroup title="Assets" empty="No assets" rows={detail.assets.map(asset => ({ id: asset.id, title: asset.title || asset.asset_type, meta: `${asset.asset_type} · ${asset.has_file ? 'File present' : 'File missing'}` }))} />
        <OfferDetailGroup offers={detail.offers} onAction={(offerId, offerActionName) => setOfferAction({ offerId, action: offerActionName })} />
      </div>
    </section>

    <section className="dashboard-section"><SectionHeader title="Review history" description="Creator submissions and administrator decisions" />
      {detail.submissions.length === 0 ? <EmptyMessage>No submission history.</EmptyMessage> : <div className="admin-history-list ui44-panel">{detail.submissions.map(submission => <div className="admin-history-row" key={submission.id}><div><strong>{submission.submission_kind} · {submission.status}</strong><p>{submission.decision_reason || 'No decision reason yet.'}</p></div><time dateTime={submission.submitted_at}>{formatAdminDate(submission.submitted_at, true)}</time></div>)}</div>}
    </section>

    <section className="dashboard-section"><SectionHeader title="Lifecycle history" description="Immutable administrator actions" />
      {detail.lifecycle_history.length === 0 ? <EmptyMessage>No administrator lifecycle changes.</EmptyMessage> : <div className="admin-history-list ui44-panel">{detail.lifecycle_history.map(event => <div className="admin-history-row" key={event.id}><div><strong>{event.previous_status} → {event.new_status}</strong><p>{event.reason}</p></div><span>{event.changed_by}<time dateTime={event.created_at}>{formatAdminDate(event.created_at, true)}</time></span></div>)}</div>}
    </section>

    <AdminActionDialog open={Boolean(action)} title={action ? ACTION_COPY[action].title : ''} description={action ? ACTION_COPY[action].description : ''} confirmLabel={action ? ACTION_COPY[action].confirm : ''} danger={action === 'reject' || action === 'archive' || action === 'unpublish'} requireTitle={action === 'archive' ? item.title : undefined} saving={saving} onClose={() => setAction(null)} onConfirm={completeAction} />
    <AdminActionDialog open={Boolean(offerAction)} title={offerAction ? OFFER_ACTION_COPY[offerAction.action].title : ''} description={offerAction ? OFFER_ACTION_COPY[offerAction.action].description : ''} confirmLabel={offerAction ? OFFER_ACTION_COPY[offerAction.action].confirm : ''} danger={offerAction?.action === 'pause'} saving={saving} onClose={() => setOfferAction(null)} onConfirm={completeOfferAction} />
    <AdminActionDialog open={releaseDateAction} title="Save Release Date?" description="This changes public release-date sorting and records an immutable administrator audit entry." confirmLabel="Save date" saving={saving} onClose={() => setReleaseDateAction(false)} onConfirm={completeReleaseDateAction} />
  </main></PageShell>;
}

const ACTION_COPY: Record<AdminContentAction, { title: string; description: string; confirm: string; success: string }> = {
  approve: { title: 'Approve submission', description: 'The proposed version will become the public Item atomically.', confirm: 'Approve', success: 'Submission approved.' },
  reject: { title: 'Reject submission', description: 'The current approved public version will remain unchanged.', confirm: 'Reject', success: 'Submission rejected.' },
  publish: { title: 'Publish Item', description: 'Publication health will be checked before this Item becomes public.', confirm: 'Publish', success: 'Item published.' },
  unpublish: { title: 'Unpublish Item', description: 'This Item will return to draft. Items with purchases or active access must be archived instead.', confirm: 'Unpublish', success: 'Item returned to draft.' },
  archive: { title: 'Archive Item', description: 'This is permanent. The public Item and offers will close while historical Library access remains preserved.', confirm: 'Archive', success: 'Item archived.' },
};

const OFFER_ACTION_COPY: Record<AdminOfferAction['action'], { title: string; description: string; confirm: string; success: string }> = {
  pause: { title: 'Pause paid offer', description: 'Checkout for this paid digital offer will close. The published Item, prior orders, Library access, entitlements, earnings, and provider evidence remain unchanged.', confirm: 'Pause offer', success: 'Paid offer paused; historical records and buyer access were preserved.' },
  restore: { title: 'Restore paid offer', description: 'Eligibility will be checked before checkout reopens on this same paid digital offer.', confirm: 'Restore offer', success: 'Paid offer restored.' },
};

function DetailGroup({ title, rows, empty }: { title: string; rows: Array<{ id: string; title: string; meta: string }>; empty: string }) {
  return <Ui44Panel overflow="visible" className="admin-detail-group"><h3>{title}</h3>{rows.length ? rows.map(row => <div className="admin-detail-group-row" key={row.id}><strong>{row.title}</strong><span>{row.meta}</span></div>) : <p>{empty}</p>}</Ui44Panel>;
}

function OfferDetailGroup({ offers, onAction }: {
  offers: AdminContentDetail['offers'];
  onAction: (offerId: string, action: AdminOfferAction['action']) => void;
}) {
  return <Ui44Panel overflow="visible" className="admin-detail-group"><h3>Offers</h3>{offers.length ? offers.map(offer => {
    const canPause = offer.offer_type === 'digital_download' && offer.price_cents > 0 && offer.fulfillment_type === 'entitlement' && offer.status === 'active';
    const canRestore = offer.offer_type === 'digital_download' && offer.price_cents > 0 && offer.fulfillment_type === 'entitlement' && offer.status === 'draft';
    return <div className="admin-detail-group-row" key={offer.id}>
      <div><strong>{offer.title}</strong><span>{offer.status} · {formatCurrency(offer.price_cents, offer.currency)}</span></div>
      {canPause ? <button className="os-button os-button-danger os-button-compact" type="button" onClick={() => onAction(offer.id, 'pause')}>Pause</button> : null}
      {canRestore ? <button className="os-button os-button-primary os-button-compact" type="button" onClick={() => onAction(offer.id, 'restore')}>Restore</button> : null}
    </div>;
  }) : <p>No offers</p>}</Ui44Panel>;
}

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}
