'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, HubHero, HubSection } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { loadStudioProfile } from '@/lib/studioProfiles';
import { useDashboardTabs } from '@/lib/dashboardTabs';

type LibraryPurchaseRow = {
  id: string;
  product_id: string | null;
  acquired_at: string | null;
  products?: Pick<Product, 'title' | 'price_cents'> | Pick<Product, 'title' | 'price_cents'>[] | null;
};

export default function DashboardEarningsPage() {
  useDashboardTabs('earnings');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<LibraryPurchaseRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function loadEarnings() {
      if (!user) return;
      const profileResult = await loadStudioProfile(user.id);
      const profileId = profileResult.profile?.id ?? user.id;

      const productResult = await supabase
        .from('products')
        .select('id')
        .eq('author_id', profileId);

      const productIds = ((productResult.data as Array<{ id: string }> | null) ?? []).map(product => product.id);
      if (productIds.length === 0) {
        setRows([]);
        setFetching(false);
        return;
      }

      const purchaseResult = await supabase
        .from('library_items')
        .select('id,product_id,acquired_at,products(title,price_cents)')
        .eq('acquisition_type', 'purchase')
        .in('product_id', productIds)
        .order('acquired_at', { ascending: false });

      if (purchaseResult.error) {
        setError(purchaseResult.error.message);
        setRows([]);
      } else {
        setRows((purchaseResult.data as unknown as LibraryPurchaseRow[] | null) ?? []);
      }
      setFetching(false);
    }

    loadEarnings();
  }, [user]);

  if (loading || !user) return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero title="Earnings" copy="Revenue and sold items from your creator catalog." />

        <HubSection title="Sold Items">
          {fetching ? (
            <p className="library-empty-text">Loading sold items...</p>
          ) : error ? (
            <div className="dashboard-status dashboard-status-error">{error}</div>
          ) : rows.length === 0 ? (
            <p className="library-empty-text">No items sold yet.</p>
          ) : (
            <div className="dashboard-list-surface">
              {rows.map((row, index) => (
                <div key={row.id} className="dashboard-list-row" style={{ borderTop: index === 0 ? 'none' : undefined }}>
                  <div className="dashboard-row-copy">
                    <div className="dashboard-row-title">{getPurchasedProduct(row)?.title ?? 'Item'}</div>
                    <div className="dashboard-row-subtitle">{row.acquired_at ? formatDate(row.acquired_at) : 'Purchase date unavailable'}</div>
                  </div>
                  <div className="dashboard-row-meta">{formatCurrency(getPurchasedProduct(row)?.price_cents ?? 0)}</div>
                </div>
              ))}
            </div>
          )}
        </HubSection>
      </main>
    </PageShell>
  );
}

function getPurchasedProduct(row: LibraryPurchaseRow) {
  return Array.isArray(row.products) ? row.products[0] : row.products;
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
