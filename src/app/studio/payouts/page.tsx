'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, HubHero } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';

export default function StudioPayoutsPage() {
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
          title="Earnings"
          copy="Track sold items and creator earnings as purchases come online."
        />
        <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
          <div className="dashboard-empty">
            {fetching ? 'Loading earnings…' : 'No sold items yet.'}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
