'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminAccessBoundary, AdminStatusBadge, formatAdminDate } from '@/components/admin/AdminPrimitives';
import { EmptyMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { supabase } from '@/lib/supabase';

type EmailControlName = 'delivery_enabled' | 'support_intake_enabled' | 'newsletter_sync_enabled';
type ReconciliationResolution = 'provider_sent' | 'retry_approved' | 'event_suppressed';

type EmailOperationsData = {
  controls: {
    delivery_enabled: boolean;
    support_intake_enabled: boolean;
    newsletter_sync_enabled: boolean;
    approved_at: string | null;
    approved_by: string | null;
    updated_at: string;
  };
  configuration: {
    resendApiKey: boolean;
    cronSecret: boolean;
    webhookSecret: boolean;
    newsletterTopic: boolean;
  };
  counts: {
    pending: number;
    failed: number;
    sent: number;
    suppressed: number;
    providerFailures: number;
    newsletterPending: number;
    newsletterRetirements: number;
    openSupport: number;
  };
  history: Array<{
    id: string;
    control_name: EmailControlName;
    previous_enabled: boolean;
    new_enabled: boolean;
    changed_by: string;
    reason: string;
    created_at: string;
  }>;
  reconciliationRequired: Array<{
    id: string;
    event_key: string;
    template_key: string;
    recipient_email: string;
    attempt_count: number;
    created_at: string;
    last_error_code: 'stale_claim_reconciliation_required' | 'provider_rejection_review_required';
    last_error_at: string | null;
  }>;
  reconciliationHistory: Array<{
    id: string;
    outbox_event_id: string;
    resolution: ReconciliationResolution;
    provider_message_id: string | null;
    reconciled_by: string;
    reason: string;
    created_at: string;
  }>;
};

const CONTROL_COPY: Record<EmailControlName, { label: string; warning: string; phrase: string }> = {
  delivery_enabled: {
    label: 'Application delivery',
    warning: 'Allows the worker to send queued welcome, purchase, refund, fulfillment, and support acknowledgement mail.',
    phrase: 'EMAIL DELIVERY',
  },
  support_intake_enabled: {
    label: 'Support web intake',
    warning: 'Allows signed-in people to create durable Support cases. Direct email to support@44os.com works independently.',
    phrase: 'SUPPORT INTAKE',
  },
  newsletter_sync_enabled: {
    label: 'Newsletter synchronization',
    warning: 'Synchronizes explicit local consent with the default-opt-out 44OS News Topic. It does not send a Broadcast.',
    phrase: 'NEWSLETTER SYNC',
  },
};

const RECONCILIATION_COPY: Record<ReconciliationResolution, { label: string; phrase: string; warning: string }> = {
  provider_sent: {
    label: 'Mark sent',
    phrase: 'MARK EMAIL SENT',
    warning: 'Use only when Resend shows the message was accepted. Enter that Resend message ID as evidence.',
  },
  retry_approved: {
    label: 'Approve one retry',
    phrase: 'RETRY EMAIL',
    warning: 'Use only when Resend has no matching message. The worker will retry with the original durable event key.',
  },
  event_suppressed: {
    label: 'Suppress event',
    phrase: 'SUPPRESS EMAIL',
    warning: 'Close the event without sending when neither delivery nor retry is appropriate.',
  },
};

export default function AdminEmailPage() {
  return <AdminAccessBoundary><AdminEmailOperations /></AdminAccessBoundary>;
}

function AdminEmailOperations() {
  const [data, setData] = useState<EmailOperationsData | null>(null);
  const [selected, setSelected] = useState<EmailControlName | null>(null);
  const [selectedReconciliation, setSelectedReconciliation] = useState<string | null>(null);
  const [resolution, setResolution] = useState<ReconciliationResolution | ''>('');
  const [providerMessageId, setProviderMessageId] = useState('');
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [working, setWorking] = useState(false);

  const request = useCallback(async (method: 'GET' | 'POST', body?: Record<string, unknown>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('Administrator session is unavailable.');
    const response = await fetch('/api/admin/email/operations', {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
    });
    const payload = await response.json() as EmailOperationsData & { error?: string };
    if (!response.ok) throw new Error(payload.error || 'Email operation failed.');
    return payload;
  }, []);

  const load = useCallback(async () => {
    const payload = await request('GET');
    setData(payload);
  }, [request]);

  useEffect(() => {
    void Promise.resolve().then(load).catch(loadError => setError(loadError instanceof Error ? loadError.message : 'Could not load email operations.'));
  }, [load]);

  async function applyControl(control: EmailControlName) {
    if (!data) return;
    const enabled = !data.controls[control];
    const expected = `${enabled ? 'ENABLE' : 'DISABLE'} ${CONTROL_COPY[control].phrase}`;
    setWorking(true);
    setError('');
    setStatus('');
    try {
      await request('POST', { control, enabled, reason, confirmation });
      setStatus(`${CONTROL_COPY[control].label} is now ${enabled ? 'enabled' : 'disabled'}.`);
      setSelected(null);
      setReason('');
      setConfirmation('');
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Type ${expected} exactly.`);
    } finally {
      setWorking(false);
    }
  }

  function resetReconciliation() {
    setSelectedReconciliation(null);
    setResolution('');
    setProviderMessageId('');
    setReason('');
    setConfirmation('');
  }

  async function reconcileEmail(eventId: string) {
    if (!resolution) return;
    setWorking(true);
    setError('');
    setStatus('');
    try {
      await request('POST', {
        action: 'reconcile',
        eventId,
        resolution,
        providerMessageId,
        reason,
        confirmation,
      });
      setStatus(`Email event was reconciled as “${RECONCILIATION_COPY[resolution].label}”.`);
      resetReconciliation();
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Email reconciliation failed.');
    } finally {
      setWorking(false);
    }
  }

  return <PageShell><main className="admin-page" aria-label="Email operations">
    <HubHero title="Email" copy="Inspect the fail-closed 44OS email system and make explicit, audited activation changes." />
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
    {status ? <div className="dashboard-status ui44-status" role="status">{status}</div> : null}

    <section className="dashboard-section">
      <SectionHeader title="Configuration readiness" description="Only presence is shown. Secret values never leave the server." />
      {data ? <div className="admin-stat-grid">
        <Readiness label="Resend application key" ready={data.configuration.resendApiKey} />
        <Readiness label="Worker secret" ready={data.configuration.cronSecret} />
        <Readiness label="Webhook secret" ready={data.configuration.webhookSecret} />
        <Readiness label="Newsletter Topic" ready={data.configuration.newsletterTopic} />
      </div> : <div className="ui44-loading-shell" role="status" aria-label="Loading email configuration" />}
    </section>

    <section className="dashboard-section">
      <SectionHeader title="Delivery controls" description="All controls begin off. Enable only after the matching deployment and acceptance gate has passed." />
      <div className="settings-section settings-section-wide ui44-form-grid email-delivery-control-grid">
        {data ? (Object.keys(CONTROL_COPY) as EmailControlName[]).map(control => {
          const enabled = data.controls[control];
          const nextEnabled = !enabled;
          const expected = `${nextEnabled ? 'ENABLE' : 'DISABLE'} ${CONTROL_COPY[control].phrase}`;
          const open = selected === control;
          return <article className="ui44-panel ui44-panel-glass admin-dialog-field" key={control}>
            <div className="admin-system-status-row">
              <span><strong>{CONTROL_COPY[control].label}</strong><small>{CONTROL_COPY[control].warning}</small></span>
              <AdminStatusBadge tone={enabled ? 'success' : 'quiet'}>{enabled ? 'Enabled' : 'Off'}</AdminStatusBadge>
            </div>
            {!open ? <button type="button" className={enabled ? 'os-button os-button-danger' : 'os-button os-button-primary'}
              onClick={() => { setSelected(control); setReason(''); setConfirmation(''); setError(''); setStatus(''); }}>
              {enabled ? 'Review disable' : 'Review enable'}
            </button> : <>
              <p><strong>This changes live application behavior after deployment.</strong> Confirm the matching runbook gate before continuing.</p>
              <label className="settings-field">
                <span className="os-type-field-title">Operational reason</span>
                <textarea value={reason} maxLength={500} disabled={working}
                  onChange={event => setReason(event.target.value)} placeholder="Acceptance evidence or rollback reason" />
              </label>
              <label className="settings-field">
                <span className="os-type-field-title">Type “{expected}”</span>
                <input className="os-input-field" value={confirmation} autoComplete="off" disabled={working}
                  onChange={event => setConfirmation(event.target.value)} />
              </label>
              <div className="admin-detail-actions">
                <button type="button" className="os-button os-button-secondary" disabled={working}
                  onClick={() => { setSelected(null); setReason(''); setConfirmation(''); }}>Cancel</button>
                <button type="button" className={enabled ? 'os-button os-button-danger' : 'os-button os-button-primary'}
                  disabled={working || reason.trim().length < 8 || confirmation !== expected}
                  onClick={() => { void applyControl(control); }}>
                  {nextEnabled ? 'Enable control' : 'Disable control'}
                </button>
              </div>
            </>}
          </article>;
        }) : <div className="ui44-loading-shell" role="status" aria-label="Loading email controls" />}
      </div>
    </section>

    <section className="dashboard-section">
      <SectionHeader title="Operational counts" description="Counts are metadata only; message contents and secret values are not shown." />
      {data ? <div className="admin-stat-grid">
        <Metric label="Queued" value={data.counts.pending} />
        <Metric label="Failed" value={data.counts.failed} attention={data.counts.failed > 0} />
        <Metric label="Sent" value={data.counts.sent} />
        <Metric label="Suppressed" value={data.counts.suppressed} />
        <Metric label="Provider failures" value={data.counts.providerFailures} attention={data.counts.providerFailures > 0} />
        <Metric label="Newsletter pending" value={data.counts.newsletterPending} attention={data.counts.newsletterPending > 0} />
        <Metric label="Old newsletter contacts" value={data.counts.newsletterRetirements} attention={data.counts.newsletterRetirements > 0} />
        <Metric label="Open support" value={data.counts.openSupport} attention={data.counts.openSupport > 0} />
      </div> : null}
    </section>

    <section className="dashboard-section">
      <SectionHeader title="Delivery-failure reconciliation"
        description="Expired ambiguous sends and known provider rejections are frozen here. Neither retries automatically." />
      <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="note">
        Inspect the Resend email log and correct any configuration rejection before choosing an outcome. Never approve a retry when Resend already accepted the message.
      </div>
      {data?.reconciliationRequired.length ? <div className="settings-section settings-section-wide ui44-form-grid">
        {data.reconciliationRequired.map(event => {
          const open = selectedReconciliation === event.id;
          const knownRejection = event.last_error_code === 'provider_rejection_review_required';
          const expected = resolution ? RECONCILIATION_COPY[resolution].phrase : '';
          return <article className="ui44-panel ui44-panel-glass admin-dialog-field" key={event.id}>
            <div className="admin-system-status-row">
              <span>
                <strong>{event.template_key} · {event.recipient_email}</strong>
                <small>{event.event_key} · attempt {event.attempt_count} · frozen {formatAdminDate(event.last_error_at || event.created_at, true)}</small>
              </span>
              <AdminStatusBadge tone="warning">{knownRejection ? 'Provider rejected' : 'Delivery ambiguous'}</AdminStatusBadge>
            </div>
            {!open ? <button type="button" className="os-button os-button-danger"
              onClick={() => {
                setSelectedReconciliation(event.id);
                setSelected(null);
                setResolution('');
                setProviderMessageId('');
                setReason('');
                setConfirmation('');
                setError('');
                setStatus('');
              }}>
              Inspect and reconcile
            </button> : <>
              <label className="settings-field">
                <span className="os-type-field-title">Verified outcome</span>
                <select className="os-input-field" value={resolution} disabled={working}
                  onChange={changeEvent => {
                    setResolution(changeEvent.target.value as ReconciliationResolution | '');
                    setProviderMessageId('');
                    setConfirmation('');
                  }}>
                  <option value="">Choose only after checking Resend</option>
                  {(Object.keys(RECONCILIATION_COPY) as ReconciliationResolution[])
                    .filter(value => !knownRejection || value !== 'provider_sent')
                    .map(value =>
                    <option value={value} key={value}>{RECONCILIATION_COPY[value].label}</option>)}
                </select>
              </label>
              {resolution ? <p><strong>{RECONCILIATION_COPY[resolution].warning}</strong></p> : null}
              {resolution === 'provider_sent' ? <label className="settings-field">
                <span className="os-type-field-title">Resend message ID</span>
                <input className="os-input-field" value={providerMessageId} autoComplete="off" disabled={working}
                  onChange={changeEvent => setProviderMessageId(changeEvent.target.value)}
                  placeholder="Provider evidence from the Resend email log" />
              </label> : null}
              <label className="settings-field">
                <span className="os-type-field-title">Reconciliation reason</span>
                <textarea value={reason} maxLength={500} disabled={working}
                  onChange={changeEvent => setReason(changeEvent.target.value)}
                  placeholder="What the Resend log proves and why this outcome is safe" />
              </label>
              {resolution ? <label className="settings-field">
                <span className="os-type-field-title">Type “{expected}”</span>
                <input className="os-input-field" value={confirmation} autoComplete="off" disabled={working}
                  onChange={changeEvent => setConfirmation(changeEvent.target.value)} />
              </label> : null}
              <div className="admin-detail-actions">
                <button type="button" className="os-button os-button-secondary" disabled={working}
                  onClick={resetReconciliation}>Cancel</button>
                <button type="button" className="os-button os-button-danger"
                  disabled={working || !resolution || reason.trim().length < 8
                    || confirmation !== expected || (resolution === 'provider_sent' && !providerMessageId.trim())}
                  onClick={() => { void reconcileEmail(event.id); }}>
                  Record audited outcome
                </button>
              </div>
            </>}
          </article>;
        })}
      </div> : data ? <EmptyMessage>No email events require manual reconciliation.</EmptyMessage> : null}
    </section>

    <section className="dashboard-section">
      <SectionHeader title="Append-only reconciliation history" description="Every manual decision preserves the administrator, reason, outcome, and provider evidence." />
      {data?.reconciliationHistory.length ? <div className="ui44-panel ui44-panel-glass">
        {data.reconciliationHistory.map(event => <article className="admin-system-status-row" key={event.id}>
          <span>
            <strong>{RECONCILIATION_COPY[event.resolution].label}</strong>
            <small>{formatAdminDate(event.created_at, true)} · {event.reason}{event.provider_message_id ? ` · ${event.provider_message_id}` : ''}</small>
          </span>
          <AdminStatusBadge tone={event.resolution === 'provider_sent' ? 'success' : 'quiet'}>{event.resolution.replaceAll('_', ' ')}</AdminStatusBadge>
        </article>)}
      </div> : data ? <EmptyMessage>No manual reconciliation decisions have been recorded.</EmptyMessage> : null}
    </section>

    <section className="dashboard-section">
      <SectionHeader title="Append-only activation history" description="Every effective control transition records who changed it and why." />
      {data?.history.length ? <div className="ui44-panel ui44-panel-glass">
        {data.history.map(event => <article className="admin-system-status-row" key={event.id}>
          <span>
            <strong>{CONTROL_COPY[event.control_name].label}: {event.previous_enabled ? 'on' : 'off'} → {event.new_enabled ? 'on' : 'off'}</strong>
            <small>{formatAdminDate(event.created_at, true)} · {event.reason}</small>
          </span>
          <AdminStatusBadge tone={event.new_enabled ? 'success' : 'quiet'}>{event.new_enabled ? 'Enabled' : 'Disabled'}</AdminStatusBadge>
        </article>)}
      </div> : data ? <EmptyMessage>No activation changes have been recorded.</EmptyMessage> : null}
    </section>
  </main></PageShell>;
}

function Readiness({ label, ready }: { label: string; ready: boolean }) {
  return <div className="ui44-panel ui44-panel-glass admin-stat-card">
    <span className="admin-stat-label">{label}</span>
    <AdminStatusBadge tone={ready ? 'success' : 'warning'}>{ready ? 'Present' : 'Missing'}</AdminStatusBadge>
  </div>;
}

function Metric({ label, value, attention = false }: { label: string; value: number; attention?: boolean }) {
  return <div className={attention ? 'ui44-panel ui44-panel-glass admin-stat-card admin-stat-card-attention' : 'ui44-panel ui44-panel-glass admin-stat-card'}>
    <span className="admin-stat-label">{label}</span><strong>{value}</strong>
  </div>;
}
