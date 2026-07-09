'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell, GlassPanel, HubHero, CenteredMessage } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useDashboardTabs } from '@/lib/dashboardTabs';
import {
  getDashboardCatalogSection,
  productBelongsToDashboardSection,
} from '@/lib/dashboardCatalog';

export default function DashboardProductsPage() {
  return (
    <Suspense fallback={<PageShell><CenteredMessage>Loading...</CenteredMessage></PageShell>}>
      <DashboardProductsContent />
    </Suspense>
  );
}

function DashboardProductsContent() {
  const searchParams = useSearchParams();
  const section = getDashboardCatalogSection(searchParams.get('section'));
  useDashboardTabs(section.id);
  const router = useRouter();
  const { user, loading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
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
    async function loadProducts() {
      if (!user) return;

      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      const profileId = profileResult.profile?.id ?? user.id;

      const { data: productRows } = await supabase
        .from('products')
        .select('*')
        .eq('author_id', profileId)
        .order('sort_order', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      const nextProducts = (productRows as Product[] | null) ?? [];
      setProducts(nextProducts);
      setFetching(false);
    }

    loadProducts();
  }, [user]);

  const visibleProducts = useMemo(
    () => products.filter(product => productBelongsToDashboardSection(product, section.id)),
    [products, section.id],
  );

  async function togglePublish(product: Product) {
    const published = product.is_published || product.status === 'published';
    const nextPublished = !published;
    const nextStatus = nextPublished ? 'published' : 'draft';

    const { error } = await supabase
      .from('products')
      .update({ is_published: nextPublished, status: nextStatus })
      .eq('id', product.id);

    if (error) {
      setStatus(error.message);
      setStatusKind('error');
      return;
    }

    setProducts(current => current.map(item => (
      item.id === product.id ? { ...item, is_published: nextPublished, status: nextStatus } : item
    )));
    setStatus(nextPublished ? `${product.title} is published.` : `${product.title} is unpublished.`);
    setStatusKind('success');
  }

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  return (
    <PageShell>
      <div className="dashboard-page">
        <HubHero
          title={section.label}
          copy={`Manage your ${section.itemLabelPlural} for 44OS.`}
          actions={
            <Link className="os-button os-button-primary" href={`/dashboard/products/new?section=${section.id}`}>
              {section.newLabel}
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
              Loading {section.itemLabelPlural}…
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="dashboard-empty">
              No {section.itemLabelPlural} yet. Create your first {section.itemLabel} from inside Dashboard.
            </div>
          ) : (
            visibleProducts.map((product, index) => (
              <div
                key={product.id}
                className="dashboard-list-row"
                style={{
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, auto)',
                  borderTop: index === 0 ? 'none' : undefined,
                }}
              >
                <div className="dashboard-row-copy">
                  <div className="dashboard-row-title-wrap">
                    <span className={product.is_published || product.status === 'published' ? 'dashboard-status-dot dashboard-status-dot-published' : 'dashboard-status-dot dashboard-status-dot-draft'} aria-hidden="true" />
                    <div className="dashboard-row-title">{product.title}</div>
                  </div>
                  <div className="dashboard-row-subtitle">{product.product_type || section.itemLabel}</div>
                </div>

                <div className="dashboard-row-actions">
                  <Link href={`/dashboard/products/${product.id}`} className="os-button os-button-ghost os-button-compact">
                    Edit
                  </Link>
                  <button type="button" className="os-button os-button-secondary os-button-compact" onClick={() => togglePublish(product)}>
                    {product.is_published || product.status === 'published' ? 'Unpublish' : 'Publish'}
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
