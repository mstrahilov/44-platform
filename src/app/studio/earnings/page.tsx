'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, HubHero, HubSection } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import { loadStudioProfile } from '@/lib/studioProfiles';
import { listCreatorEarnings, type CreatorEarningsEntry } from '@/lib/domain/studioCommerce';
import { creatorPaidSalesMessage, loadCreatorPaidSalesState, type CreatorPaidSalesState } from '@/lib/domain/creatorCommerce';

export default function StudioEarningsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<CreatorEarningsEntry[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [paidSales, setPaidSales] = useState<CreatorPaidSalesState | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function loadEarnings() {
      if (!user) return;
      const profileResult = await loadStudioProfile(user.id);
      const profileId = profileResult.profile?.id ?? user.id;

      try {
        const [earnings, commerceState] = await Promise.all([
          listCreatorEarnings(profileId), loadCreatorPaidSalesState(profileId),
        ]);
        setRows(earnings);
        setPaidSales(commerceState);
      } catch (purchaseError) {
        setError(purchaseError instanceof Error ? purchaseError.message : 'Could not load earnings history.');
        setRows([]);
      }
      setFetching(false);
    }

    loadEarnings();
  }, [user]);

  if (loading || !user) return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>;

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero title="Earnings" copy="Revenue and sold items from your creator catalog." />

        <div className="dashboard-status ui44-status" role="status">
          <strong>{paidSales?.can_sell_paid ? 'Paid sales enabled.' : 'Creator earnings.'}</strong> {creatorPaidSalesMessage(paidSales)}
        </div>

        <HubSection title="Sold Items">
          {fetching ? (
            <p className="library-empty-text ui44-state ui44-state-loading" role="status" aria-live="polite">Loading sold items...</p>
          ) : error ? (
            <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div>
          ) : rows.length === 0 ? (
            <p className="library-empty-text">No items sold yet.</p>
          ) : (
            <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
              {rows.map(row => (
                <div key={row.id} className="dashboard-list-row ui44-list-row ui44-list-row-dashboard">
                  <div className="dashboard-row-copy">
                    <div className="dashboard-row-title">{formatEntryType(row.entry_type)}</div>
                    <div className="dashboard-row-subtitle">{formatDate(row.created_at)}{row.available_at ? ` · Available ${formatDate(row.available_at)}` : ''}</div>
                  </div>
                  <div className="dashboard-row-meta">{formatCurrency(row.amount_cents, row.currency)}</div>
                </div>
              ))}
            </div>
          )}
        </HubSection>
      </main>
    </PageShell>
  );
}

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatEntryType(value: CreatorEarningsEntry['entry_type']) {
  return value.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
