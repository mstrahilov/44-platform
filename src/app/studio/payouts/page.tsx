'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, HubHero } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { listCreatorPayouts, type CreatorPayoutItem } from '@/lib/domain/studioCommerce';
import { creatorPaidSalesMessage, loadCreatorPaidSalesState, type CreatorPaidSalesState } from '@/lib/domain/creatorCommerce';

export default function StudioPayoutsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [fetching, setFetching] = useState(true);
  const [payouts, setPayouts] = useState<CreatorPayoutItem[]>([]);
  const [paidSales, setPaidSales] = useState<CreatorPaidSalesState | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      try {
        const creatorId = profileResult.profile?.id ?? user.id;
        setPaidSales(await loadCreatorPaidSalesState(creatorId));
        setPayouts(await listCreatorPayouts(creatorId));
      }
      catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Could not load payouts.'); }
      setFetching(false);
    }

    loadData();
  }, [user]);

  if (loading || !user) {
    return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>;
  }

  if (profile && !isCreatorProfile(profile)) {
    return (
      <PageShell>
        <div className="dashboard-page">
          <Ui44Panel overflow="visible" className="ui44-creator-gate">
            <h1 className="os-type-panel-title ui44-creator-gate-title">Creator Access Required</h1>
            <p className="os-type-body ui44-creator-gate-copy">
              Studio is for creator accounts.
            </p>
            <Link href="/profile" className="os-button os-button-primary">Open Public Profile</Link>
          </Ui44Panel>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="dashboard-page">
        <HubHero
          title="Payouts"
          copy="Track verified creator payouts when paid sales come online."
        />
        <div className="dashboard-status ui44-status" role="status">
          <strong>{paidSales?.can_sell_paid ? 'Paid sales enabled.' : 'Payout setup.'}</strong> {creatorPaidSalesMessage(paidSales)}
        </div>
        {paidSales && !paidSales.is_platform_seller && paidSales.admin_status === 'approved' && !paidSales.can_sell_paid ? <Ui44Panel overflow="visible">
          <h2 className="os-type-panel-title">Creator setup required</h2>
          <p className="os-type-body">Complete your individual tax form and Wise email-to-claim destination before uploading Items.</p>
          {paidSales.requirements_due.length ? <p className="os-type-meta">Information needed: {paidSales.requirements_due.join(', ')}</p> : null}
          <div className="ui44-section-gap-before"><Link className="os-button os-button-primary" href="/studio/onboarding">Open Creator Setup</Link></div>
        </Ui44Panel> : null}
        <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
          <div className="dashboard-empty">
            {fetching ? 'Loading payouts…' : error || (payouts.length === 0 ? 'No verified payouts yet.' : null)}
          </div>
          {!fetching && !error ? payouts.map(payout => <div key={payout.id} className="dashboard-list-row ui44-list-row ui44-list-row-dashboard">
            <div className="dashboard-row-copy"><div className="dashboard-row-title">{payout.status}</div><div className="dashboard-row-subtitle">{new Date(payout.completed_at || payout.created_at).toLocaleDateString()}</div></div>
            <div className="dashboard-row-meta">{new Intl.NumberFormat(undefined, { style: 'currency', currency: payout.currency }).format(payout.amount_cents / 100)}</div>
          </div>) : null}
        </div>
      </div>
    </PageShell>
  );
}
