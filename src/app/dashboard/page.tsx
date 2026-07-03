'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import type { Resource, Service } from '@/lib/platform';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useDashboardTabs } from '@/lib/dashboardTabs';

type OverviewState = {
  products: Product[];
  services: Service[];
  resources: Resource[];
};

export default function DashboardPage() {
  useDashboardTabs('overview');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [overview, setOverview] = useState<OverviewState>({
    products: [],
    services: [],
    resources: [],
  });
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && user === null) {
      router.replace('/login');
    }
  }, [loading, router, user]);

  useEffect(() => {
    async function fetchOverview() {
      if (!user) return;

      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      const profileId = profileResult.profile?.id ?? user.id;

      const [productsResult, servicesResult, resourcesResult] = await Promise.all([
        supabase.from('products').select('*').eq('author_id', profileId).order('created_at', { ascending: false }),
        supabase.from('services').select('*').eq('author_id', profileId).order('created_at', { ascending: false }),
        supabase.from('resources').select('*').eq('author_id', profileId).order('created_at', { ascending: false }),
      ]);

      setOverview({
        products: (productsResult.data as Product[] | null) ?? [],
        services: (servicesResult.data as Service[] | null) ?? [],
        resources: (resourcesResult.data as Resource[] | null) ?? [],
      });
      setFetching(false);
    }

    fetchOverview();
  }, [user]);

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
              Dashboard is for creator accounts. You can update your public profile first, then switch your role in Supabase when you are ready to publish.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/profile" className="os-button os-button-primary">Open Public Profile</Link>
              <Link href="/" className="os-button os-button-ghost">Back Home</Link>
            </div>
          </GlassPanel>
        </div>
      </PageShell>
    );
  }

  const publishedProducts = overview.products.filter(item => item.is_published || item.status === 'published').length;
  const draftProducts = overview.products.length - publishedProducts;
  const publishedServices = overview.services.filter(item => item.status === 'published').length;
  const draftServices = overview.services.length - publishedServices;
  const publishedResources = overview.resources.filter(item => item.status === 'published').length;
  const draftResources = overview.resources.length - publishedResources;
  const totalContent = overview.products.length + overview.services.length + overview.resources.length;
  const totalPublished = publishedProducts + publishedServices + publishedResources;
  const publishRate = totalContent ? Math.round((totalPublished / totalContent) * 100) : 0;

  const recentItems = [
    ...overview.products.slice(0, 3).map(item => ({
      id: item.id,
      title: item.title,
      type: item.product_type || 'Product',
      status: item.status || (item.is_published ? 'published' : 'draft'),
      href: `/dashboard/products/${item.id}`,
    })),
    ...overview.services.slice(0, 2).map(item => ({
      id: item.id,
      title: item.title,
      type: item.service_type || 'Service',
      status: item.status || 'draft',
      href: `/dashboard/services/${item.id}`,
    })),
    ...overview.resources.slice(0, 2).map(item => ({
      id: item.id,
      title: item.title,
      type: item.resource_type || 'Resource',
      status: item.status || 'draft',
      href: `/dashboard/resources/${item.id}`,
    })),
  ].slice(0, 6);

  return (
    <PageShell>
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div className="dashboard-header-copy">
            <h1 className="os-type-display">Overview</h1>
            <p className="os-type-body">
              Your private creator workspace. Keep an eye on releases, service offerings, resources, and what still needs to be published.
            </p>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18 }}>
          <OverviewCard
            title="Products"
            total={overview.products.length}
            published={publishedProducts}
            drafts={draftProducts}
            href="/dashboard/products"
          />
          <OverviewCard
            title="Services"
            total={overview.services.length}
            published={publishedServices}
            drafts={draftServices}
            href="/dashboard/services"
          />
          <OverviewCard
            title="Resources"
            total={overview.resources.length}
            published={publishedResources}
            drafts={draftResources}
            href="/dashboard/resources"
          />
        </div>

        <section className="dashboard-section">
          <div className="dashboard-header-copy">
            <h2 className="os-type-panel-content">Workspace Health</h2>
            <p className="os-type-body-small">
              A single view of what exists, what is live, and how much of your creator workspace is ready for the world.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18 }}>
            <MetricCard
              label="Total Content"
              value={totalContent}
              description="products, services, and resources"
            />
            <MetricCard
              label="Published"
              value={totalPublished}
              description="items currently live on 44"
            />
            <MetricCard
              label="Publish Rate"
              value={`${publishRate}%`}
              description="of your content is live and discoverable"
            />
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-header-copy">
            <h2 className="os-type-panel-content">Recent Content</h2>
            <p className="os-type-body-small">
              The latest products, services, and resources in your workspace.
            </p>
          </div>

          {fetching ? (
            <div className="dashboard-empty">Loading overview…</div>
          ) : recentItems.length === 0 ? (
            <div className="dashboard-empty">
              No content yet. Start with a product, service, or resource.
            </div>
          ) : (
            <div>
              {recentItems.map((item, index) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="dashboard-list-row"
                  style={{
                    gridTemplateColumns: '1fr 180px 120px',
                    borderTop: index === 0 ? '1px solid rgba(17, 24, 39, 0.08)' : '1px solid rgba(17, 24, 39, 0.08)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 720 }}>{item.title}</div>
                  </div>
                  <div style={{ color: 'var(--os-color-ink-secondary)', fontSize: 14 }}>{item.type}</div>
                  <div style={{ justifySelf: 'end', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div
                      style={{
                        borderRadius: 999,
                        padding: '7px 12px',
                        background: 'rgba(255,255,255,.52)',
                        color: 'var(--os-color-ink-secondary)',
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'capitalize',
                      }}
                    >
                      {item.status}
                    </div>
                    <Link href={item.href} className="os-button os-button-ghost os-button-compact">Open</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <GlassPanel style={{ padding: 24 }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)', textTransform: 'uppercase' }}>{label}</div>
        <div className="os-type-display" style={{ fontSize: 42 }}>{value}</div>
        <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
          {description}
        </div>
      </div>
    </GlassPanel>
  );
}

function OverviewCard({
  title,
  total,
  published,
  drafts,
  href,
}: {
  title: string;
  total: number;
  published: number;
  drafts: number;
  href: string;
}) {
  return (
    <GlassPanel style={{ padding: 24 }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)', textTransform: 'uppercase' }}>{title}</div>
        <div className="os-type-display" style={{ fontSize: 42 }}>{total}</div>
        <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
          {published} published, {drafts} draft
        </div>
        <div style={{ marginTop: 10 }}>
          <Link href={href} className="os-button os-button-ghost os-button-compact">Open {title}</Link>
        </div>
      </div>
    </GlassPanel>
  );
}
