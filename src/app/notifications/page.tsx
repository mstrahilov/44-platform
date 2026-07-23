'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, HubHero, CenteredMessage } from '@/components/Ui';
import { AchievementIconGlyph } from '@/components/AchievementIconGlyph';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { FilterPopover } from '@/components/FilterPopover';
import {
  ACHIEVEMENT_NOTIFICATIONS_UPDATED,
  loadAchievementNotifications,
  type AchievementNotification,
} from '@/lib/achievementNotifications';
import { notificationIsEnabled } from '@/lib/notificationPreferences';
import {
  loadNotificationReadState,
  saveNotificationReadState,
} from '@/lib/notificationState';

type TabId = 'all' | 'mentions' | 'replies' | 'messages' | 'likes' | 'achievements';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'replies', label: 'Replies' },
  { id: 'messages', label: 'Messages' },
  { id: 'likes', label: 'Likes' },
  { id: 'achievements', label: 'Achievements' },
];

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const [rows, readState] = await Promise.all([
        loadAchievementNotifications(user.id, 500),
        loadNotificationReadState(user.id),
      ]);
      const nextSeen = new Set(readState.seenIds);
      const nextNew = new Set<string>();
      rows.forEach(item => {
        if (!notificationIsEnabled(item)) return;
        if (!readState.seenIds.has(item.id)) nextNew.add(item.id);
        nextSeen.add(item.id);
      });
      setNotifications(rows);
      setNewIds(nextNew);
      if (nextSeen.size !== readState.seenIds.size) {
        await saveNotificationReadState(user.id, { seenIds: nextSeen, hiddenIds: readState.hiddenIds });
      }
    }
    void load();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    async function refresh() {
      const [rows, readState] = await Promise.all([
        loadAchievementNotifications(userId, 500),
        loadNotificationReadState(userId),
      ]);
      const nextSeen = new Set(readState.seenIds);
      const incoming = rows.filter(item => notificationIsEnabled(item) && !readState.seenIds.has(item.id));
      incoming.forEach(item => nextSeen.add(item.id));
      setNotifications(rows);
      setNewIds(current => new Set([...current, ...incoming.map(item => item.id)]));
      if (incoming.length > 0) {
        await saveNotificationReadState(userId, { seenIds: nextSeen, hiddenIds: readState.hiddenIds });
      }
    }

    function onAchievementUpdate() {
      refresh();
    }

    window.addEventListener(ACHIEVEMENT_NOTIFICATIONS_UPDATED, onAchievementUpdate);
    const channel = supabase
      .channel(`notification-page:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'achievement_events', filter: `user_id=eq.${userId}`,
      }, onAchievementUpdate)
      .subscribe();
    return () => {
      window.removeEventListener(ACHIEVEMENT_NOTIFICATIONS_UPDATED, onAchievementUpdate);
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const enabledNotifications = notifications.filter(item => notificationIsEnabled(item));

  if (loading || !user) {
    return <PageShell><CenteredMessage status>Loading…</CenteredMessage></PageShell>;
  }

  const visibleNotifications = enabledNotifications.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'achievements') return item.kind === 'achievement';
    if (activeTab === 'replies') return item.kind === 'reply';
    if (activeTab === 'mentions') return item.kind === 'mention';
    if (activeTab === 'messages') return item.kind === 'message';
    if (activeTab === 'likes') return item.kind === 'like';
    return false;
  });
  const emptyCopyByTab: Record<TabId, string> = {
    all: 'Unlock achievements, get replies, likes, or mentions to see activity here.',
    achievements: 'Achievements you unlock across the platform will appear here.',
    mentions: 'Posts and replies that mention you will appear here.',
    replies: 'Replies to your posts and comments will appear here.',
    messages: 'New inbox messages will appear here.',
    likes: 'Likes on your posts will appear here.',
  };
  const notificationTools = (
    <div className="page-header-tools">
      <FilterPopover label="Filter Notifications" active={activeTab !== 'all'}>
        {({ close }) => <>
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'ui44-paper-menu-item ui44-paper-menu-item-selected page-filter-option page-filter-option-active' : 'ui44-paper-menu-item page-filter-option'}
              onClick={() => { setActiveTab(tab.id); close(); }}
            >
              {tab.label}
            </button>
          ))}
        </>}
      </FilterPopover>
    </div>
  );

  function openNotification(item: AchievementNotification) {
    setNewIds(current => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
    if (item.href) router.push(item.href);
  }

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero
          title="Notifications"
          copy="Mentions, replies, achievements, and other account activity."
          actions={notificationTools}
          className="notifications-page-header"
        />
        <section className="dashboard-section">
          {visibleNotifications.length > 0 ? (
            <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
              {visibleNotifications.map(item => (
                <article
                  key={item.id}
                  className={`${item.href
                    ? 'dashboard-list-row notification-page-row ui44-list-row ui44-list-row-notification ui44-list-row-interactive'
                    : 'dashboard-list-row notification-page-row ui44-list-row ui44-list-row-notification'}${newIds.has(item.id) ? ' notification-page-row-new' : ''}`}
                  role={item.href ? 'link' : undefined}
                  tabIndex={item.href ? 0 : undefined}
                  onClick={() => {
                    openNotification(item);
                  }}
                  onKeyDown={event => {
                    if (!item.href || (event.key !== 'Enter' && event.key !== ' ')) return;
                    event.preventDefault();
                    openNotification(item);
                  }}
                >
                  <NotificationArt item={item} />
                  <div className="dashboard-row-copy">
                    <div className="dashboard-row-title">{item.title}</div>
                    {item.description && (
                      <div className="dashboard-row-subtitle">{item.description}</div>
                    )}
                  </div>
                  {newIds.has(item.id) ? <span className="notification-page-new-dot" aria-label="New notification" /> : null}
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
    <div className={item.kind === 'achievement'
      ? 'notification-art notification-art-achievement'
      : 'notification-art notification-art-user ui44-identity-avatar ui44-identity-avatar-inline'} aria-hidden="true">
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
