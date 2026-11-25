'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HubHero, PageShell, RouteLoading, SectionHeader } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { AdminAccessBoundary } from '@/components/admin/AdminPrimitives';
import { getAdminDashboardSummary, type AdminDashboardSummary } from '@/lib/domain/adminOperations';
import { useTopbarBack } from '@/components/TopbarContext';

export default function AdminPage() {
  return <AdminAccessBoundary><AdminDashboard /></AdminAccessBoundary>;
}

function AdminDashboard() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState('');
  useTopbarBack({ href: '/you', label: 'Account', alwaysNavigate: true });

  useEffect(() => {
    let alive = true;
    void getAdminDashboardSummary().then(data => {
      if (alive) {
        setSummary(data);
        setSummaryLoading(false);
      }
    }).catch(loadError => {
      if (alive) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load administrator status.');
        setSummaryLoading(false);
      }
    });
    return () => { alive = false; };
  }, []);

  if (summaryLoading) return <RouteLoading label="Loading Administrator" />;

  return <PageShell><main className="dashboard-page admin-page" aria-label="Administrator workspace">
    <HubHero title="Admin" className="admin-page-header" />
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}

    <div className="dashboard-overview-grid" aria-label="Administrator summary">
      <AdminStat href="/admin/people" label="Users" value={summary?.people_count ?? '—'} />
      <AdminStat href="/admin/people?role=creator" label="Creators" value={summary?.creator_count ?? '—'} />
      <AdminStat href="/admin/content" label="Releases" value={summary?.content_count ?? '—'} />
      <AdminStat href="/admin/people" label="Creator Requests" value={summary?.pending_creator_request_count ?? '—'} />
    </div>

    <section className="dashboard-section">
      <SectionHeader title="Administration" />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        <AdminNavRow href="/admin/people" title="Users" />
        <AdminNavRow href="/admin/content" title="Releases" />
        <AdminNavRow href="/admin/home" title="Featured Release" />
      </div>
    </section>

    <section className="dashboard-section">
      <SectionHeader title="Resources" />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        <AdminNavRow href="/team/brand" title="Handbook" meta="" />
        <AdminNavRow href="/team/brand?download=1" title="Brand Kit" meta="" />
      </div>
    </section>
  </main></PageShell>;
}

function AdminStat({ href, label, value }: { href: string; label: string; value: string | number }) {
  return <Link href={href} className="admin-stat-link">
    <Ui44Panel overflow="visible" className="dashboard-metric-card">
      <div className="dashboard-overview-card-inner">
        <div className="os-type-meta admin-metric-label">{label}</div>
        <div className="os-type-page-title">{value}</div>
      </div>
    </Ui44Panel>
  </Link>;
}

function AdminNavRow({ href, title, count, meta }: { href: string; title: string; count?: number; meta?: string }) {
  return <Link href={href} className="dashboard-list-row admin-hub-row ui44-list-row ui44-list-row-dashboard ui44-list-row-interactive">
    <span className="dashboard-row-copy"><strong className="dashboard-row-title">{title}</strong></span>
    <span className="admin-hub-row-meta">{meta ?? (typeof count === 'number' ? count : null)}<span aria-hidden="true">›</span></span>
  </Link>;
}
