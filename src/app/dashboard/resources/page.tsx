'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Resource } from '@/lib/platform';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';

export default function DashboardResourcesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [fetching, setFetching] = useState(true);

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

      const { data: resourceRows } = await supabase
        .from('resources')
        .select('*')
        .or(`creator_id.eq.${user.id},author_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      setResources((resourceRows as Resource[] | null) ?? []);
      setFetching(false);
    }

    loadResources();
  }, [user]);

  async function togglePublish(resource: Resource) {
    const nextStatus = resource.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase
      .from('resources')
      .update({ status: nextStatus, is_published: nextStatus === 'published' })
      .eq('id', resource.id);

    if (error) {
      alert(error.message);
      return;
    }

    setResources(current =>
      current.map(entry =>
        entry.id === resource.id
          ? { ...entry, status: nextStatus }
          : entry,
      ),
    );
  }

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  return (
    <PageShell>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '64px 0' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 48,
                fontWeight: 780,
                letterSpacing: '-0.04em',
                marginBottom: 10,
              }}
            >
              Resources
            </h1>

            <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 18 }}>
              Manage guides, articles, and creator documentation.
            </p>
          </div>

          <Link className="os-button os-button-primary" href="/dashboard/resources/new">
            New Resource
          </Link>
        </div>

        {!isCreatorProfile(profile) && (
          <GlassPanel style={{ padding: 24, marginBottom: 18 }}>
            <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 15 }}>
              This account is not marked as a creator yet. You can still save drafts, but switch your profile role to creator before publishing publicly.
            </p>
          </GlassPanel>
        )}

        <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
          {fetching ? (
            <div style={{ padding: '24px 26px', color: 'var(--os-color-ink-secondary)' }}>
              Loading resources…
            </div>
          ) : resources.length === 0 ? (
            <div style={{ padding: '24px 26px', color: 'var(--os-color-ink-secondary)' }}>
              No resources yet. Create your first one from inside Studio.
            </div>
          ) : (
            resources.map((resource, index) => (
              <div
                key={resource.id}
                style={{
                  padding: '22px 26px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 180px 240px',
                  gap: 20,
                  alignItems: 'center',
                  borderTop:
                    index === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
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
                  <button className="os-button os-button-secondary os-button-compact" onClick={() => togglePublish(resource)}>
                    {resource.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            ))
          )}
        </GlassPanel>
      </div>
    </PageShell>
  );
}
