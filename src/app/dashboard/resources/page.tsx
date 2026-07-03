'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel, HubHero } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Resource } from '@/lib/platform';
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
        <HubHero
          title="Resources"
          copy="Manage guides, articles, and creator documentation."
          actions={
            <Link className="os-button os-button-primary" href="/dashboard/resources/new">
              New Resource
            </Link>
          }
        />

        {!isCreatorProfile(profile) && (
          <GlassPanel style={{ padding: 24, marginBottom: 18 }}>
            <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
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
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, auto)',
                  borderTop: index === 0 ? 'none' : undefined,
                }}
              >
                <div className="dashboard-row-copy">
                  <div className="dashboard-row-title-wrap">
                    <span className={resource.status === 'published' ? 'dashboard-status-dot dashboard-status-dot-published' : 'dashboard-status-dot dashboard-status-dot-draft'} aria-hidden="true" />
                    <div className="dashboard-row-title">{resource.title}</div>
                  </div>
                  <div className="dashboard-row-subtitle">{resource.resource_type || 'Resource'}</div>
                </div>

                <div className="dashboard-row-actions">
                  <Link href={`/dashboard/resources/${resource.id}`} className="os-button os-button-ghost os-button-compact">
                    Edit
                  </Link>
                  <button
                    className="os-button os-button-secondary os-button-compact"
                    onClick={() => togglePublish(resource)}
                  >
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
