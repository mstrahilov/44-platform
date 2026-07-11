'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, HubHero, CenteredMessage } from '@/components/Ui';
import { AchievementIconGlyph } from '@/components/AchievementIconGlyph';
import { useAuth } from '@/lib/useAuth';
import {
  ACHIEVEMENT_NOTIFICATIONS_UPDATED,
  loadAchievementNotifications,
  type AchievementNotification,
} from '@/lib/achievementNotifications';
import { notificationIsEnabled } from '@/lib/notificationPreferences';

type TabId = 'all' | 'mentions' | 'replies' | 'likes' | 'achievements';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'replies', label: 'Replies' },
  { id: 'likes', label: 'Likes' },
  { id: 'achievements', label: 'Achievements' },
];

const SEEN_NOTIF_KEY = '44-seen-notification-ids';
const HIDDEN_NOTIF_KEY = '44-hidden-notification-ids';

function markNotificationsSeen(notifications: AchievementNotification[]) {
  if (typeof window === 'undefined' || notifications.length === 0) return;
  try {
    const raw = window.localStorage.getItem(SEEN_NOTIF_KEY);
    const seen = new Set(raw ? (JSON.parse(raw) as string[]) : []);
    notifications.forEach(notification => seen.add(notification.id));
    window.localStorage.setItem(SEEN_NOTIF_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    // Local read-state should never block viewing notifications.
  }
}

function loadHiddenNotificationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(HIDDEN_NOTIF_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveHiddenNotificationIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HIDDEN_NOTIF_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Notification dismissal is a local convenience only.
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => loadHiddenNotificationIds());

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

  const enabledNotifications = notifications.filter(item => item.kind !== 'message' && notificationIsEnabled(item) && !hiddenIds.has(item.id));

  useEffect(() => {
    markNotificationsSeen(enabledNotifications);
  }, [enabledNotifications]);

  if (loading || !user) {
    return <PageShell><CenteredMessage>Loading…</CenteredMessage></PageShell>;
  }

  const visibleNotifications = enabledNotifications.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'achievements') return item.kind === 'achievement';
    if (activeTab === 'replies') return item.kind === 'reply';
    if (activeTab === 'mentions') return item.kind === 'mention';
    if (activeTab === 'likes') return item.kind === 'like';
    return false;
  });
  const emptyCopyByTab: Record<TabId, string> = {
    all: 'Unlock achievements, get replies, likes, or mentions to see activity here.',
    achievements: 'Achievements you unlock across the platform will appear here.',
    mentions: 'Posts and replies that mention you will appear here.',
    replies: 'Replies to your posts and comments will appear here.',
    likes: 'Likes on your posts will appear here.',
  };
  function hideNotification(id: string) {
    setHiddenIds(current => {
      const next = new Set(current);
      next.add(id);
      saveHiddenNotificationIds(next);
      return next;
    });
  }

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
                  className="dashboard-list-row notification-page-row"
                  style={{ cursor: item.href ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (item.href) router.push(item.href);
                  }}
                >
                  <NotificationArt item={item} />
                  <div className="dashboard-row-copy">
                    <div className="dashboard-row-title">{item.title}</div>
                    {item.description && (
                      <div className="dashboard-row-subtitle">{item.description}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="notification-page-remove"
                    aria-label={`Dismiss ${item.title}`}
                    onClick={event => {
                      event.stopPropagation();
                      hideNotification(item.id);
                    }}
                  >
                    ×
                  </button>
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

function NotificationArt({ item }: { item: AchievementNotification }) {
  const image = item.kind === 'achievement' ? item.achievementIcon : item.actorAvatarUrl;
  const fallback = item.kind === 'achievement' ? '★' : item.title.charAt(0).toUpperCase();

  return (
    <div className={item.kind === 'achievement' ? 'notification-art notification-art-achievement' : 'notification-art notification-art-user'} aria-hidden="true">
      {item.kind === 'achievement' ? (
        <AchievementIconGlyph code={item.achievementCode} label={item.title} />
      ) : image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}
