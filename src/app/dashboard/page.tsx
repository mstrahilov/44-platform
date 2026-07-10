'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageShell, GlassPanel, HubHero, HubSection, EmptyMessage } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { getProductExperience } from '@/lib/experience';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { STUDIO_CATALOG_SECTIONS } from '@/lib/studioCatalog';

type LibraryMetricRow = {
  id: string;
  product_id: string | null;
  acquisition_type: string | null;
  acquired_at: string | null;
};

type OverviewState = {
  products: Product[];
  libraryItems: LibraryMetricRow[];
  metricsError: string;
};

export default function StudioPage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [overview, setOverview] = useState<OverviewState>({
    products: [],
    libraryItems: [],
    metricsError: '',
  });

  useEffect(() => {
    async function fetchOverview() {
      if (!user) return;

      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      const profileId = profileResult.profile?.id ?? user.id;

      const productsResult = await supabase
        .from('products')
        .select('*')
        .eq('author_id', profileId)
        .order('created_at', { ascending: false });

      const productRows = (productsResult.data as Product[] | null) ?? [];
      const productIds = productRows.map(product => product.id);
      let libraryItems: LibraryMetricRow[] = [];
      let metricsError = '';

      if (productIds.length > 0) {
        const libraryResult = await supabase
          .from('library_items')
          .select('id,product_id,acquisition_type,acquired_at')
          .in('product_id', productIds);

        if (libraryResult.error) {
          metricsError = libraryResult.error.message;
        } else {
          libraryItems = (libraryResult.data as LibraryMetricRow[] | null) ?? [];
        }
      }

      setOverview({
        products: productRows,
        libraryItems,
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
              Studio is for creator accounts. You can update your public profile first, then switch your role in Supabase when you are ready to publish.
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

  const catalogCards = [
    ...STUDIO_CATALOG_SECTIONS.map(section => {
      const items = overview.products.filter(item => {
        const experience = getProductExperience(item);
        if (section.id === 'music') return experience === 'music';
        if (section.id === 'books') return experience === 'book';
        if (section.id === 'assets') return experience === 'asset';
        return experience === 'physical';
      });
      const published = items.filter(item => item.status === 'published').length;
      return {
        id: section.id,
        title: section.label,
        total: items.length,
        published,
        drafts: items.length - published,
        href: section.href,
      };
    }),
  ];

  const librarySaves = overview.libraryItems.length;
  const purchasedItems = overview.libraryItems.filter(item => item.acquisition_type === 'purchase');
  const soldItems = purchasedItems.length;
  const revenueCents = purchasedItems.reduce((total, item) => {
    const product = item.product_id ? productById.get(item.product_id) : null;
    return total + (product?.price_cents ?? 0);
  }, 0);
  const totalPlays = 0;

  return (
    <PageShell>
      <div className="dashboard-page">
        <HubHero
          title="Studio"
          copy="Your creator workspace for catalog health, sales signals, and what should go live next."
        />

        <div className="dashboard-overview-grid">
          {catalogCards.map(card => (
            <OverviewCard
              key={card.id}
              title={card.title}
              total={card.total}
              published={card.published}
              drafts={card.drafts}
              href={card.href}
            />
          ))}
          <OverviewStatCard label="Library Saves" value={librarySaves} note="Saved by fans" />
          <OverviewStatCard label="Total Plays" value={totalPlays} note="Music plays" />
          <OverviewStatCard label="Products Sold" value={soldItems} note="Paid items" />
          <OverviewStatCard label="Revenue Earned" value={formatCurrency(revenueCents)} note="Gross revenue" />
        </div>

        {overview.metricsError && (
          <div className="dashboard-status dashboard-status-error">
            Some analytics could not be loaded: {overview.metricsError}
          </div>
        )}

        <HubSection title="Earnings">
          {purchasedItems.length === 0 ? (
            <p className="library-empty-text">No items sold yet.</p>
          ) : (
            <div className="dashboard-list-surface">
              {purchasedItems.map((item, index) => {
                const product = item.product_id ? productById.get(item.product_id) : null;
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

function OverviewStatCard({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <GlassPanel className="dashboard-metric-card">
      <div className="dashboard-overview-card-inner">
        <div className="os-type-meta">{label}</div>
        <div className="os-type-page-title">{value}</div>
        <p className="os-type-body-small">{note}</p>
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
    <Link href={href} className="dashboard-card-link">
      <GlassPanel className="dashboard-overview-card">
        <div className="dashboard-overview-card-inner">
          <div className="os-type-meta">{title}</div>
          <div className="os-type-page-title">{total}</div>
          <div className="os-type-body-small">
            {published} published, {drafts} draft
          </div>
        </div>
      </GlassPanel>
    </Link>
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
