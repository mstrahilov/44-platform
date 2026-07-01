'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { buildOwnershipFilter, isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';

export default function DashboardProductsPage() {
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
      const ownershipFilter = buildOwnershipFilter({
        idFields: ['creator_id', 'author_id'],
        textFields: ['creator'],
        profile: profileResult.profile,
        userId: user.id,
        email: user.email,
      });

      const { data: productRows } = await supabase
        .from('products')
        .select('*')
        .or(ownershipFilter)
        .order('created_at', { ascending: false });
      setProducts((productRows as Product[] | null) ?? []);
      setFetching(false);
    }

    loadProducts();
  }, [user]);

  async function togglePublish(product: Product) {
    const nextPublished = !(product.is_published || product.status === 'published');
    const { error } = await supabase
      .from('products')
      .update({
        is_published: nextPublished,
        status: nextPublished ? 'published' : 'draft',
      })
      .eq('id', product.id);

    if (error) {
      alert(error.message);
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
              Products
            </h1>

            <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 18 }}>
              Manage releases, products, assets, and experiences.
            </p>
          </div>

          <Link className="os-button os-button-primary" href="/dashboard/products/new">
            New Product
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
              Loading products…
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: '24px 26px', color: 'var(--os-color-ink-secondary)' }}>
              No products yet. Create your first one from inside Dashboard.
            </div>
          ) : (
            products.map((product, index) => (
              <div
                key={product.id}
                style={{
                  padding: '22px 26px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 160px 240px',
                  gap: 20,
                  alignItems: 'center',
                  borderTop:
                    index === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 720 }}>
                    {product.title}
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                      color: 'var(--os-color-ink-muted)',
                    }}
                  >
                    {product.product_type || 'Product'}
                  </div>
                </div>

                <div style={{ color: 'var(--os-color-ink-secondary)', fontSize: 14 }}>
                  {product.category || 'Uncategorized'}
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
                    {product.status || (product.is_published ? 'published' : 'draft')}
                  </div>
                  <Link href={`/dashboard/products/${product.id}`} className="os-button os-button-ghost os-button-compact">
                    Edit
                  </Link>
                  <button className="os-button os-button-secondary os-button-compact" onClick={() => togglePublish(product)}>
                    {product.is_published || product.status === 'published' ? 'Unpublish' : 'Publish'}
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
