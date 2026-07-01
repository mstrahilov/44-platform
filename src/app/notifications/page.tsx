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
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>
                  {tab === 'all' ? 'All Notifications' : 'Updates'}
                </h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginBottom: 18 }}>
                  Achievement unlocks and system activity.
                </p>
                {notifications.length === 0 ? (
                  <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-muted)' }}>
                    No notifications yet.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {notifications.map(item => (
                      <article key={item.id} className="os-panel-surface" style={{ padding: 18, display: 'grid', gap: 6 }}>
                        <div className="os-type-label" style={{ color: 'var(--os-color-accent)' }}>Achievement Unlocked</div>
                        <strong className="os-type-card-title">{item.title}</strong>
                        {item.description ? (
                          <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>{item.description}</p>
                        ) : null}
                        <div className="os-type-caption" style={{ color: 'var(--os-color-ink-muted)' }}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Just now'}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === 'mentions' && (
              <Placeholder title="Mentions" body="Posts and replies that mention you will appear here." />
            )}
            {tab === 'replies' && (
              <Placeholder title="Replies" body="Replies to your posts and comments will appear here." />
            )}
            {tab === 'orders' && (
              <Placeholder title="Orders" body="Order updates and receipts will appear here." />
            )}
          </>
        )}
      </SystemPanel>
    </div>
  );
}

function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>{title}</h2>
      <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>{body}</p>
    </div>
  );
}
