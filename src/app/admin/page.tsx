'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { AdminAccessBoundary } from '@/components/admin/AdminPrimitives';
import { getAdminDashboardSummary, type AdminDashboardSummary } from '@/lib/domain/adminOperations';

export default function AdminPage() {
  return <AdminAccessBoundary><AdminDashboard /></AdminAccessBoundary>;
}

function AdminDashboard() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    void getAdminDashboardSummary().then(data => {
      if (alive) setSummary(data);
    }).catch(loadError => {
      if (alive) setError(loadError instanceof Error ? loadError.message : 'Could not load administrator status.');
    });
    return () => { alive = false; };
  }, []);

  return <PageShell><main className="admin-page" aria-label="Administrator workspace">
    <HubHero title="Admin" copy="Manage people, publishing, and operational health across 44OS." />
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}

    <div className="admin-stat-grid" aria-label="Administrator summary">
      <AdminStat label="People" value={summary?.people_count ?? '—'} detail="All accounts" />
      <AdminStat label="Creators" value={summary?.creator_count ?? '—'} detail="Publishing access" />
      <AdminStat label="Creator requests" value={summary?.pending_creator_request_count ?? '—'} detail="Awaiting review" attention={Boolean(summary?.pending_creator_request_count)} />
      <AdminStat label="Pending" value={summary?.pending_review_count ?? '—'} detail="Content reviews" attention={Boolean(summary?.pending_review_count)} />
      <AdminStat label="Errors" value={summary?.recent_error_count ?? '—'} detail="Last 24 hours" attention={Boolean(summary?.recent_error_count)} />
    </div>

    <section className="dashboard-section">
      <SectionHeader title="Administration" description="Open a section to inspect records and use its approved controls." />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        <AdminNavRow href="/admin/home" title="Home" description="Choose and order the four Music releases shown in Featured on Discover." />
        <AdminNavRow href="/admin/people?role=creator_request" title="Creator requests" description="Review people waiting for Creator publishing access." count={summary?.pending_creator_request_count} />
        <AdminNavRow href="/admin/people" title="People" description="Find and manage any member, creator, or administrator." count={summary?.people_count} />
        <AdminNavRow href="/admin/content" title="Content" description="Inspect every Item, review submissions, and manage publication state." count={summary?.content_count} />
        <AdminNavRow href="/admin/errors" title="Operational errors" description="Read sanitized application error events and safe diagnostic references." count={summary?.recent_error_count} />
        <AdminNavRow href="/admin/email" title="Email" description="Inspect provider readiness, fail-closed delivery controls, operational counts, and activation history." />
        <AdminNavRow href="/admin/support" title="Support" description="Claim support cases, inspect durable history, and record replies sent from the monitored mailbox." />
        <AdminNavRow href="/admin/payments" title="Payments" description="Inspect fail-closed configuration, pending orders, signed webhook failures, and reconciliation." />
        <AdminNavRow href="/admin/fulfillment" title="Printful fulfillment" description="Verify the API store, import reviewed 44-owned Merch mappings, and inspect draft-only provider orders." />
      </div>
    </section>

    <section className="dashboard-section">
      <SectionHeader title="System status" description="These launch controls are informational and remain deployment-managed." />
      <Ui44Panel overflow="visible" className="admin-system-status-list">
        <SystemStatus label="Creator publishing" status={summary?.publishing.label ?? 'Loading…'} active={Boolean(summary?.publishing.enabled)} />
        <SystemStatus label="Email delivery" status={summary?.email_delivery.label ?? 'Loading…'} active={Boolean(summary?.email_delivery.enabled)} />
        <SystemStatus label="Payments" status={summary?.payments.label ?? 'Loading…'} active={Boolean(summary?.payments.enabled)} />
        <SystemStatus label="Beat Store" status={summary?.beat_store.label ?? 'Loading…'} active={Boolean(summary?.beat_store.enabled)} />
      </Ui44Panel>
    </section>
  </main></PageShell>;
}

function AdminStat({ label, value, detail, attention = false }: { label: string; value: string | number; detail: string; attention?: boolean }) {
  return <Ui44Panel overflow="visible" className={attention ? 'admin-stat-card admin-stat-card-attention' : 'admin-stat-card'}>
    <span className="admin-stat-label">{label}</span><strong>{value}</strong><span className="admin-stat-detail">{detail}</span>
  </Ui44Panel>;
}

function AdminNavRow({ href, title, description, count }: { href: string; title: string; description: string; count?: number }) {
  return <Link href={href} className="dashboard-list-row admin-hub-row ui44-list-row ui44-list-row-dashboard ui44-list-row-interactive">
    <span className="dashboard-row-copy"><strong className="dashboard-row-title">{title}</strong><span className="dashboard-row-subtitle">{description}</span></span>
    <span className="admin-hub-row-meta">{typeof count === 'number' ? count : '—'} <span aria-hidden="true">›</span></span>
  </Link>;
}

function SystemStatus({ label, status, active }: { label: string; status: string; active: boolean }) {
  return <div className="admin-system-status-row"><span><strong>{label}</strong><small>Read-only</small></span><span className={active ? 'admin-record-status admin-record-status-success ui44-badge' : 'admin-record-status admin-record-status-quiet ui44-badge'}>{status}</span></div>;
}
