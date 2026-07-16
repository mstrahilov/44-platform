'use client';

import { useEffect, useState } from 'react';
import { EmptyMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { useAuth } from '@/lib/useAuth';
import { loadStudioProfile } from '@/lib/studioProfiles';
import {
  getAdminSubmissionDetail,
  listAdminErrorEvents,
  listAdminSubmissionQueue,
  type AdminErrorEvent,
  type AdminSubmissionQueueRow,
} from '@/lib/domain/adminOperations';

type AdminDetail = Record<string, unknown>;

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<AdminSubmissionQueueRow[]>([]);
  const [errors, setErrors] = useState<AdminErrorEvent[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<AdminSubmissionQueueRow | null>(null);
  const [detail, setDetail] = useState<AdminDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    async function loadAdminData() {
      if (authLoading) return;
      if (!user) {
        if (alive) setLoading(false);
        return;
      }

      const profileResult = await loadStudioProfile(user.id);
      if (!alive) return;
      if (profileResult.profile?.role !== 'admin') {
        setLoading(false);
        return;
      }

      setAuthorized(true);
      try {
        const [submissionRows, errorRows] = await Promise.all([
          listAdminSubmissionQueue({ status: 'pending', limit: 50 }),
          listAdminErrorEvents({ limit: 20 }),
        ]);
        if (!alive) return;
        setQueue(submissionRows);
        setErrors(errorRows);
      } catch (loadError) {
        if (alive) setError(loadError instanceof Error ? loadError.message : 'Could not load administrator data.');
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadAdminData();
    return () => { alive = false; };
  }, [authLoading, user]);

  async function openSubmission(submission: AdminSubmissionQueueRow) {
    setSelectedSubmission(submission);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await getAdminSubmissionDetail(submission.submission_id));
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : 'Could not load submission history.');
    } finally {
      setDetailLoading(false);
    }
  }

  if (authLoading || loading) {
    return <PageShell><div className="admin-page-loading ui44-state ui44-state-loading" role="status" aria-label="Loading administrator workspace" />;</PageShell>;
  }

  if (!authorized) {
    return <PageShell><EmptyMessage>Administrator access is required.</EmptyMessage></PageShell>;
  }

  return (
    <PageShell>
      <main className="admin-page" aria-label="Administrator workspace">
        <HubHero
          title="Admin"
          copy="A private control center for publishing review, operational health, and launch readiness."
        />

        <div className="admin-runtime-banner" role="status">
          <span className="admin-status-dot" aria-hidden="true" />
          <div>
            <strong>Trusted testing is active</strong>
            <p>Creator review, notification delivery, and payments remain safely disabled while this workspace is reviewed.</p>
          </div>
          <span className="admin-status-pill ui44-badge">Review gate off</span>
        </div>

        {error && <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div>}

        <div className="admin-stat-grid" aria-label="Administrator status summary">
          <AdminStat label="Pending submissions" value={queue.length} detail="Awaiting review" tone={queue.length > 0 ? 'attention' : 'quiet'} />
          <AdminStat label="Operational errors" value={errors.length} detail="Recent sanitized events" tone={errors.length > 0 ? 'attention' : 'quiet'} />
          <AdminStat label="Notifications" value="Off" detail="Outbox only" tone="locked" />
          <AdminStat label="Commerce" value="Off" detail="Fail-closed" tone="locked" />
        </div>

        <div className="admin-workspace-grid">
          <div className="admin-primary-column">
            <Ui44Panel overflow="visible" className="admin-section-panel">
              <SectionHeader
                title="Publishing review"
                description="Review creator submissions without changing the currently approved public Item."
                action={<span className="admin-section-badge ui44-badge">Coming after approval</span>}
              />
              <div className="admin-section-toolbar">
                <div>
                  <span className="admin-toolbar-label">Queue</span>
                  <span className="admin-toolbar-count">{queue.length} pending</span>
                </div>
                <button className="os-button os-button-ghost os-button-compact" type="button" disabled title="Review activation is disabled until this UI is approved">Review controls disabled</button>
              </div>
              {queue.length === 0 ? (
                <div className="admin-empty-state">
                  <div className="admin-empty-icon" aria-hidden="true">✓</div>
                  <strong>No submissions are waiting.</strong>
                  <p>The queue is connected and ready. It will populate when creator review is enabled.</p>
                </div>
              ) : (
                <div className="admin-queue-list" role="list" aria-label="Pending creator submissions">
                  {queue.map(submission => (
                    <button
                      key={submission.submission_id}
                      className={selectedSubmission?.submission_id === submission.submission_id ? 'admin-queue-row admin-queue-row-active' : 'admin-queue-row'}
                      type="button"
                      onClick={() => { void openSubmission(submission); }}
                    >
                      <span className="admin-queue-copy">
                        <strong>{submission.item_title}</strong>
                        <span>{submission.submission_kind === 'revision' ? 'Revision' : 'New release'} · {submission.creator_name || 'Unknown creator'}</span>
                      </span>
                      <span className="admin-queue-meta">{formatDate(submission.submitted_at)}<span aria-hidden="true">›</span></span>
                    </button>
                  ))}
                </div>
              )}
            </Ui44Panel>

            <Ui44Panel overflow="visible" className="admin-section-panel">
              <SectionHeader
                title="Operational errors"
                description="Sanitized request-error events captured from the application and Vercel fallback logs."
                action={<span className="admin-section-badge ui44-badge">Admin only</span>}
              />
              {errors.length === 0 ? (
                <div className="admin-empty-state admin-empty-state-compact">
                  <strong>No recent operational errors.</strong>
                  <p>When an error is recorded, this feed will show its release, route, and safe reference details.</p>
                </div>
              ) : (
                <div className="admin-error-list" role="list" aria-label="Recent operational errors">
                  {errors.map(event => <ErrorRow key={event.id} event={event} />)}
                </div>
              )}
            </Ui44Panel>
          </div>

          <aside className="admin-secondary-column" aria-label="Administrator details">
            <Ui44Panel overflow="visible" className="admin-section-panel admin-controls-panel">
              <SectionHeader title="Runtime controls" description="Activation switches remain fail-closed until the corresponding workflow is approved." />
              <RuntimeControl label="Creator review" value="Disabled" detail="Trusted testing" />
              <RuntimeControl label="Notification delivery" value="Disabled" detail="Transactional outbox only" />
              <RuntimeControl label="Stripe checkout" value="Disabled" detail="Provider setup pending" />
              <RuntimeControl label="PayPal payouts" value="Disabled" detail="Provider setup pending" />
            </Ui44Panel>

            <Ui44Panel overflow="visible" className="admin-section-panel admin-detail-panel">
              <SectionHeader title="Submission detail" description="Select a queue item to inspect its proposed release and audit history." />
              {!selectedSubmission ? (
                <div className="admin-detail-empty">Select a submission from the queue to inspect it here.</div>
              ) : detailLoading ? (
                <div className="admin-detail-empty ui44-state ui44-state-loading" role="status" aria-live="polite">Loading submission history…</div>
              ) : (
                <SubmissionDetail submission={selectedSubmission} detail={detail} />
              )}
            </Ui44Panel>
          </aside>
        </div>
      </main>
    </PageShell>
  );
}

function AdminStat({ label, value, detail, tone }: { label: string; value: string | number; detail: string; tone: 'attention' | 'quiet' | 'locked' }) {
  return (
    <Ui44Panel overflow="visible" className={`admin-stat-card admin-stat-card-${tone}`}>
      <span className="admin-stat-label">{label}</span>
      <strong>{value}</strong>
      <span className="admin-stat-detail">{detail}</span>
    </Ui44Panel>
  );
}

function RuntimeControl({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="admin-runtime-control">
      <span className="admin-control-icon" aria-hidden="true">—</span>
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
      <span className="admin-control-value">{value}</span>
    </div>
  );
}

function ErrorRow({ event }: { event: AdminErrorEvent }) {
  return (
    <div className="admin-error-row" role="listitem">
      <span className="admin-error-severity" aria-hidden="true" />
      <div className="admin-error-copy">
        <strong>{event.error_name}</strong>
        <span>{event.method} {event.path} · {event.release.slice(0, 12)}</span>
        {event.safe_message && <p>{event.safe_message}</p>}
      </div>
      <time dateTime={event.occurred_at}>{formatDate(event.occurred_at)}</time>
    </div>
  );
}

function SubmissionDetail({ submission, detail }: { submission: AdminSubmissionQueueRow; detail: AdminDetail | null }) {
  const item = detail?.item as { title?: string; slug?: string; experience_type?: string } | undefined;
  const decisions = Array.isArray(detail?.decisions) ? detail.decisions : [];
  const tombstones = Array.isArray(detail?.tombstones) ? detail.tombstones : [];
  return (
    <div className="admin-detail-content">
      <div className="admin-detail-title-row">
        <div>
          <span className="admin-detail-eyebrow">{submission.submission_kind === 'revision' ? 'Revision' : 'New release'}</span>
          <h3>{item?.title || submission.item_title}</h3>
        </div>
        <span className="admin-status-pill ui44-badge">Pending</span>
      </div>
      <dl className="admin-detail-facts">
        <div><dt>Creator</dt><dd>{submission.creator_name || 'Unknown'}</dd></div>
        <div><dt>Type</dt><dd>{item?.experience_type || 'Not specified'}</dd></div>
        <div><dt>Submitted</dt><dd>{formatDate(submission.submitted_at)}</dd></div>
        <div><dt>History</dt><dd>{decisions.length} decisions · {tombstones.length} removals</dd></div>
      </dl>
      <div className="admin-detail-actions">
        <button className="os-button os-button-secondary os-button-compact" type="button" disabled title="Review activation is disabled until the Admin UI is approved">Approve</button>
        <button className="os-button os-button-danger os-button-compact" type="button" disabled title="Review activation is disabled until the Admin UI is approved">Reject</button>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}
