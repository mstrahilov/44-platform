'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { resourceHref, type Resource } from '@/lib/platform';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useDashboardTabs } from '@/lib/dashboardTabs';

export default function DashboardResourcesPage() {
  useDashboardTabs('resources');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [fetching, setFetching] = useState(true);
  const [status, setStatus] = useState('');
  const [statusKind, setStatusKind] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, router, user]);

  useEffect(() => {
    async function loadResources() {
      if (!user) return;

      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      const profileId = profileResult.profile?.id ?? user.id;

      const { data: resourceRows } = await supabase
        .from('resources')
        .select('*')
        .eq('author_id', profileId)
        .order('created_at', { ascending: false });
      setResources((resourceRows as Resource[] | null) ?? []);
      setFetching(false);
    }

    loadResources();
  }, [user]);

  async function togglePublish(resource: Resource) {
    if (!user) return;
    const profileId = profile?.id ?? user.id;
    const nextStatus = resource.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase
      .from('resources')
      .update({ status: nextStatus, is_published: nextStatus === 'published' })
      .eq('id', resource.id)
      .eq('author_id', profileId);

    if (error) {
      setStatusKind('error');
      setStatus(error.message);
      return;
    }

    setResources(current =>
      current.map(entry =>
        entry.id === resource.id
          ? { ...entry, status: nextStatus }
          : entry,
      ),
    );
    setStatusKind('success');
    setStatus(nextStatus === 'published' ? 'Resource published.' : 'Resource moved back to draft.');
  }

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  return (
    <PageShell>
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div className="dashboard-header-copy">
            <h1 className="os-type-display">Resources</h1>
            <p className="os-type-body">
              Manage guides, articles, and creator documentation.
            </p>
          </div>

          <Link className="os-button os-button-primary" href="/dashboard/resources/new">
            New Resource
          </Link>
        </header>

        {!isCreatorProfile(profile) && (
          <GlassPanel style={{ padding: 24, marginBottom: 18 }}>
            <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 15 }}>
              This account is not marked as a creator yet. You can still save drafts, but switch your profile role to creator before publishing publicly.
            </p>
          </GlassPanel>
        )}

        {status ? (
          <div className={statusKind === 'success' ? 'dashboard-status dashboard-status-success' : 'dashboard-status dashboard-status-error'}>
            {status}
          </div>
        ) : null}

        <div className="dashboard-list-surface">
          {fetching ? (
            <div className="dashboard-empty">
              Loading resources…
            </div>
          ) : resources.length === 0 ? (
            <div className="dashboard-empty">
              No resources yet. Create your first one from inside Dashboard.
            </div>
          ) : (
            resources.map((resource, index) => (
              <div
                key={resource.id}
                className="dashboard-list-row"
                style={{
                  gridTemplateColumns: '1fr 180px 240px',
                  borderTop: index === 0 ? 'none' : '1px solid rgba(17, 24, 39, 0.08)',
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 720 }}>
                    {resource.title}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                      color: 'var(--os-color-ink-muted)',
                    }}
                  >
                    {resource.resource_type || 'Resource'}
                  </div>
                </div>

                <div style={{ color: 'var(--os-color-ink-secondary)', fontSize: 14 }}>
                  {resource.categories?.name || 'Uncategorized'}
                </div>

                <div style={{ justifySelf: 'end', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div
                    style={{
                      borderRadius: 999,
                      padding: '7px 12px',
                      background: 'rgba(255,255,255,.07)',
                      color: 'var(--os-color-ink-secondary)',
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'capitalize',
                    }}
                  >
                    {resource.status || 'draft'}
                  </div>
                  <Link href={`/dashboard/resources/${resource.id}`} className="os-button os-button-ghost os-button-compact">
                    Edit
                  </Link>
                  <Link href={resourceHref(resource)} className="os-button os-button-ghost os-button-compact">
                    Open
                  </Link>
                  <button className="os-button os-button-secondary os-button-compact" onClick={() => togglePublish(resource)}>
                    {resource.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
