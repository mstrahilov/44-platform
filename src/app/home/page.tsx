'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { getAvailableDockApps } from '@/lib/osApps';
import { loadAchievementNotifications, type AchievementNotification } from '@/lib/achievementNotifications';
import type { Product } from '@/lib/products';
import { PageShell, HubHero, HubSection, Shelf, ProductCard, CenteredMessage, EmptyMessage } from '@/components/Ui';

type LibraryRow = {
  id: string;
  product_id: string | null;
  acquired_at: string | null;
  products: Product | null;
};
type HomeProfileState = {
  userId: string;
  profile: StudioProfile | null;
};
type HomeActivityState = {
  userId: string;
  recentItems: LibraryRow[];
  notifications: AchievementNotification[];
};

function greetingForHour(hour: number): string {
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [profileState, setProfileState] = useState<HomeProfileState | null>(null);
  const [activityState, setActivityState] = useState<HomeActivityState | null>(null);

  useEffect(() => {
    if (!userId) return;
    const activeUserId = userId;
    let alive = true;
    loadStudioProfile(activeUserId).then(r => {
      if (alive) setProfileState({ userId: activeUserId, profile: r.profile });
    });
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const activeUserId = userId;
    let alive = true;

    async function loadActivity() {
      const [{ data }, rows] = await Promise.all([
        supabase
          .from('library_items')
          .select('id,product_id,acquired_at,products(*)')
          .eq('user_id', activeUserId)
          .neq('status', 'archived')
          .neq('status', 'hidden')
          .order('acquired_at', { ascending: false })
          .limit(4),
        loadAchievementNotifications(activeUserId),
      ]);
      if (!alive) return;
      setActivityState({
        userId: activeUserId,
        recentItems: ((data ?? []) as unknown as LibraryRow[]).filter(row => row.products),
        notifications: rows.slice(0, 5),
      });
    }

    loadActivity();
    return () => { alive = false; };
  }, [userId]);

  const profile = profileState && profileState.userId === userId ? profileState.profile : null;
  const recentItems = activityState && activityState.userId === userId ? activityState.recentItems : [];
  const notifications = activityState && activityState.userId === userId ? activityState.notifications : [];

  if (loading) {
    return <PageShell><CenteredMessage>Loading…</CenteredMessage></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <CenteredMessage>
          <span style={{ display: 'grid', gap: 'var(--os-space-4)', justifyItems: 'center' }}>
            Sign in to open your 44OS home.
            <Link href="/login" className="os-button os-button-primary">Log In</Link>
          </span>
        </CenteredMessage>
      </PageShell>
    );
  }

  const displayName = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'there';
  const greeting = `${greetingForHour(new Date().getHours())}, ${displayName}. Pick up where you left off.`;
  const isCreator = isCreatorProfile(profile);

  const launchApps = getAvailableDockApps({ signedIn: true, isCreator });

  return (
    <PageShell>
      <div className="app-page">
        <HubHero title="Home" copy={greeting} />

        <HubSection title="Apps">
          <div className="os-app-tile-grid">
            {launchApps.map(app => (
              <Link key={app.id} href={app.href} className="os-app-tile">
                <span className={`os-icon os-icon-md ${app.iconClass}`} aria-hidden="true" />
                <span className="os-app-tile-label">{app.label}</span>
              </Link>
            ))}
          </div>
        </HubSection>

        {isCreator && (
          <HubSection title="Creator">
            <div style={{ display: 'flex', gap: 'var(--os-space-3)', flexWrap: 'wrap' }}>
              <Link href="/studio" className="os-button os-button-primary">Open Studio</Link>
              <Link href="/studio/products/new" className="os-button os-button-secondary">New Release</Link>
            </div>
          </HubSection>
        )}

        <HubSection title="Recent in Library">
          {recentItems.length === 0 ? (
            <EmptyMessage>Nothing in your Library yet. Explore Music, Books, or Assets to add something.</EmptyMessage>
          ) : (
            <Shelf>
              {recentItems.map(row => (
                <div key={row.id} className="app-shelf-item">
                  <ProductCard product={row.products as Product} owned />
                </div>
              ))}
            </Shelf>
          )}
        </HubSection>

        <HubSection title="Notifications" href="/notifications">
          {notifications.length === 0 ? (
            <EmptyMessage>You&apos;re all caught up.</EmptyMessage>
          ) : (
            <section className="dashboard-list-surface">
              {notifications.map(item => (
                <Link key={item.id} href={item.href || '/notifications'} className="dashboard-list-row">
                  <div className="dashboard-row-copy">
                    <div className="dashboard-row-title">{item.title}</div>
                    {item.description && <div className="dashboard-row-subtitle">{item.description}</div>}
                  </div>
                  <div className="dashboard-row-meta">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                  </div>
                </Link>
              ))}
            </section>
          )}
        </HubSection>
      </div>
    </PageShell>
  );
}
