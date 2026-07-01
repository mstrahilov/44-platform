'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SystemPanel } from '@/components/SystemPanel';
import { useAuth } from '@/lib/useAuth';

const TABS = [
  { id: 'messages', label: 'Messages' },
  { id: 'requests', label: 'Requests' },
  { id: 'friends', label: 'Friends' },
  { id: 'archived', label: 'Archived' },
];

const EMPTY: Record<string, { title: string; body: string }> = {
  messages:  { title: 'No messages',        body: 'Direct messages from members you follow will appear here.' },
  requests:  { title: 'No requests',        body: 'Message requests from people you don\'t follow yet will appear here.' },
  friends:   { title: 'No friends yet',     body: 'Follow members and connect to build your friends list.' },
  archived:  { title: 'Nothing archived',   body: 'Conversations you archive will be stored here.' },
};

export default function InboxPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  if (loading || !user) return <div className="panel-scroll" />;

  return (
    <div className="panel-scroll">
      <SystemPanel tabs={TABS}>
        {tab => {
          const empty = EMPTY[tab];
          return (
            <div className="settings-section">
              <div className="settings-block">
                <h2 className="os-type-panel-title">{empty.title.split(' ').slice(1).join(' ') || tab}</h2>
              </div>
              <div className="app-empty">
                <div className="os-type-section-title">{empty.title}</div>
                <p className="os-type-body" style={{ marginTop: 'var(--os-space-2)', color: 'var(--os-color-ink-secondary)' }}>
                  {empty.body}
                </p>
              </div>
            </div>
          );
        }}
      </SystemPanel>
    </div>
  );
}
