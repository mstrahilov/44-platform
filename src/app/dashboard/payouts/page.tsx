'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { useDashboardTabs } from '@/lib/dashboardTabs';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';

export default function DashboardPayoutsPage() {
  useDashboardTabs('payouts');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      const profileId = profileResult.profile?.id ?? user.id;

      await Promise.all([
        supabase.from('products').select('id').eq('author_id', profileId).limit(1),
        supabase.from('services').select('id').eq('author_id', profileId).limit(1),
      ]);
      setFetching(false);
    }

    loadData();
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
              Dashboard is for creator accounts.
            </p>
            <Link href="/profile" className="os-button os-button-primary">Open Public Profile</Link>
          </GlassPanel>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div className="dashboard-header-copy">
            <h1 className="os-type-display">Earnings</h1>
            <p className="os-type-body">
              Track sold items and creator earnings as purchases come online.
            </p>
          </div>
        </header>

        <section className="dashboard-section">
          <div className="dashboard-header-copy">
            <h2 className="os-type-panel-content">Sold Items</h2>
            <p className="os-type-body-small">
              Completed sales will show up here once earnings reporting is connected.
            </p>
          </div>

          {fetching ? (
            <div className="dashboard-empty">Loading earnings…</div>
          ) : (
            <div className="dashboard-list-surface">
              <div className="dashboard-empty">No sold items yet.</div>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
