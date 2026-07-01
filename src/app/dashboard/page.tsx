'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SystemPanel } from '@/components/SystemPanel';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'products', label: 'Products' },
  { id: 'services', label: 'Services' },
  { id: 'resources', label: 'Resources' },
  { id: 'posts', label: 'Posts' },
  { id: 'orders', label: 'Orders' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'payouts', label: 'Payouts' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const initials = user?.email?.charAt(0).toUpperCase() ?? '?';
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
    return <div className="panel-scroll" />;
  }

  if (profile && !isCreatorProfile(profile)) {
    return (
      <div className="panel-scroll">
        <SystemPanel tabs={[{ id: 'dashboard', label: 'Dashboard' }]} avatar={initials}>
          {() => (
            <div className="settings-section">
              <div className="settings-block">
                <h2 className="os-type-panel-title">Creator access required</h2>
                <p className="os-type-body">
                  Dashboard is for creator accounts. You can update your public profile first, then switch your role in Supabase when you are ready to publish.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/profile" className="os-button os-button-primary">Open Public Profile</Link>
                <Link href="/" className="os-button os-button-ghost">Back Home</Link>
              </div>
            </div>
          )}
        </SystemPanel>
      </div>
    );
  }

  return (
    <div className="panel-scroll">
      <SystemPanel tabs={TABS} avatar={initials}>
        {tab => (
          <>
            {tab === 'overview' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Dashboard Overview</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
                  Your private creator workspace. Manage releases, services, resources, posts, payouts, and performance from one place.
                </p>
              </div>
            )}
            {tab === 'products' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Products</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginBottom: 18 }}>
                  Manage your music, books, games, merch, and digital assets.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link href="/dashboard/products" className="os-button os-button-primary os-button-compact">
                    Open Products
                  </Link>
                  <Link href="/dashboard/products/new" className="os-button os-button-ghost os-button-compact">
                    New Product
                  </Link>
                </div>
              </div>
            )}
            {tab === 'services' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Services</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginBottom: 18 }}>Manage your offered services.</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link href="/dashboard/services" className="os-button os-button-primary os-button-compact">
                    Open Services
                  </Link>
                  <Link href="/dashboard/services/new" className="os-button os-button-ghost os-button-compact">
                    New Service
                  </Link>
                </div>
              </div>
            )}
            {tab === 'resources' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Resources</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginBottom: 18 }}>Manage your published guides and tutorials.</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link href="/dashboard/resources" className="os-button os-button-primary os-button-compact">
                    Open Resources
                  </Link>
                  <Link href="/dashboard/resources/new" className="os-button os-button-ghost os-button-compact">
                    New Resource
                  </Link>
                </div>
              </div>
            )}
            {tab === 'posts' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Posts</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginBottom: 18 }}>
                  Write updates, announcements, and community posts from inside your dashboard.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link href="/dashboard/posts" className="os-button os-button-primary os-button-compact">
                    Open Posts
                  </Link>
                  <Link href="/dashboard/posts/new" className="os-button os-button-ghost os-button-compact">
                    New Post
                  </Link>
                </div>
              </div>
            )}
            {tab === 'orders' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Orders</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>View incoming product orders and service requests.</p>
              </div>
            )}
            {tab === 'analytics' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Analytics</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Views, listens, saves, sales, and engagement data.</p>
              </div>
            )}
            {tab === 'payouts' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Payouts</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Earnings, payout history, and transfer status.</p>
              </div>
            )}
          </>
        )}
      </SystemPanel>
    </div>
  );
}
