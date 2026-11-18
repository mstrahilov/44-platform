'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmptyMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { AdminAccessBoundary, AdminActionDialog, formatAdminDate } from '@/components/admin/AdminPrimitives';
import { decideAdminSubmission, getAdminContentDetail, setAdminItemLifecycle, type AdminContentDetail } from '@/lib/domain/adminOperations';
import { OS44Button } from '@/components/OS44Button';
import { useTopbarBack, useTopbarOverflow } from '@/components/TopbarContext';

type AdminContentAction = 'approve' | 'reject' | 'publish' | 'unpublish' | 'archive';

export default function AdminContentDetailApp({ itemId }: { itemId: string }) {
  return <AdminAccessBoundary><ContentDetail itemId={itemId} /></AdminAccessBoundary>;
}

function ContentDetail({ itemId }: { itemId: string }) {
  const [detail, setDetail] = useState<AdminContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [action, setAction] = useState<AdminContentAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useTopbarBack({ href: '/admin', label: 'Admin', alwaysNavigate: true });

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => { if (alive) { setLoading(true); setError(''); } });
    void getAdminContentDetail(itemId).then(data => {
      if (alive) { setDetail(data); setLoading(false); }
    }).catch(loadError => {
      if (alive) { setError(loadError instanceof Error ? loadError.message : 'Could not load this release.'); setLoading(false); }
    });
    return () => { alive = false; };
  }, [itemId, reloadKey]);

  const pending = detail?.submissions.find(submission => submission.status === 'pending') ?? null;
  const overflowActions = useMemo(() => {
    if (!detail || pending || detail.item.status === 'archived') return undefined;
    return [
      ...(detail.item.status === 'published' ? [{ id: 'unpublish-release', label: 'Unpublish Release', danger: true, onSelect: () => setAction('unpublish') }] : []),
      ...(detail.item.status === 'draft' ? [{ id: 'publish-release', label: 'Publish Release', onSelect: () => setAction('publish') }] : []),
      { id: 'archive-release', label: 'Archive Release', danger: true, onSelect: () => setAction('archive') },
    ];
  }, [detail, pending]);
  useTopbarOverflow(overflowActions);

  if (loading) return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading release" /></PageShell>;
  if (!detail) return <PageShell><EmptyMessage>{error || 'Release not found.'}</EmptyMessage></PageShell>;

  const item = detail.item;
  const releaseType = detail.taxonomy.type?.label || item.item_type;
  const category = detail.category?.name || humanize(item.experience_type);
  const itemTypeLabel = `${category} · ${releaseType}`;
  const creatorName = detail.creator?.display_name || detail.creator?.username || item.creator;
  const commercialOffers = detail.offers.filter(offer => offer.offer_type !== 'library_access');
  const downloadableOffer = commercialOffers.find(offer => offer.offer_type === 'digital_download');
  const hasDownloadPricing = item.download_purchase_enabled || Boolean(downloadableOffer);
  const genericAssets = detail.assets.filter(asset => !['audio', 'book', 'webgl', 'sample_pack'].includes(asset.asset_type));
  const globalPriceCents = downloadableOffer?.price_cents ?? item.price_cents;
  const marketLabel = item.available_locally_only
    ? 'Local price only'
    : item.market_mode === 'global_plus_local'
      ? 'Global + local price'
      : 'Global price only';
  const downloadPrice = !hasDownloadPricing || item.is_free
    ? 'Free'
    : item.available_locally_only
      ? item.local_price_cents === null ? 'Not set' : formatCurrency(item.local_price_cents, item.local_currency || downloadableOffer?.currency || 'USD')
      : item.market_mode === 'global_plus_local'
        ? `${formatCurrency(globalPriceCents, 'USD')} global${item.local_price_cents === null ? '' : ` · ${formatCurrency(item.local_price_cents, item.local_currency || 'USD')} local`}`
        : formatCurrency(globalPriceCents, downloadableOffer?.currency || 'USD');

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

  return <PageShell><main className="admin-page admin-person-detail-page admin-content-detail-page">
    <HubHero title="Release" hideDivider />
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
    {message ? <div className="dashboard-status dashboard-status-success ui44-status ui44-status-success" role="status">{message}</div> : null}

    <section className="view-album-header library-detail-header admin-content-detail-hero">
      <div className="view-album-media">
        <div className="view-album-cover">
          {item.hero_url || item.cover_url ? <img src={item.hero_url || item.cover_url || ''} alt={item.title} /> : null}
        </div>
      </div>
      <div className="view-album-copy">
        <h1 className="view-album-title">{item.title}</h1>
        <p className="admin-content-detail-creator">{creatorName}</p>
      </div>
    </section>

    <MetadataSection title="Release Details" hideTitle rows={[
      { label: 'Type', value: itemTypeLabel },
      { label: 'Created', value: formatAdminDate(item.created_at, true) },
      { label: 'Updated', value: formatAdminDate(item.updated_at, true) },
      ...(item.release_date ? [{ label: 'Release Date', value: formatReleaseDate(item.release_date) }] : []),
      { label: 'Tags', value: detail.taxonomy.tags.length ? detail.taxonomy.tags.map(tag => tag.label).join(', ') : 'None' },
      { label: 'Market', value: hasDownloadPricing ? marketLabel : '—' },
      { label: 'Download Price', value: downloadPrice },
      { label: 'Achievements', value: detail.achievements.length ? 'Enabled' : 'Disabled' },
    ]} />

    {detail.tracks.length ? <MetadataSection title="Tracks" rows={detail.tracks.map(track => ({
      label: String(track.number),
      value: track.title,
    }))} layout="tracks" /> : null}

    {detail.videos.length ? <MetadataSection title="Visuals" rows={detail.videos.map((video, index) => ({
      label: `Visual ${index + 1}`,
      value: video.title,
    }))} /> : null}

    {detail.external_links.length ? <MetadataSection title="External Links" rows={detail.external_links.map(link => ({
      label: link.label || humanize(link.platform),
      value: link.url,
      detail: humanize(link.platform),
    }))} /> : null}

    {detail.book ? <MetadataSection title="Book" rows={[
      { label: 'Format', value: detail.book.format.toUpperCase() },
      ...(detail.book.total_pages ? [{ label: 'Pages', value: String(detail.book.total_pages) }] : []),
      ...(detail.book.language_code ? [{ label: 'Language', value: detail.book.language_code }] : []),
      ...(detail.book.sample_page_limit ? [{ label: 'Sample Pages', value: String(detail.book.sample_page_limit) }] : []),
      { label: 'PDF', value: detail.book.has_file ? 'Uploaded' : 'Not uploaded' },
      ...(detail.book.has_preview ? [{ label: 'Preview', value: 'Available' }] : []),
    ]} /> : null}

    {detail.sample_previews.length ? <MetadataSection title="Sample Previews" rows={detail.sample_previews.map((sample, index) => ({
      label: `Sample Preview ${index + 1}`,
      value: sample.title,
      detail: [sample.duration_seconds ? formatDuration(sample.duration_seconds) : null, sample.has_file ? 'Audio uploaded' : null].filter(Boolean).join(' · ') || undefined,
    }))} /> : null}

    {detail.interactive_build ? <MetadataSection title="Game Build" rows={[
      { label: 'Runtime', value: humanize(detail.interactive_build.runtime) },
      { label: 'Build Version', value: detail.interactive_build.build_version },
      ...(detail.interactive_build.unity_version ? [{ label: 'Unity Version', value: detail.interactive_build.unity_version }] : []),
      { label: 'Status', value: humanize(detail.interactive_build.status) },
      { label: 'Platforms', value: [detail.interactive_build.supports_desktop ? 'Desktop' : null, detail.interactive_build.supports_mobile ? 'Mobile' : null].filter(Boolean).join(', ') || 'None' },
      { label: 'Orientation', value: humanize(detail.interactive_build.preferred_orientation) },
      ...(detail.interactive_build.download_size_mb ? [{ label: 'Download Size', value: `${detail.interactive_build.download_size_mb} MB` }] : []),
      { label: 'Supported Browsers', value: detail.interactive_build.supported_browsers.map(humanize).join(', ') },
      { label: 'Supported Inputs', value: detail.interactive_build.supported_inputs.map(humanize).join(', ') },
    ]} /> : null}

    {genericAssets.length ? <MetadataSection title="Files" rows={genericAssets.map(asset => ({
      label: asset.title || humanize(asset.asset_type),
      value: asset.has_file ? 'File uploaded' : 'No file uploaded',
      detail: asset.is_downloadable ? 'Downloadable' : humanize(asset.asset_type),
    }))} /> : null}

    {pending ? <section className="dashboard-section"><SectionHeader title="Pending review" description={pending.submission_kind === 'revision' ? 'Proposed revision' : 'New Item submission'} />
      <Ui44Panel overflow="visible" className="admin-review-card">
        <dl className="admin-fact-grid"><div><dt>Submitted</dt><dd>{formatAdminDate(pending.submitted_at, true)}</dd></div><div><dt>Proposed title</dt><dd>{String(pending.proposed_item?.title || item.title)}</dd></div><div><dt>Proposed creator</dt><dd>{String(pending.proposed_item?.creator || item.creator)}</dd></div><div><dt>Policy</dt><dd>{String(pending.proposed_item?.experience_type || item.experience_type)}</dd></div></dl>
        {pending.proposed_item?.short_description ? <p className="admin-review-description">{String(pending.proposed_item.short_description)}</p> : null}
        <div className="admin-detail-actions"><OS44Button className="os-button os-button-primary" type="button" onClick={() => setAction('approve')}>Approve</OS44Button><OS44Button className="os-button os-button-danger" type="button" onClick={() => setAction('reject')}>Reject</OS44Button></div>
      </Ui44Panel>
    </section> : null}

    {detail.health.length > 0 ? <section className="dashboard-section"><SectionHeader title="Publication health" />
      <div className="admin-health-list ui44-panel">{detail.health.map(issue => <div className="admin-health-row" key={issue.code}><strong>{issue.code.replaceAll('_', ' ')}</strong><span>{issue.message}</span></div>)}</div>
    </section> : null}

    <AdminActionDialog
      open={Boolean(action)}
      title={action ? ACTION_COPY[action].title : ''}
      description={action ? ACTION_COPY[action].description : ''}
      confirmLabel={action ? ACTION_COPY[action].confirm : ''}
      danger={action === 'reject' || action === 'archive' || action === 'unpublish'}
      requireTitle={action === 'archive' ? item.title : undefined}
      reasonRequired={action !== 'approve' && action !== 'reject'}
      saving={saving}
      onClose={() => setAction(null)}
      onConfirm={completeAction}
    />
  </main></PageShell>;
}

const ACTION_COPY: Record<AdminContentAction, { title: string; description: string; confirm: string; success: string }> = {
  approve: { title: 'Approve submission', description: 'The proposed version will become the public release atomically.', confirm: 'Approve', success: 'Submission approved.' },
  reject: { title: 'Reject submission', description: 'The current approved public release will remain unchanged.', confirm: 'Reject', success: 'Submission rejected.' },
  publish: { title: 'Publish Release?', description: 'Publication health will be checked before this release becomes public.', confirm: 'Proceed', success: 'Release published.' },
  unpublish: { title: 'Unpublish Release?', description: 'This release will return to draft. Releases with purchases or active access must be archived instead.', confirm: 'Proceed', success: 'Release unpublished.' },
  archive: { title: 'Archive Release?', description: 'Archiving closes the public release and offers while preserving historical Library access. This cannot be undone.', confirm: 'Proceed', success: 'Release archived.' },
};

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

function formatDuration(seconds: number) {
  const rounded = Math.max(0, Math.round(seconds));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}

function formatReleaseDate(value: string) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase());
}

function MetadataSection({ title, rows, layout = 'facts', hideTitle = false }: {
  title: string;
  rows: Array<{ label: string; value: string; detail?: string }>;
  layout?: 'facts' | 'tracks';
  hideTitle?: boolean;
}) {
  if (!rows.length) return null;
  return <section className="dashboard-section admin-content-metadata-section">
    {!hideTitle ? <SectionHeader title={title} /> : null}
    <Ui44Panel overflow="visible" className="admin-content-metadata-card">
      <dl className={`admin-content-metadata-rows admin-content-metadata-rows-${layout}`}>
        {rows.map((row, index) => <div className="admin-content-metadata-row" key={`${row.label}-${index}`}>
          <dt>{layout === 'tracks' ? `${row.label}.` : row.label}</dt>
          <dd><span>{row.value}</span>{row.detail ? <small>{row.detail}</small> : null}</dd>
        </div>)}
      </dl>
    </Ui44Panel>
  </section>;
}
