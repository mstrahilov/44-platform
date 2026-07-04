'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { getAvailableDockApps } from '@/lib/osApps';
import { useDockPreferences } from '@/lib/dockPreferences';
import { loadAchievementNotifications, type AchievementNotification } from '@/lib/achievementNotifications';
import type { Product } from '@/lib/products';
import { PageShell, HubHero, HubSection, Shelf, ProductCard, CenteredMessage, EmptyMessage } from '@/components/Ui';

type LibraryRow = {
  id: string;
  product_id: string | null;
  acquired_at: string | null;
  products: Product | null;
};

function greetingForHour(hour: number): string {
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const { hiddenIds } = useDockPreferences();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [recentItems, setRecentItems] = useState<LibraryRow[]>([]);
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    loadStudioProfile(user.id).then(r => setProfile(r.profile));
  }, [user]);

  useEffect(() => {
    if (!user) { setRecentItems([]); setNotifications([]); return; }
    const userId = user.id;

    supabase
      .from('library_items')
      .select('id,product_id,acquired_at,products(*)')
      .eq('user_id', userId)
      .neq('status', 'archived')
      .neq('status', 'hidden')
      .order('acquired_at', { ascending: false })
      .limit(4)
      .then(({ data }) => {
        setRecentItems(((data ?? []) as unknown as LibraryRow[]).filter(row => row.products));
      });

    loadAchievementNotifications(userId).then(rows => setNotifications(rows.slice(0, 5)));
  }, [user]);

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

  const launchApps = getAvailableDockApps({ signedIn: true, isCreator })
    .filter(app => app.id !== 'home' && (app.locked || !hiddenIds.includes(app.id)));

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
              <Link href="/dashboard" className="os-button os-button-primary">Open Dashboard</Link>
              <Link href="/dashboard/products/new" className="os-button os-button-secondary">New Release</Link>
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
