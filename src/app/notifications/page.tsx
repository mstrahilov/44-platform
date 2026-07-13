'use client';

import { useEffect, useRef, useState } from 'react';
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
import {
  loadNotificationReadState,
  NOTIFICATION_STATE_UPDATED,
  saveNotificationReadState,
} from '@/lib/notificationState';

type TabId = 'all' | 'mentions' | 'replies' | 'likes' | 'achievements';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'replies', label: 'Replies' },
  { id: 'likes', label: 'Likes' },
  { id: 'achievements', label: 'Achievements' },
];

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const navigationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'all' && navigationRef.current) navigationRef.current.scrollLeft = 0;
  }, [activeTab]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const [rows, readState] = await Promise.all([
        loadAchievementNotifications(user.id),
        loadNotificationReadState(user.id),
      ]);
      const nextSeen = new Set(readState.seenIds);
      rows.forEach(item => {
        if (item.kind !== 'message' && notificationIsEnabled(item) && !readState.hiddenIds.has(item.id)) nextSeen.add(item.id);
      });
      setNotifications(rows);
      setSeenIds(nextSeen);
      setHiddenIds(readState.hiddenIds);
      if (nextSeen.size !== readState.seenIds.size) {
        await saveNotificationReadState(user.id, { seenIds: nextSeen, hiddenIds: readState.hiddenIds });
      }
    }
    void load();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    async function refreshReadState() {
      const state = await loadNotificationReadState(userId);
      setSeenIds(state.seenIds);
      setHiddenIds(state.hiddenIds);
    }
    window.addEventListener(NOTIFICATION_STATE_UPDATED, refreshReadState);
    return () => window.removeEventListener(NOTIFICATION_STATE_UPDATED, refreshReadState);
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
      if (user) void saveNotificationReadState(user.id, { seenIds, hiddenIds: next });
      return next;
    });
  }

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero title="Notifications" copy="Mentions, replies, achievements, and other account activity." />
        <div ref={navigationRef} className="social-profile-tabs notification-navigation" role="tablist" aria-label="Notification sections">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === activeTab}
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
            <div className="app-empty-text">{emptyCopyByTab[activeTab]}</div>
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
