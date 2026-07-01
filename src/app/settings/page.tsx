'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
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

const SETTINGS_KEYS = {
  replies: '44-setting-replies',
  likes: '44-setting-likes',
  releases: '44-setting-releases',
  orders: '44-setting-orders',
  emails: '44-setting-emails',
  publicProfile: '44-setting-public-profile',
  publicCollection: '44-setting-public-collection',
  directMessages: '44-setting-direct-messages',
  recommendations: '44-setting-recommendations',
  discord: '44-setting-discord',
  spotify: '44-setting-spotify',
  stripe: '44-setting-stripe',
  paypal: '44-setting-paypal',
  google: '44-setting-google-drive',
  dropbox: '44-setting-dropbox',
  github: '44-setting-github',
  figma: '44-setting-figma',
  youtube: '44-setting-youtube',
} as const;

function getStoredToggle(key: string, fallback = false) {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === 'true';
}

function setStoredToggle(key: string, value: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, String(value));
}

const TABS = [
  { id: 'account', label: 'Account' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy & Security' },
  { id: 'billing', label: 'Billing & Orders' },
];

export default function SettingsPage() {
  return (
    <div className="panel-scroll">
      <SystemPanel tabs={TABS}>
        {tab => (
          <>
            {tab === 'account' && <AccountSettings />}
            {tab === 'appearance' && <AppearanceSettings />}
            {tab === 'notifications' && <NotificationSettings />}
            {tab === 'privacy' && <PrivacySecuritySettings />}
            {tab === 'billing' && <BillingOrders />}
          </>
        )}
      </SystemPanel>
    </div>
  );
}

function AccountSettings() {
  const { user } = useAuth();
  const [sendingReset, setSendingReset] = useState(false);
  const [status, setStatus] = useState('');

  async function sendPasswordReset() {
    if (!user?.email || sendingReset) return;
    setSendingReset(true);
    setStatus('');
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/settings`,
    });
    setSendingReset(false);
    setStatus(error ? error.message : 'Password reset email sent.');
  }

  return (
    <div className="settings-section">
      <div className="settings-block">
        <h2 className="os-type-panel-title">Account</h2>
        <p className="os-type-body">Manage your email, password, and data.</p>
        {user?.email && (
          <span className="os-type-body-small" style={{ color: 'var(--os-color-ink-muted)' }}>
            Signed in as {user.email}
          </span>
        )}
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-card-title">Password</div>
          <p className="os-type-body-small">Send yourself a password reset email.</p>
        </div>
        <div>
          <button className="os-button os-button-secondary" type="button" onClick={sendPasswordReset} disabled={sendingReset}>
            {sendingReset ? 'Sending…' : 'Send Password Reset'}
          </button>
        </div>
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-card-title">Export Data</div>
          <p className="os-type-body-small">Download a copy of your profile, collection, and activity.</p>
        </div>
        <div>
          <button className="os-button os-button-secondary" type="button" disabled>Request Export</button>
        </div>
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-card-title">Clear History</div>
          <p className="os-type-body-small">Remove your browsing and search history from 44.</p>
        </div>
        <div>
          <button className="os-button os-button-ghost" type="button" disabled>Clear History</button>
        </div>
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-card-title">Delete Account</div>
          <p className="os-type-body-small">Permanently delete your account and all associated data. This cannot be undone.</p>
        </div>
        <div>
          <button className="os-button os-button-ghost" type="button" disabled style={{ color: '#ff6b6b' }}>Delete Account</button>
        </div>
      </div>

      {status && (
        <span className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
          {status}
        </span>
      )}
    </div>
  );
}

function AppearanceSettings() {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredMode());
  const [accent, setAccentState] = useState<ThemeAccent>(() => getStoredAccent());

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

function ToggleRow({
  title,
  desc,
  storageKey,
  defaultOn = false,
}: {
  title: string;
  desc: string;
  storageKey: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);

  useEffect(() => {
    setOn(getStoredToggle(storageKey, defaultOn));
  }, [storageKey, defaultOn]);

  function toggle() {
    setOn(current => {
      const next = !current;
      setStoredToggle(storageKey, next);
      return next;
    });
  }

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
        onClick={toggle}
      />
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="settings-section">
      <div className="settings-block">
        <h2 className="os-type-panel-title">Notifications</h2>
        <p className="os-type-body">Control what you get notified about. These choices are saved on this device.</p>
      </div>
      <div>
        <ToggleRow storageKey={SETTINGS_KEYS.replies} title="Replies to your posts" desc="When someone replies in the community." defaultOn />
        <ToggleRow storageKey={SETTINGS_KEYS.likes} title="Likes" desc="When someone likes your post or reply." defaultOn />
        <ToggleRow storageKey={SETTINGS_KEYS.releases} title="New releases from creators you follow" desc="Product, service, and resource drops." defaultOn />
        <ToggleRow storageKey={SETTINGS_KEYS.orders} title="Order updates" desc="Receipts, downloads, and delivery status." defaultOn />
        <ToggleRow storageKey={SETTINGS_KEYS.emails} title="Product emails" desc="Occasional news about 44." />
      </div>
    </div>
  );
}

function PrivacySecuritySettings() {
  return (
    <div className="settings-section">
      <div className="settings-block">
        <h2 className="os-type-panel-title">Privacy & Security</h2>
        <p className="os-type-body">Control what others see about you and how your account is protected.</p>
      </div>
      <div>
        <ToggleRow storageKey={SETTINGS_KEYS.publicProfile} title="Public profile" desc="Let others view your profile and activity." defaultOn />
        <ToggleRow storageKey={SETTINGS_KEYS.publicCollection} title="Show collection publicly" desc="Display items you own on your profile." />
        <ToggleRow storageKey={SETTINGS_KEYS.directMessages} title="Allow direct messages" desc="Let members message you directly." defaultOn />
        <ToggleRow storageKey={SETTINGS_KEYS.recommendations} title="Personalized recommendations" desc="Use your activity to tailor what you see." defaultOn />
        <ToggleRow storageKey="44-setting-2fa" title="Two-factor authentication" desc="Add an extra layer of security with a verification code." />
        <ToggleRow storageKey="44-setting-sessions" title="Active sessions" desc="Manage devices that are currently signed in." />
        <ToggleRow storageKey="44-setting-trusted" title="Trusted devices" desc="Skip 2FA on devices you trust." />
      </div>
    </div>
  );
}

function BillingOrders() {
  return (
    <div className="settings-section">
      <div className="settings-block">
        <h2 className="os-type-panel-title">Billing & Orders</h2>
        <p className="os-type-body">Your purchase history and payment methods.</p>
      </div>
      <div>
        <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Orders</h2>
        <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Your purchase history will appear here.</p>
      </div>
    </div>
  );
}
