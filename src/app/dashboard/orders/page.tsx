'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import { useDashboardTabs } from '@/lib/dashboardTabs';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';

export default function DashboardPlaceholder() {
  useDashboardTabs('orders');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    loadStudioProfile(user.id).then(result => setProfile(result.profile));
  }, [user]);

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  if (profile && !isCreatorProfile(profile)) {
    return (
      <PageShell>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 0' }}>
          <GlassPanel style={{ padding: 40 }}>
            <h1 style={{ fontSize: 42, fontWeight: 780, marginBottom: 12, letterSpacing: '-0.04em' }}>Creator Access Required</h1>
            <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 18, marginBottom: 18 }}>
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
      <div
        style={{
          maxWidth: 1000,
          margin: '0 auto',
          padding: '64px 0',
        }}
      >
        <GlassPanel
          style={{
            padding: 40,
          }}
        >
          <h1
            style={{
              fontSize: 42,
              fontWeight: 780,
              marginBottom: 12,
              letterSpacing: '-0.04em',
            }}
          >
            Orders
          </h1>

          <p
            style={{
              color: 'var(--os-color-ink-secondary)',
              fontSize: 18,
            }}
          >
            This page is ready to be built.
          </p>
        </GlassPanel>
      </div>
    </PageShell>
  );
}
