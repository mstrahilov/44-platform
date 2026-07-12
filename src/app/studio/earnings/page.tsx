'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, HubHero, HubSection } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import { loadStudioProfile } from '@/lib/studioProfiles';
import { listLegacyCreatorPurchases, type StudioPurchaseRow } from '@/lib/domain/studioCommerce';

type LibraryPurchaseRow = StudioPurchaseRow;

export default function StudioEarningsPage() {
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

      try {
        setRows(await listLegacyCreatorPurchases(profileId));
      } catch (purchaseError) {
        setError(purchaseError instanceof Error ? purchaseError.message : 'Could not load earnings history.');
        setRows([]);
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
