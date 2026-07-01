'use client';

import { useEffect, useState } from 'react';
import { SystemPanel } from '@/components/SystemPanel';
import {
  ACCENTS,
  MODES,
  getStoredAccent,
  getStoredMode,
  setAccent,
  setMode,
  type ThemeAccent,
  type ThemeMode,
} from '@/lib/theme';

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
            {tab === 'appearance' && <AppearanceSettings />}
            {tab === 'notifications' && <NotificationSettings />}
            {tab === 'privacy' && <PrivacySettings />}
            {tab === 'connected-apps' && <ConnectedApps />}
          </>
        )}
      </SystemPanel>
    </div>
  );
}

function AppearanceSettings() {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [accent, setAccentState] = useState<ThemeAccent>('amber');

  useEffect(() => {
    setModeState(getStoredMode());
    setAccentState(getStoredAccent());
  }, []);

  function chooseMode(m: ThemeMode) {
    setModeState(m);
    setMode(m);
  }
  function chooseAccent(a: ThemeAccent) {
    setAccentState(a);
    setAccent(a);
  }

  return (
    <div className="settings-section">
      <div className="settings-block">
        <h2 className="os-type-panel-title">Appearance</h2>
        <p className="os-type-body">Choose how 44 looks. Changes apply instantly and are saved to this device.</p>
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-card-title">Theme</div>
          <p className="os-type-body-small">Light, dark, or match your system.</p>
        </div>
        <div className="settings-segment" role="group" aria-label="Theme mode">
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              className={m.id === mode ? 'settings-segment-item settings-segment-item-active' : 'settings-segment-item'}
              onClick={() => chooseMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-card-title">Accent</div>
          <p className="os-type-body-small">The color of the glass and ambient background.</p>
        </div>
        <div className="settings-swatches" role="group" aria-label="Accent color">
          {ACCENTS.map(a => (
            <button
              key={a.id}
              type="button"
              className={a.id === accent ? 'settings-swatch settings-swatch-active' : 'settings-swatch'}
              onClick={() => chooseAccent(a.id)}
              aria-pressed={a.id === accent}
            >
              <span className="settings-swatch-dot" style={{ background: a.swatch }} />
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Scaffolded tabs (visual only — wired to backend later) ── */

function ToggleRow({ title, desc, defaultOn = false }: { title: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="settings-row">
      <div className="settings-row-copy">
        <div className="os-type-card-title">{title}</div>
        <p className="os-type-body-small">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        className={on ? 'settings-toggle settings-toggle-on' : 'settings-toggle'}
        onClick={() => setOn(v => !v)}
      />
    </div>
  );
}

function ScaffoldHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="settings-block">
      <h2 className="os-type-panel-title">{title}</h2>
      <p className="os-type-body">{desc}</p>
      <span className="os-pill os-status-coming-soon settings-soon">Coming soon</span>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="settings-section">
      <ScaffoldHeader title="Notifications" desc="Control what you get notified about and how." />
      <div>
        <ToggleRow title="Replies to your posts" desc="When someone replies in the community." defaultOn />
        <ToggleRow title="Likes" desc="When someone likes your post or reply." defaultOn />
        <ToggleRow title="New releases from creators you follow" desc="Product, service, and resource drops." defaultOn />
        <ToggleRow title="Order updates" desc="Receipts, downloads, and delivery status." defaultOn />
        <ToggleRow title="Product emails" desc="Occasional news about 44." />
      </div>
    </div>
  );
}

function PrivacySettings() {
  return (
    <div className="settings-section">
      <ScaffoldHeader title="Privacy" desc="Manage your data, visibility, and privacy settings." />
      <div>
        <ToggleRow title="Public profile" desc="Let others view your profile and activity." defaultOn />
        <ToggleRow title="Show collection publicly" desc="Display items you own on your profile." />
        <ToggleRow title="Allow direct messages" desc="Let members message you directly." defaultOn />
        <ToggleRow title="Personalized recommendations" desc="Use your activity to tailor what you see." defaultOn />
      </div>
    </div>
  );
}

function ConnectedApps() {
  return (
    <div className="settings-section">
      <ScaffoldHeader title="Connected Apps" desc="Manage third-party apps and integrations." />
      <div>
        <ToggleRow title="Discord" desc="Link your Discord account." />
        <ToggleRow title="Spotify" desc="Show what you're listening to." />
        <ToggleRow title="Stripe" desc="Payouts and creator earnings." />
      </div>
    </div>
  );
}
