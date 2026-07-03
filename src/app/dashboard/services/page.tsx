'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { serviceHref, type Service } from '@/lib/platform';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useDashboardTabs } from '@/lib/dashboardTabs';

export default function DashboardServicesPage() {
  useDashboardTabs('services');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
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
    async function loadServices() {
      if (!user) return;

      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      const profileId = profileResult.profile?.id ?? user.id;

      const { data: serviceRows } = await supabase
        .from('services')
        .select('*')
        .eq('author_id', profileId)
        .order('created_at', { ascending: false });
      setServices((serviceRows as Service[] | null) ?? []);
      setFetching(false);
    }

    loadServices();
  }, [user]);

  async function togglePublish(service: Service) {
    if (!user) return;
    const profileId = profile?.id ?? user.id;
    const nextStatus = service.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase
      .from('services')
      .update({ status: nextStatus, is_published: nextStatus === 'published' })
      .eq('id', service.id)
      .eq('author_id', profileId);

    if (error) {
      setStatusKind('error');
      setStatus(error.message);
      return;
    }

    setServices(current =>
      current.map(entry =>
        entry.id === service.id
          ? { ...entry, status: nextStatus }
          : entry,
      ),
    );
    setStatusKind('success');
    setStatus(nextStatus === 'published' ? 'Service published.' : 'Service moved back to draft.');
  }

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  return (
    <PageShell>
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div className="dashboard-header-copy">
            <h1 className="os-type-display">Services</h1>
            <p className="os-type-body">
              Manage the services you offer through 44.
            </p>
          </div>

          <Link className="os-button os-button-primary" href="/dashboard/services/new">
            New Service
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
              Loading services…
            </div>
          ) : services.length === 0 ? (
            <div className="dashboard-empty">
              No services yet. Create your first one from inside Dashboard.
            </div>
          ) : (
            services.map((service, index) => (
              <div
                key={service.id}
                className="dashboard-list-row"
                style={{
                  gridTemplateColumns: '1fr 180px 240px',
                  borderTop: index === 0 ? 'none' : '1px solid rgba(17, 24, 39, 0.08)',
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 720 }}>
                    {service.title}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                      color: 'var(--os-color-ink-muted)',
                    }}
                  >
                    {service.service_type || 'Service'}
                  </div>
                </div>

                <div style={{ color: 'var(--os-color-ink-secondary)', fontSize: 14 }}>
                  {service.categories?.name || 'Uncategorized'}
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
                    {service.status || 'draft'}
                  </div>
                  <Link href={`/dashboard/services/${service.id}`} className="os-button os-button-ghost os-button-compact">
                    Edit
                  </Link>
                  <Link href={serviceHref(service)} className="os-button os-button-ghost os-button-compact">
                    Open
                  </Link>
                  <button className="os-button os-button-secondary os-button-compact" onClick={() => togglePublish(service)}>
                    {service.status === 'published' ? 'Unpublish' : 'Publish'}
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
