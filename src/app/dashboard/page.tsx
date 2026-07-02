'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useDashboardTabs } from '@/lib/dashboardTabs';

export default function DashboardPage() {
  useDashboardTabs('overview');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      const result = await loadStudioProfile(user.id);
      setProfile(result.profile);
    }
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!loading && user === null) {
      router.replace('/login');
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  if (profile && !isCreatorProfile(profile)) {
    return (
      <PageShell>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 0' }}>
          <GlassPanel style={{ padding: 40 }}>
            <h1 className="os-type-panel-title" style={{ marginBottom: 8 }}>Creator Access Required</h1>
            <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginBottom: 18 }}>
              Dashboard is for creator accounts. You can update your public profile first, then switch your role in Supabase when you are ready to publish.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/profile" className="os-button os-button-primary">Open Public Profile</Link>
              <Link href="/" className="os-button os-button-ghost">Back Home</Link>
            </div>
          </GlassPanel>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '64px 0' }}>
        <GlassPanel style={{ padding: 40 }}>
          <h1 style={{ fontSize: 48, fontWeight: 780, letterSpacing: '-0.04em', marginBottom: 10 }}>
            Dashboard Overview
          </h1>
          <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginBottom: 22 }}>
            Your private creator workspace. Manage releases, services, resources, posts, payouts, and performance from one place.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/dashboard/products" className="os-button os-button-primary os-button-compact">Products</Link>
            <Link href="/dashboard/services" className="os-button os-button-ghost os-button-compact">Services</Link>
            <Link href="/dashboard/resources" className="os-button os-button-ghost os-button-compact">Resources</Link>
            <Link href="/dashboard/posts" className="os-button os-button-ghost os-button-compact">Posts</Link>
          </div>
        </GlassPanel>
      </div>
    </PageShell>
  );
}
