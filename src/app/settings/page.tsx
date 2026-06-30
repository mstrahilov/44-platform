'use client';

import { SystemPanel } from '@/components/SystemPanel';

const TABS = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'connected-apps', label: 'Connected Apps' },
];

export default function SettingsPage() {
  return (
    <div className="panel-scroll">
      <SystemPanel tabs={TABS}>
        {tab => (
          <>
            {tab === 'appearance' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Appearance</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
                  Customize your theme, accent color, and display preferences.
                </p>
              </div>
            )}
            {tab === 'notifications' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Notifications</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
                  Control what you get notified about and how.
                </p>
              </div>
            )}
            {tab === 'privacy' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Privacy</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
                  Manage your data, visibility, and privacy settings.
                </p>
              </div>
            )}
            {tab === 'connected-apps' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Connected Apps</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
                  Manage third-party apps and integrations.
                </p>
              </div>
            )}
          </>
        )}
      </SystemPanel>
    </div>
  );
}
