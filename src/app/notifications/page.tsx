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
import { PublicArtwork } from '@/components/PublicArtwork';
import {
  loadNotificationReadState,
  saveNotificationReadState,
} from '@/lib/notificationState';
import { OS44Button } from '@/components/OS44Button';

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
  const [readError, setReadError] = useState('');
  const [readErrorAction, setReadErrorAction] = useState<'load' | 'item' | 'all'>('load');
  const [failedReadId, setFailedReadId] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('44:notifications-filter-state', { detail: { active: activeTab !== 'all' } }));
    return () => {
      window.dispatchEvent(new CustomEvent('44:notifications-filter-state', { detail: { active: false } }));
    };
  }, [activeTab]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const [rows, readState] = await Promise.all([
          loadAchievementNotifications(user.id, 500),
          loadNotificationReadState(user.id),
        ]);
        setNotifications(rows);
        setNewIds(new Set(rows.filter(item => notificationIsEnabled(item) && !readState.seenIds.has(item.id)).map(item => item.id)));
        setReadError('');
      } catch {
        setReadError('Notifications or their read state could not be loaded. Try again.');
        setReadErrorAction('load');
      }
    }
    void load();
  }, [loadAttempt, user]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    async function refresh() {
      try {
        const [rows, readState] = await Promise.all([
          loadAchievementNotifications(userId, 500),
          loadNotificationReadState(userId),
        ]);
        setNotifications(rows);
        setNewIds(new Set(rows.filter(item => notificationIsEnabled(item) && !readState.seenIds.has(item.id)).map(item => item.id)));
        setReadError('');
      } catch {
        setReadError('Notifications or their read state could not be refreshed. Try again.');
        setReadErrorAction('load');
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
  async function markRead(id: string) {
    if (!user) return;
    setReadError('');
    setFailedReadId(id);
    try {
      const current = await loadNotificationReadState(user.id);
      const seenIds = new Set(current.seenIds);
      seenIds.add(id);
      await saveNotificationReadState(user.id, { ...current, seenIds });
      setNewIds(ids => { const next = new Set(ids); next.delete(id); return next; });
    } catch {
      setReadError('Could not save notification read state. Try again.');
      setReadErrorAction('item');
    }
  }

  async function markAllRead() {
    if (!user) return;
    setReadError('');
    try {
      const current = await loadNotificationReadState(user.id);
      const seenIds = new Set(current.seenIds);
      enabledNotifications.forEach(item => seenIds.add(item.id));
      await saveNotificationReadState(user.id, { ...current, seenIds });
      setNewIds(new Set());
    } catch {
      setReadError('Could not save notification read state. Try again.');
      setReadErrorAction('all');
    }
  }

  const emptyCopyByTab: Record<TabId, string> = {
    all: 'Messages, mentions, replies, achievements, and other account activity will appear here.',
    achievements: 'Achievements you unlock across the platform will appear here.',
    mentions: 'Posts and replies that mention you will appear here.',
    replies: 'Replies to your posts and comments will appear here.',
    messages: 'New inbox messages will appear here.',
    likes: 'Likes on your posts will appear here.',
  };
  const notificationTools = (
    <div className="page-header-tools">
      {newIds.size > 0 && <OS44Button type="button" className="os-button os-button-secondary os-button-compact" onClick={() => { void markAllRead(); }}>Mark all read</OS44Button>}
      <FilterPopover label="Filter Notifications" active={activeTab !== 'all'} hideTrigger popoverClassName="notifications-filter-popover">
        {({ close }) => <>
          {newIds.size > 0 && <button type="button" className="ui44-paper-menu-item page-filter-option" onClick={() => { void markAllRead(); close(); }}>Mark all read</button>}
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
    void markRead(item.id);
    if (item.href) router.push(item.href);
  }

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero
          title="Notifications"
          copy="Messages, mentions, replies, achievements, and other account activity."
          actions={notificationTools}
          className="notifications-page-header"
        />
        <section className="dashboard-section">
          {readError && <p className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{readError}{' '}<OS44Button type="button" className="os-button os-button-secondary os-button-compact" onClick={() => {
            if (readErrorAction === 'all') void markAllRead();
            else if (readErrorAction === 'item' && failedReadId) void markRead(failedReadId);
            else setLoadAttempt(value => value + 1);
          }}>Try again</OS44Button></p>}
          {visibleNotifications.length > 0 ? (
            <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
              {visibleNotifications.map(item => (
                <article
                  key={item.id}
                  className={`dashboard-list-row notification-page-row ui44-list-row ui44-list-row-notification${item.href ? ' ui44-list-row-interactive' : ''}${newIds.has(item.id) ? ' notification-page-row-new' : ''}${item.kind === 'achievement' ? ' notification-page-row-achievement' : ''}`}
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
                    <div className="notification-page-title-line">
                      <div className="dashboard-row-title">{item.title}</div>
                      {newIds.has(item.id) ? <span className="notification-page-new-dot" aria-label="New notification" /> : null}
                    </div>
                    {(item.kind === 'achievement' || item.description) && (
                      <div className="dashboard-row-subtitle">{item.kind === 'achievement' ? 'Achievement Unlocked' : item.description}</div>
                    )}
                  </div>
                  {item.href ? <NotificationChevron /> : null}
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
  const image = item.kind === 'achievement' ? item.achievementArtworkUrl : item.actorAvatarUrl;
  const fallback = item.kind === 'achievement' ? '★' : item.title.charAt(0).toUpperCase();

  return (
    <div className={item.kind === 'achievement'
      ? 'notification-art notification-art-achievement notification-art-achievement-release'
      : 'notification-art notification-art-user ui44-identity-avatar ui44-identity-avatar-inline'} aria-hidden="true">
      {item.kind === 'achievement' && image ? (
        <PublicArtwork src={image} alt="" sizes="56px" />
      ) : item.kind === 'achievement' ? (
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

function NotificationChevron() {
  return (
    <span className="notification-page-chevron" aria-hidden="true">›</span>
  );
}
