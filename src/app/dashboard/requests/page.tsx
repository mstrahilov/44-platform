'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, HubHero, GlassPanel } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { useDashboardTabs } from '@/lib/dashboardTabs';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { projectHref, projectStatusLabel, formatBriefBudget } from '@/lib/projects';

type RequestRow = {
  id: string;
  status: string;
  message: string | null;
  brief_title: string | null;
  brief_body: string | null;
  budget_cents: number | null;
  timeline: string | null;
  agreed_price_cents: number | null;
  created_at: string;
  user_id: string;
  service_id: string;
  services: {
    id: string;
    title: string;
    slug: string | null;
    author_id: string | null;
  } | null;
  requester: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

const FILTERS: Array<{ id: 'all' | 'open' | 'active' | 'closed'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'active', label: 'Active' },
  { id: 'closed', label: 'Closed' },
];

const OPEN_STATUSES = ['pending', 'inquiry'];
const ACTIVE_STATUSES = ['accepted', 'in_progress', 'awaiting_payment'];
const CLOSED_STATUSES = ['completed', 'declined', 'canceled'];

export default function DashboardRequestsPage() {
  useDashboardTabs('requests');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'active' | 'closed'>('all');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      const authorId = profileResult.profile?.id ?? user.id;

      const { data, error } = await supabase
        .from('service_requests')
        .select(
          '*, services!inner(id, title, slug, author_id), requester:profiles!user_id(id, display_name, username, avatar_url)',
        )
        .eq('services.author_id', authorId)
        .order('created_at', { ascending: false });

      if (!error) {
        setRows((data as RequestRow[] | null) ?? []);
      }
      setFetching(false);
    }

    load();
  }, [user]);

  const visibleRows = useMemo(() => {
    return rows.filter(row => {
      if (filter === 'all') return true;
      if (filter === 'open') return OPEN_STATUSES.includes(row.status);
      if (filter === 'active') return ACTIVE_STATUSES.includes(row.status);
      if (filter === 'closed') return CLOSED_STATUSES.includes(row.status);
      return true;
    });
  }, [filter, rows]);

  const openCount = rows.filter(row => OPEN_STATUSES.includes(row.status)).length;

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  if (profile && !isCreatorProfile(profile)) {
    return (
      <PageShell>
        <div className="dashboard-page">
          <GlassPanel style={{ padding: 40 }}>
            <h1 className="os-type-panel-title" style={{ marginBottom: 8 }}>Creator Access Required</h1>
            <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginBottom: 18 }}>
              Requests inbox is for creator accounts.
            </p>
            <Link href="/profile" className="os-button os-button-primary">Open Public Profile</Link>
          </GlassPanel>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="dashboard-page">
        <HubHero
          title="Requests"
          copy={
            openCount > 0
              ? `${openCount} open request${openCount === 1 ? '' : 's'} waiting on you.`
              : 'Incoming service briefs from clients. Open a project to reply, agree on a price, and get to work.'
          }
        />

        <div className="settings-segment" role="tablist" aria-label="Request filters">
          {FILTERS.map(item => (
            <button
              key={item.id}
              type="button"
              role="tab"
              className={`settings-segment-item${filter === item.id ? ' settings-segment-item-active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {fetching ? (
          <div className="dashboard-list-surface">
            <div className="dashboard-empty">Loading requests…</div>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="dashboard-list-surface">
            <div className="dashboard-empty">
              {filter === 'all'
                ? 'No requests yet. Share your services or wait for briefs to arrive.'
                : 'No requests in this filter.'}
            </div>
          </div>
        ) : (
          <div className="dashboard-list-surface">
            {visibleRows.map(row => {
              const title = row.brief_title || row.services?.title || 'Project';
              const requesterName = row.requester?.display_name || row.requester?.username || 'Client';
              const budget = row.agreed_price_cents ?? row.budget_cents;
              return (
                <Link
                  key={row.id}
                  href={projectHref(row.id)}
                  className="dashboard-list-row"
                  style={{
                    gridTemplateColumns: 'minmax(0, 1fr) 160px 140px',
                    color: 'inherit',
                    textDecoration: 'none',
                  }}
                >
                  <div className="dashboard-row-copy">
                    <div className="dashboard-row-title">{title}</div>
                    <div className="dashboard-row-subtitle">
                      {row.services?.title ?? 'Service'} · from {requesterName}
                    </div>
                    {row.brief_body && (
                      <div className="dashboard-row-subtitle" style={{ marginTop: 6 }}>
                        {row.brief_body.slice(0, 140)}{row.brief_body.length > 140 ? '…' : ''}
                      </div>
                    )}
                  </div>
                  <div className="dashboard-row-meta">
                    {formatBriefBudget(budget)}
                    {row.timeline ? ` · ${row.timeline}` : ''}
                  </div>
                  <div className="dashboard-row-actions">
                    <span className="project-status-pill" data-status={row.status}>
                      {projectStatusLabel(row.status)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
