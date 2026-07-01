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
        {tab => (
          <>
            {tab === 'messages' && (
              <Placeholder title="Messages" body="Your direct messages will appear here." />
            )}
            {tab === 'requests' && (
              <Placeholder title="Requests" body="Message requests from people you don't follow will appear here." />
            )}
            {tab === 'friends' && (
              <Placeholder title="Friends" body="Your friends list will appear here." />
            )}
            {tab === 'archived' && (
              <Placeholder title="Archived" body="Archived conversations will appear here." />
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
