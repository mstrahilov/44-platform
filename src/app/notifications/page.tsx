'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, HubHero, CenteredMessage } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import {
  ACHIEVEMENT_NOTIFICATIONS_UPDATED,
  loadAchievementNotifications,
  type AchievementNotification,
} from '@/lib/achievementNotifications';

type TabId = 'all' | 'mentions' | 'replies' | 'orders' | 'achievements';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'replies', label: 'Replies' },
  { id: 'orders', label: 'Orders' },
  { id: 'achievements', label: 'Achievements' },
];

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('all');

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

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    async function refresh() {
      const rows = await loadAchievementNotifications(userId);
      setNotifications(rows);
    }

    function onAchievementUpdate() {
      refresh();
    }

    window.addEventListener(ACHIEVEMENT_NOTIFICATIONS_UPDATED, onAchievementUpdate);
    return () => window.removeEventListener(ACHIEVEMENT_NOTIFICATIONS_UPDATED, onAchievementUpdate);
  }, [user]);

  if (loading || !user) {
    return <PageShell><CenteredMessage>Loading…</CenteredMessage></PageShell>;
  }

  const visibleNotifications = notifications.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'achievements') return item.kind === 'achievement';
    if (activeTab === 'replies') return item.kind === 'reply';
    if (activeTab === 'mentions') return item.kind === 'mention';
    return false;
  });
  const emptyCopyByTab: Record<TabId, string> = {
    all: 'Unlock achievements, get replies, or place orders to see activity here.',
    achievements: 'Achievements you unlock across the platform will appear here.',
    mentions: 'Posts and replies that mention you will appear here.',
    replies: 'Replies to your posts and comments will appear here.',
    orders: 'Order updates and receipts will appear here.',
  };

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero title="Notifications" copy="Mentions, replies, achievements, and other account activity." />
        <div className="settings-segment" role="tablist" aria-label="Notification sections">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={`settings-segment-item${tab.id === activeTab ? ' settings-segment-item-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <section className="dashboard-section">
          {visibleNotifications.length > 0 ? (
            <div className="dashboard-list-surface">
              {visibleNotifications.map(item => (
                <article
                  key={item.id}
                  className="dashboard-list-row"
                  style={{ gridTemplateColumns: 'minmax(0, 1fr) auto', cursor: item.href ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (item.href) router.push(item.href);
                  }}
                >
                  <div className="dashboard-row-copy">
                    <div className="os-type-eyebrow" style={{ color: item.kind === 'reply' ? 'var(--os-color-ink-secondary)' : 'var(--os-color-accent)' }}>
                      {item.kind === 'reply' ? 'Reply' : item.kind === 'mention' ? 'Mention' : 'Achievement Unlocked'}
                    </div>
                    <div className="dashboard-row-title">{item.title}</div>
                    {item.description && (
                      <div className="dashboard-row-subtitle">{item.description}</div>
                    )}
                  </div>
                  <div className="dashboard-row-meta">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Just now'}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="dashboard-list-surface" style={{ padding: 24 }}>
              <div className="app-empty-text">{emptyCopyByTab[activeTab]}</div>
            </div>
          )}
        </section>
      </main>
    </PageShell>
  );
}
