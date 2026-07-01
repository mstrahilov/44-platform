'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SystemPanel } from '@/components/SystemPanel';
import { useAuth } from '@/lib/useAuth';
import { loadAchievementNotifications, type AchievementNotification } from '@/lib/achievementNotifications';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'replies', label: 'Replies' },
  { id: 'orders', label: 'Orders' },
  { id: 'updates', label: 'Updates' },
];

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const rows = await loadAchievementNotifications(user.id);
      setNotifications(rows);
    }
    load();
  }, [user]);

  if (loading || !user) return <div className="panel-scroll" />;

  return (
    <div className="panel-scroll">
      <SystemPanel tabs={TABS}>
        {tab => (
          <>
            {(tab === 'all' || tab === 'updates') && (
              <div className="settings-section">
                <div className="settings-block">
                  <h2 className="os-type-panel-title">
                    {tab === 'all' ? 'Notifications' : 'Updates'}
                  </h2>
                  <p className="os-type-body">Achievement unlocks and system activity.</p>
                </div>

                {notifications.length === 0 ? (
                  <div className="app-empty">
                    <div className="os-type-section-title">Nothing yet</div>
                    <p className="os-type-body" style={{ marginTop: 'var(--os-space-2)', color: 'var(--os-color-ink-secondary)' }}>
                      Unlock achievements, get replies, or place orders to see activity here.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {notifications.map(item => (
                      <article key={item.id} className="app-panel" style={{ display: 'grid', gap: 6 }}>
                        <div className="os-type-eyebrow" style={{ color: 'var(--os-color-accent)' }}>
                          Achievement Unlocked
                        </div>
                        <strong className="os-type-card-title">{item.title}</strong>
                        {item.description && (
                          <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
                            {item.description}
                          </p>
                        )}
                        <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)' }}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Just now'}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
            {(tab === 'mentions' || tab === 'replies' || tab === 'orders') && (
              <div className="settings-section">
                <div className="settings-block">
                  <h2 className="os-type-panel-title">
                    {tab === 'mentions' ? 'Mentions' : tab === 'replies' ? 'Replies' : 'Orders'}
                  </h2>
                </div>
                <div className="app-empty">
                  <div className="os-type-section-title">Nothing yet</div>
                  <p className="os-type-body" style={{ marginTop: 'var(--os-space-2)', color: 'var(--os-color-ink-secondary)' }}>
                    {tab === 'mentions' && 'Posts and replies that mention you will appear here.'}
                    {tab === 'replies' && 'Replies to your posts and comments will appear here.'}
                    {tab === 'orders' && 'Order updates and receipts will appear here.'}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </SystemPanel>
    </div>
  );
}
