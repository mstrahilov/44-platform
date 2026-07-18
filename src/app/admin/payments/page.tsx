'use client';

import { useEffect, useState } from 'react';
import { AdminAccessBoundary } from '@/components/admin/AdminPrimitives';
import { HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { supabase } from '@/lib/supabase';

type Diagnostics = {
  ready: boolean;
  environment: Record<string, boolean>;
  database: Record<string, boolean | number>;
  orders: Array<{ id: string; status: string; total_cents: number; currency: string; failure_code: string | null; failure_message: string | null; updated_at: string }>;
  webhooks: Array<{ provider_event_id: string; event_type: string; processing_status: string; error_message: string | null; received_at: string }>;
  reconciliation: Array<{ id: string; scope: string; status: string; checked_count: number; mismatch_count: number; started_at: string }>;
};

async function loadPaymentDiagnostics() {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Administrator session is unavailable.');
  const response = await fetch('/api/admin/commerce/diagnostics', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  const payload = await response.json() as Diagnostics & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'Could not load payment diagnostics.');
  return payload;
}

export default function AdminPaymentsPage() {
  return <AdminAccessBoundary><AdminPayments /></AdminAccessBoundary>;
}

function AdminPayments() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [error, setError] = useState('');
  const [reconciling, setReconciling] = useState(false);
  const [reconciliationStatus, setReconciliationStatus] = useState('');
  useEffect(() => {
    let active = true;
    void loadPaymentDiagnostics().then(payload => {
      if (active) setData(payload);
    }).catch(loadError => { if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load payment diagnostics.'); });
    return () => { active = false; };
  }, []);

  const missingEnvironment = data ? Object.entries(data.environment).filter(([, configured]) => !configured).map(([name]) => name) : [];
  const unresolvedLabel = error ? 'Unavailable' : 'Loading…';
  async function runReconciliation() {
    setReconciling(true);
    setReconciliationStatus('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Administrator session is unavailable.');
      const response = await fetch('/api/admin/commerce/diagnostics', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json() as { checkedCount?: number; mismatchCount?: number; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Reconciliation failed.');
      setReconciliationStatus(`${payload.checkedCount ?? 0} orders checked · ${payload.mismatchCount ?? 0} mismatches`);
      setData(await loadPaymentDiagnostics());
    } catch (runError) {
      setReconciliationStatus(runError instanceof Error ? runError.message : 'Reconciliation failed.');
    } finally { setReconciling(false); }
  }
  return <PageShell><main className="admin-page" aria-label="Payment operations">
    <HubHero title="Payments" copy="Server configuration, provider evidence, orders, and reconciliation." />
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}

    <section className="dashboard-section">
      <SectionHeader title="Activation diagnostics" description="Checkout remains unavailable unless every server and database prerequisite is true." />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        <DiagnosticRow label="Overall payment readiness" value={data ? (data.ready ? 'Ready for approved activation' : 'Blocked') : unresolvedLabel} />
        <DiagnosticRow label="Missing server configuration" value={data ? (missingEnvironment.length ? missingEnvironment.join(', ') : 'None') : unresolvedLabel} />
        {data ? Object.entries(data.database).map(([label, value]) => <DiagnosticRow key={label} label={label.replaceAll('_', ' ')} value={String(value)} />) : null}
      </div>
    </section>

    <section className="dashboard-section">
      <SectionHeader title="Orders requiring attention" />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        {data && data.orders.length === 0 ? <div className="dashboard-empty">No pending or failed verified orders.</div> : data?.orders.map(order => <div key={order.id} className="dashboard-list-row ui44-list-row ui44-list-row-dashboard">
          <span className="dashboard-row-copy"><strong className="dashboard-row-title">{order.status}</strong><span className="dashboard-row-subtitle">{order.failure_code || 'Awaiting provider state'} · {new Date(order.updated_at).toLocaleString()}</span></span>
          <span className="dashboard-row-meta">{new Intl.NumberFormat(undefined, { style: 'currency', currency: order.currency }).format(order.total_cents / 100)}</span>
        </div>) || <div className="dashboard-empty">{error ? 'Order diagnostics are unavailable.' : 'Loading orders…'}</div>}
      </div>
    </section>

    <section className="dashboard-section">
      <SectionHeader title="Webhook failures" />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        {data && data.webhooks.length === 0 ? <div className="dashboard-empty">No signed Stripe webhook failures.</div> : data?.webhooks.map(event => <div key={event.provider_event_id} className="dashboard-list-row ui44-list-row ui44-list-row-dashboard">
          <span className="dashboard-row-copy"><strong className="dashboard-row-title">{event.event_type}</strong><span className="dashboard-row-subtitle">{event.error_message || event.processing_status} · {new Date(event.received_at).toLocaleString()}</span></span>
          <span className="dashboard-row-meta">{event.provider_event_id}</span>
        </div>) || <div className="dashboard-empty">{error ? 'Webhook diagnostics are unavailable.' : 'Loading webhooks…'}</div>}
      </div>
    </section>

    <section className="dashboard-section">
      <SectionHeader title="Reconciliation" action={<button type="button" className="os-button os-button-secondary os-button-compact" disabled={reconciling || !data?.ready} onClick={() => { void runReconciliation(); }}>{reconciling ? 'Checking…' : 'Run 24-hour check'}</button>} />
      {reconciliationStatus ? <div className="dashboard-status ui44-status" role="status">{reconciliationStatus}</div> : null}
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        {data && data.reconciliation.length === 0 ? <div className="dashboard-empty">No Stripe reconciliation run has been recorded.</div> : data?.reconciliation.map(run => <div key={run.id} className="dashboard-list-row ui44-list-row ui44-list-row-dashboard">
          <span className="dashboard-row-copy"><strong className="dashboard-row-title">{run.scope} · {run.status}</strong><span className="dashboard-row-subtitle">{new Date(run.started_at).toLocaleString()}</span></span>
          <span className="dashboard-row-meta">{run.mismatch_count} mismatches / {run.checked_count} checked</span>
        </div>) || <div className="dashboard-empty">{error ? 'Reconciliation history is unavailable.' : 'Loading reconciliation…'}</div>}
      </div>
    </section>
  </main></PageShell>;
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return <div className="dashboard-list-row ui44-list-row ui44-list-row-dashboard"><span className="dashboard-row-title">{label}</span><span className="dashboard-row-meta">{value}</span></div>;
}
