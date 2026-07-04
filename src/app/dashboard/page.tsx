'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel, HubHero, HubSection } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useDashboardTabs } from '@/lib/dashboardTabs';
import { DASHBOARD_CATALOG_SECTIONS, productBelongsToDashboardSection } from '@/lib/dashboardCatalog';

type OverviewState = {
  products: Product[];
};

export default function DashboardPage() {
  useDashboardTabs('overview');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [overview, setOverview] = useState<OverviewState>({
    products: [],
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

      const productsResult = await supabase
        .from('products')
        .select('*')
        .eq('author_id', profileId)
        .order('created_at', { ascending: false });

      setOverview({
        products: (productsResult.data as Product[] | null) ?? [],
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

  const catalogCards = DASHBOARD_CATALOG_SECTIONS.map(section => {
    const items = overview.products.filter(item => productBelongsToDashboardSection(item, section.id));
    const published = items.filter(item => item.is_published || item.status === 'published').length;
    return {
      section,
      total: items.length,
      published,
      drafts: items.length - published,
    };
  });
  return (
    <PageShell>
      <div className="dashboard-page">
        <HubHero
          title="Dashboard"
          copy="Your creator workspace for catalog health, sales signals, and what should go live next."
        />

        <div className="dashboard-overview-grid">
          {catalogCards.map(card => (
            <OverviewCard
              key={card.section.id}
              title={card.section.label}
              total={card.total}
              published={card.published}
              drafts={card.drafts}
              href={card.section.href}
            />
          ))}
        </div>

        <HubSection title="Earnings">
          {fetching ? (
            <div className="dashboard-empty">Loading earnings…</div>
          ) : (
            <div className="dashboard-list-surface">
              <div className="dashboard-empty">No sold items yet.</div>
            </div>
          )}
        </HubSection>
      </div>
    </PageShell>
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
      <GlassPanel style={{ padding: 24 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)', textTransform: 'uppercase' }}>{title}</div>
          <div className="os-type-page-title">{total}</div>
          <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
            {published} published, {drafts} draft
          </div>
        </div>
      </GlassPanel>
    </Link>
  );
}
