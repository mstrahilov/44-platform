'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageShell, GlassPanel, HubHero, HubSection, EmptyMessage, SectionHeader } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { getProductExperience } from '@/lib/experience';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { STUDIO_CATALOG_SECTIONS } from '@/lib/studioCatalog';
import { getCreatorCatalogOverview, type StudioCatalogHealth, type StudioLibraryMetric } from '@/lib/domain/studio';

type LibraryMetricRow = StudioLibraryMetric;

type OverviewState = {
  products: Product[];
  libraryItems: LibraryMetricRow[];
  totalPlays: number;
  catalogHealth: StudioCatalogHealth[];
  metricsError: string;
};

export default function StudioPage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [overview, setOverview] = useState<OverviewState>({
    products: [],
    libraryItems: [],
    totalPlays: 0,
    catalogHealth: [],
    metricsError: '',
  });

  useEffect(() => {
    async function fetchOverview() {
      if (!user) return;

      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      const profileId = profileResult.profile?.id ?? user.id;

      let productRows: Product[] = [];
      let libraryItems: LibraryMetricRow[] = [];
      let totalPlays = 0;
      let catalogHealth: StudioCatalogHealth[] = [];
      let metricsError = '';
      try {
        const result = await getCreatorCatalogOverview(profileId);
        productRows = result.items;
        libraryItems = result.libraryItems;
        totalPlays = result.totalPlays;
        catalogHealth = result.catalogHealth;
      } catch (overviewError) {
        metricsError = overviewError instanceof Error ? overviewError.message : 'Could not load Studio metrics.';
      }

      setOverview({
        products: productRows,
        libraryItems,
        totalPlays,
        catalogHealth,
        metricsError,
      });
    }

    fetchOverview();
  }, [user]);

  if (loading) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <div className="dashboard-page">
          <HubHero
            title="Studio"
            copy="Creator tools, catalog health, and earnings live here once you sign in."
          />
          <EmptyMessage>Log in to use your creator Studio.</EmptyMessage>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--os-space-4)' }}>
            <Link href="/login" className="os-button os-button-primary">Log In</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  if (profile && !isCreatorProfile(profile)) {
    return (
      <PageShell>
        <div className="dashboard-page">
          <GlassPanel style={{ padding: 40 }}>
            <h1 className="os-type-panel-title" style={{ marginBottom: 8 }}>Creator Access Required</h1>
            <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginBottom: 18 }}>
              Studio publishing is available to approved creator accounts. Your fan account, Library, and Community access remain available while approval is pending.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/profile" className="os-button os-button-primary">Open Public Profile</Link>
              <Link href="/store" className="os-button os-button-ghost">Back to Store</Link>
            </div>
          </GlassPanel>
        </div>
      </PageShell>
    );
  }

  const productById = new Map(overview.products.map(product => [product.id, product]));

  const librarySaves = overview.libraryItems.length;
  const purchasedItems = overview.libraryItems.filter(item => item.acquisition_type === 'purchase');
  const soldItems = purchasedItems.length;
  const revenueCents = purchasedItems.reduce((total, item) => {
    const product = item.item_id ? productById.get(item.item_id) : null;
    return total + (product?.price_cents ?? 0);
  }, 0);
  const totalPlays = overview.totalPlays;
  const healthByItemId = new Map(overview.catalogHealth.map(health => [health.item_id, health]));
  const productSections = STUDIO_CATALOG_SECTIONS.map(section => ({
    ...section,
    items: overview.products.filter(item => {
      const experience = getProductExperience(item);
      if (section.id === 'music') return experience === 'music';
      if (section.id === 'books') return experience === 'book';
      if (section.id === 'assets') return experience === 'asset';
      return experience === 'physical';
    }),
  }));

  return (
    <PageShell>
      <div className="dashboard-page">
        <HubHero
          title="Studio"
          copy="Your creator workspace for catalog health, sales signals, and what should go live next."
        />

        <div className="dashboard-overview-grid">
          <OverviewStatCard label="Saves" value={librarySaves} />
          <OverviewStatCard label="Plays" value={totalPlays} />
          <OverviewStatCard label="Sold" value={soldItems} />
          <OverviewStatCard label="Earned" value={formatCurrency(revenueCents)} />
        </div>

        {overview.metricsError && (
          <div className="dashboard-status dashboard-status-error">
            Some analytics could not be loaded: {overview.metricsError}
          </div>
        )}

        <div className="studio-catalog-sections">
          {productSections.map(section => (
            <StudioProductSection
              key={section.id}
              id={section.id === 'assets' ? 'sample-packs' : section.id}
              title={section.label}
              itemLabel={section.itemLabel}
              items={section.items}
              healthByItemId={healthByItemId}
              newHref={`/studio/products/new?section=${section.id === 'assets' ? 'sample-packs' : section.id}`}
            />
          ))}
        </div>

        <HubSection title="Earnings">
          {purchasedItems.length === 0 ? (
            <p className="library-empty-text">No items sold yet.</p>
          ) : (
            <div className="dashboard-list-surface">
              {purchasedItems.map((item, index) => {
                const product = item.item_id ? productById.get(item.item_id) : null;
                return (
                  <div key={item.id} className="dashboard-list-row" style={{ borderTop: index === 0 ? 'none' : undefined }}>
                    <div className="dashboard-row-copy">
                      <div className="dashboard-row-title">{product?.title ?? 'Item'}</div>
                      <div className="dashboard-row-subtitle">{item.acquired_at ? formatDate(item.acquired_at) : 'Purchase date unavailable'}</div>
                    </div>
                    <div className="dashboard-row-meta">{formatCurrency(product?.price_cents ?? 0)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </HubSection>

      </div>
    </PageShell>
  );
}

function OverviewStatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <GlassPanel className="dashboard-metric-card">
      <div className="dashboard-overview-card-inner">
        <div className="os-type-meta">{label}</div>
        <div className="os-type-page-title">{value}</div>
      </div>
    </GlassPanel>
  );
}

function StudioProductSection({
  id,
  title,
  itemLabel,
  items,
  newHref,
  healthByItemId,
}: {
  id: string;
  title: string;
  itemLabel: string;
  items: Product[];
  newHref: string;
  healthByItemId: Map<string, StudioCatalogHealth>;
}) {
  return (
    <section className="dashboard-section" id={id}>
      <SectionHeader
        title={title}
        action={<Link href={newHref} className="os-button os-button-secondary os-button-compact">New</Link>}
      />
      <div className="dashboard-list-surface">
        {items.length === 0 ? (
          <div className="dashboard-empty">No {itemLabel}s yet.</div>
        ) : (
          items.map(product => {
            const health = healthByItemId.get(product.id);
            const issueCount = health?.issue_count ?? 0;
            return (
            <Link key={product.id} href={`/studio/products/${product.id}`} className="dashboard-list-row studio-item-row">
              <div className="dashboard-row-copy">
                <div className="dashboard-row-title">{product.title}</div>
                <div className="dashboard-row-subtitle">
                  {product.browse_type?.label || product.item_type || itemLabel}
                </div>
              </div>
              <div className="dashboard-row-actions">
                {issueCount > 0 ? (
                  <span title={health?.issue_messages.join(' ')} className="dashboard-status-pill studio-status-pill-draft">
                    {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
                  </span>
                ) : null}
              </div>
            </Link>
            );
          })
        )}
      </div>
    </section>
  );
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
