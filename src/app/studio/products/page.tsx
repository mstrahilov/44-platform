'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell, GlassPanel, HubHero, CenteredMessage } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import {
  getStudioCatalogSection,
  productBelongsToStudioSection,
} from '@/lib/studioCatalog';
import { listCreatorItems } from '@/lib/domain/studio';

export default function StudioProductsPage() {
  return (
    <Suspense fallback={<PageShell><CenteredMessage>Loading...</CenteredMessage></PageShell>}>
      <StudioProductsContent />
    </Suspense>
  );
}

function StudioProductsContent() {
  const searchParams = useSearchParams();
  const section = getStudioCatalogSection(searchParams.get('section'));
  const router = useRouter();
  const { user, loading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [fetching, setFetching] = useState(true);

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

      setProducts(await listCreatorItems(profileId));
      setFetching(false);
    }

    loadProducts();
  }, [user]);

  const visibleProducts = useMemo(
    () => products.filter(product => productBelongsToStudioSection(product, section.id)),
    [products, section.id],
  );

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
            <Link className="os-button os-button-primary" href={`/studio/products/new?section=${section.id}`}>
              {section.newLabel}
            </Link>
          }
        />

        {!isCreatorProfile(profile) && (
          <GlassPanel style={{ padding: 24, marginBottom: 18 }}>
            <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
              Studio publishing is available to approved creator accounts. Your fan account remains active while approval is pending.
            </p>
          </GlassPanel>
        )}

        <div className="dashboard-list-surface">
          {fetching ? (
            <div className="dashboard-empty">
              Loading {section.itemLabelPlural}…
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="dashboard-empty">
              No {section.itemLabelPlural} yet. Create your first {section.itemLabel} from inside Studio.
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
                    <div className="dashboard-row-title">{product.title}</div>
                  </div>
                  <div className="dashboard-row-subtitle">{product.item_type || section.itemLabel}</div>
                </div>

                <div className="dashboard-row-actions">
                  <Link href={`/studio/products/${product.id}`} className="os-button os-button-ghost os-button-compact">
                    Edit
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
