'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminAccessBoundary, AdminStatusBadge, formatAdminDate } from '@/components/admin/AdminPrimitives';
import { EmptyMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { supabase } from '@/lib/supabase';

type SupportCase = {
  id: string;
  case_number: number;
  requester_email: string;
  subject: string;
  status: 'open' | 'waiting_on_support' | 'waiting_on_requester' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to: string | null;
  reply_owner: string | null;
  created_at: string;
  updated_at: string;
};

type SupportEvent = {
  id: string;
  case_id: string;
  event_type: string;
  actor_id: string | null;
  visibility: 'requester' | 'internal';
  body: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type SupportData = {
  cases: SupportCase[];
  events: SupportEvent[];
  currentUserId: string;
};

const STATUS_LABELS: Record<SupportCase['status'], string> = {
  open: 'Open',
  waiting_on_support: 'Waiting on support',
  waiting_on_requester: 'Waiting on requester',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function AdminSupportPage() {
  return <AdminAccessBoundary><AdminSupport /></AdminAccessBoundary>;
}

function AdminSupport() {
  const [data, setData] = useState<SupportData | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [working, setWorking] = useState(false);

  const request = useCallback(async (method: 'GET' | 'POST', body?: Record<string, unknown>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('Administrator session is unavailable.');
    const response = await fetch('/api/admin/email/support', {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
    });
    const payload = await response.json() as SupportData & { error?: string };
    if (!response.ok) throw new Error(payload.error || 'Support operation failed.');
    return payload;
  }, []);

  const load = useCallback(async () => {
    const payload = await request('GET');
    setData(payload);
    setSelectedId(current => current && payload.cases.some(item => item.id === current)
      ? current
      : payload.cases[0]?.id ?? '');
  }, [request]);

  useEffect(() => {
    void Promise.resolve().then(load).catch(loadError => setError(loadError instanceof Error ? loadError.message : 'Could not load support cases.'));
  }, [load]);

  const selected = data?.cases.find(item => item.id === selectedId) ?? null;
  const events = useMemo(() => (data?.events ?? []).filter(item => item.case_id === selectedId), [data, selectedId]);
  const ownsReply = Boolean(selected && data && selected.reply_owner === data.currentUserId);

  async function act(body: Record<string, unknown>, success: string) {
    setWorking(true);
    setError('');
    setStatusMessage('');
    try {
      await request('POST', body);
      setReplyBody('');
      setNote('');
      setStatusMessage(success);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Support operation failed.');
    } finally {
      setWorking(false);
    }
  }

  return <PageShell><main className="admin-page" aria-label="Support operations">
    <HubHero title="Support" copy="Durable case history and reply ownership for the monitored support@44os.com mailbox." />
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
    {statusMessage ? <div className="dashboard-status ui44-status" role="status">{statusMessage}</div> : null}

    <section className="dashboard-section">
      <SectionHeader title="Case queue" description="Claim a case before replying. Direct mailbox messages must be entered manually because Resend Receiving stays off." />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        {data?.cases.length ? data.cases.map(item => <button type="button" key={item.id}
          className="dashboard-list-row admin-hub-row ui44-list-row ui44-list-row-dashboard ui44-list-row-interactive"
          aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)}>
          <span className="dashboard-row-copy">
            <strong className="dashboard-row-title">SUP-{String(item.case_number).padStart(6, '0')} · {item.subject}</strong>
            <span className="dashboard-row-subtitle">{item.requester_email} · updated {formatAdminDate(item.updated_at, true)}</span>
          </span>
          <AdminStatusBadge tone={item.status === 'open' || item.status === 'waiting_on_support' ? 'warning' : item.status === 'closed' ? 'quiet' : 'success'}>{STATUS_LABELS[item.status]}</AdminStatusBadge>
        </button>) : data ? <EmptyMessage>No support cases have been recorded.</EmptyMessage> : <div className="ui44-loading-shell" role="status" aria-label="Loading support cases" />}
      </div>
    </section>

    {selected ? <section className="dashboard-section">
      <SectionHeader title={selected.subject} description={`${selected.requester_email} · opened ${formatAdminDate(selected.created_at, true)}`}
        action={!ownsReply
          ? <button type="button" className="os-button os-button-secondary os-button-compact" disabled={working || Boolean(selected.reply_owner)}
            onClick={() => { void act({ action: 'claim', caseId: selected.id }, 'Reply ownership claimed.'); }}>
            {selected.reply_owner ? 'Owned by another admin' : 'Claim reply ownership'}
          </button>
          : <AdminStatusBadge tone="success">You own replies</AdminStatusBadge>} />

      <div className="ui44-panel ui44-panel-glass admin-dialog-field">
        <h3>Append-only history</h3>
        {events.map(event => <article key={event.id} className="admin-system-status-row">
          <span><strong>{event.event_type.replaceAll('_', ' ')}</strong><small>{event.visibility} · {formatAdminDate(event.created_at, true)}</small></span>
          <p>{event.body || describeMetadata(event.metadata)}</p>
        </article>)}
      </div>

      <div className="ui44-panel ui44-panel-glass admin-dialog-field">
        <h3>Record a human reply</h3>
        <p>Send the reply from iCloud as <strong>44OS Support &lt;support@44os.com&gt;</strong>, then paste the exact reply here to preserve case history.</p>
        <textarea value={replyBody} maxLength={10000} disabled={!ownsReply || working}
          onChange={event => setReplyBody(event.target.value)} placeholder="Paste the reply sent from iCloud" />
        <button type="button" className="os-button os-button-primary" disabled={!ownsReply || working || !replyBody.trim()}
          onClick={() => { void act({ action: 'record_reply', caseId: selected.id, replyBody }, 'Human reply recorded; case is waiting on the requester.'); }}>
          Record sent reply
        </button>
      </div>

      <div className="ui44-panel ui44-panel-glass admin-dialog-field">
        <h3>Case status and internal note</h3>
        <select value={selected.status} disabled={working} onChange={event => {
          void act({ action: 'update', caseId: selected.id, status: event.target.value, note: '' }, 'Case status updated.');
        }}>
          {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <textarea value={note} maxLength={10000} disabled={working} onChange={event => setNote(event.target.value)} placeholder="Internal note (not emailed)" />
        <button type="button" className="os-button os-button-secondary" disabled={working || !note.trim()}
          onClick={() => { void act({ action: 'update', caseId: selected.id, status: selected.status, note }, 'Internal note added.'); }}>
          Add internal note
        </button>
      </div>
    </section> : null}
  </main></PageShell>;
}

function describeMetadata(metadata: Record<string, unknown>) {
  const from = typeof metadata.from === 'string' ? metadata.from : '';
  const to = typeof metadata.to === 'string' ? metadata.to : '';
  if (from || to) return `${from || 'unchanged'} → ${to || 'unchanged'}`;
  return 'Administrative event';
}
