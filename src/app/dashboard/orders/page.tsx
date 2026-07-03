'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { useDashboardTabs } from '@/lib/dashboardTabs';
import type { Product } from '@/lib/products';
import type { Resource, Service } from '@/lib/platform';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';

type OrdersState = {
  products: Product[];
  services: Service[];
  resources: Resource[];
};

export default function DashboardOrdersPage() {
  useDashboardTabs('orders');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [state, setState] = useState<OrdersState>({ products: [], services: [], resources: [] });
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      const profileId = profileResult.profile?.id ?? user.id;

      const [productsResult, servicesResult, resourcesResult] = await Promise.all([
        supabase.from('products').select('*').eq('author_id', profileId).order('created_at', { ascending: false }),
        supabase.from('services').select('*').eq('author_id', profileId).order('created_at', { ascending: false }),
        supabase.from('resources').select('*').eq('author_id', profileId).order('created_at', { ascending: false }),
      ]);

      setState({
        products: (productsResult.data as Product[] | null) ?? [],
        services: (servicesResult.data as Service[] | null) ?? [],
        resources: (resourcesResult.data as Resource[] | null) ?? [],
      });
      setFetching(false);
    }

    loadData();
  }, [user]);

  const publishedProducts = useMemo(
    () => state.products.filter(item => item.is_published || item.status === 'published'),
    [state.products],
  );
  const publishedServices = useMemo(
    () => state.services.filter(item => item.status === 'published'),
    [state.services],
  );
  const publishedResources = useMemo(
    () => state.resources.filter(item => item.status === 'published'),
    [state.resources],
  );

  const fulfillmentReady = publishedProducts.length + publishedServices.length;
  const draftBacklog = state.products.length + state.services.length + state.resources.length - fulfillmentReady - publishedResources.length;
  const recentSellable = [
    ...publishedProducts.slice(0, 4).map(item => ({
      id: item.id,
      title: item.title,
      type: item.product_type || 'Product',
      href: `/dashboard/products/${item.id}`,
    })),
    ...publishedServices.slice(0, 3).map(item => ({
      id: item.id,
      title: item.title,
      type: item.service_type || 'Service',
      href: `/dashboard/services/${item.id}`,
    })),
  ].slice(0, 6);

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
              Dashboard is for creator accounts.
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
        <header className="dashboard-header">
          <div className="dashboard-header-copy">
            <h1 className="os-type-display">Orders</h1>
            <p className="os-type-body">
              Keep an eye on what is live, what is ready to sell, and what still needs to be published before orders can flow.
            </p>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18 }}>
          <GlassPanel style={{ padding: 24 }}>
            <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)', textTransform: 'uppercase' }}>Sellable Now</div>
            <div className="os-type-display" style={{ fontSize: 42 }}>{fulfillmentReady}</div>
            <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
              published products and services
            </div>
          </GlassPanel>
          <GlassPanel style={{ padding: 24 }}>
            <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)', textTransform: 'uppercase' }}>Resources Live</div>
            <div className="os-type-display" style={{ fontSize: 42 }}>{publishedResources.length}</div>
            <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
              published resources supporting the catalog
            </div>
          </GlassPanel>
          <GlassPanel style={{ padding: 24 }}>
            <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)', textTransform: 'uppercase' }}>Needs Review</div>
            <div className="os-type-display" style={{ fontSize: 42 }}>{Math.max(0, draftBacklog)}</div>
            <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
              drafts still waiting to go live
            </div>
          </GlassPanel>
        </div>

        <section className="dashboard-section">
          <div className="dashboard-header-copy">
            <h2 className="os-type-panel-content">Sellable Catalog</h2>
            <p className="os-type-body-small">
              These are the items currently best positioned to drive incoming orders.
            </p>
          </div>

          {fetching ? (
            <div className="dashboard-empty">Loading order readiness…</div>
          ) : recentSellable.length === 0 ? (
            <div className="dashboard-empty">Nothing sellable is published yet. Start by publishing a product or service.</div>
          ) : (
            <div>
              {recentSellable.map(item => (
                <div key={`${item.type}-${item.id}`} className="dashboard-list-row" style={{ gridTemplateColumns: '1fr 180px 120px' }}>
                  <div style={{ fontSize: 17, fontWeight: 720 }}>{item.title}</div>
                  <div style={{ color: 'var(--os-color-ink-secondary)', fontSize: 14 }}>{item.type}</div>
                  <div style={{ justifySelf: 'end' }}>
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
