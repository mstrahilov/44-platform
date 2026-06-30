'use client';

import { SystemPanel } from '@/components/SystemPanel';
import { useAuth } from '@/lib/useAuth';

const TABS = [
  { id: 'account', label: 'Account' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'orders', label: 'Orders' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'messages', label: 'Messages' },
  { id: 'friends', label: 'Friends' },
];

export default function AccountPage() {
  const { user } = useAuth();
  const initials = user?.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <div className="panel-scroll">
      <SystemPanel tabs={TABS} avatar={initials}>
        {tab => (
          <>
            {tab === 'account' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Account</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
                  Manage your email, password, and account details.
                </p>
                {user && (
                  <p className="os-type-body-small" style={{ marginTop: 16, color: 'var(--os-color-ink-muted)' }}>
                    Signed in as {user.email}
                  </p>
                )}
              </div>
            )}
            {tab === 'achievements' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Achievements</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Your badges and milestones will appear here.</p>
              </div>
            )}
            {tab === 'orders' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Orders</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Your purchase history will appear here.</p>
              </div>
            )}
            {tab === 'notifications' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Notifications</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Your notifications will appear here.</p>
              </div>
            )}
            {tab === 'messages' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Messages</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Your messages will appear here.</p>
              </div>
            )}
            {tab === 'friends' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Friends</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Your friends will appear here.</p>
              </div>
            )}
          </>
        )}
      </SystemPanel>
    </div>
  );
}
