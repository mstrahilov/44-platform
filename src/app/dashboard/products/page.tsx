'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel, HubHero } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useDashboardTabs } from '@/lib/dashboardTabs';

function productHref(product: Pick<Product, 'id' | 'slug'>) {
  return `/product/${product.slug || product.id}`;
}

export default function DashboardProductsPage() {
  useDashboardTabs('products');
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
        .order('created_at', { ascending: false });
      setProducts((productRows as Product[] | null) ?? []);
      setFetching(false);
    }

    loadProducts();
  }, [user]);

  async function togglePublish(product: Product) {
    if (!user) return;
    const profileId = profile?.id ?? user.id;
    const nextPublished = !(product.is_published || product.status === 'published');
    const { error } = await supabase
      .from('products')
      .update({
        is_published: nextPublished,
        status: nextPublished ? 'published' : 'draft',
      })
      .eq('id', product.id)
      .eq('author_id', profileId);

    if (error) {
      setStatusKind('error');
      setStatus(error.message);
      return;
    }

    setProducts(current =>
      current.map(entry =>
        entry.id === product.id
          ? {
              ...entry,
              is_published: nextPublished,
              status: nextPublished ? 'published' : 'draft',
            }
          : entry,
      ),
    );
    setStatusKind('success');
    setStatus(nextPublished ? 'Product published.' : 'Product moved back to draft.');
  }

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  return (
    <PageShell>
      <div className="dashboard-page">
        <HubHero
          title="Products"
          copy="Manage releases, products, assets, and experiences."
          actions={
            <Link className="os-button os-button-primary" href="/dashboard/products/new">
              New Product
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
              Loading products…
            </div>
          ) : products.length === 0 ? (
            <div className="dashboard-empty">
              No products yet. Create your first one from inside Dashboard.
            </div>
          ) : (
            products.map((product, index) => (
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
                  <div className="dashboard-row-subtitle">{product.product_type || 'Product'}</div>
                </div>

                <div className="dashboard-row-actions">
                  {(product.is_published || product.status === 'published') && (
                    <Link
                      href={`/dashboard/posts/new?subject_id=${encodeURIComponent(product.id)}`}
                      className="os-button os-button-ghost os-button-compact"
                    >
                      Post Update
                    </Link>
                  )}
                  <Link href={`/dashboard/products/${product.id}`} className="os-button os-button-ghost os-button-compact">
                    Edit
                  </Link>
                  <button
                    className="os-button os-button-secondary os-button-compact"
                    onClick={() => togglePublish(product)}
                  >
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
