'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import {
  COUNTRIES,
  CURRENCIES,
  DEFAULT_VIEWER_COUNTRY,
  DEFAULT_VIEWER_CURRENCY,
  currencyForCountry,
  getStoredViewerCountry,
  getStoredViewerCurrency,
  setStoredViewerPreferences,
} from '@/lib/marketPreferences';
import { LANDING_PAGES, getLandingPageId, setLandingPageId, type LandingPageId } from '@/lib/landingPage';
import { isMissingColumnError } from '@/lib/schemaCompat';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';

const SETTINGS_KEYS = {
  replies: '44-setting-replies',
  likes: '44-setting-likes',
  releases: '44-setting-releases',
  orders: '44-setting-orders',
  emails: '44-setting-emails',
  publicProfile: '44-setting-public-profile',
  publicLibrary: '44-setting-public-library',
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
  { id: 'system', label: 'System' },
  { id: 'account', label: 'Account' },
  { id: 'privacy', label: 'Privacy & Security' },
  { id: 'billing', label: 'Billing & Orders' },
  { id: 'notifications', label: 'Notifications' },
];

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="panel-scroll" />}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const tabs = user ? TABS : TABS.filter(tab => tab.id === 'system');
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab') ?? undefined;
  const defaultTab = tabs.some(tab => tab.id === requestedTab) ? requestedTab : tabs[0]?.id;

  return (
    <div className="panel-scroll">
      <SystemPanel tabs={tabs} defaultTab={defaultTab}>
        {tab => (
          <>
            {tab === 'system' && <SystemSettings />}
            {tab === 'account' && <AccountSettings />}
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
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [sendingReset, setSendingReset] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const result = await loadStudioProfile(user.id);
      setProfile(result.profile);
    }

    loadProfile();
  }, [user]);

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
          <div className="os-type-card-title">Public Profile</div>
          <p className="os-type-body-small">Profile image, bio, header image, and friendship controls now live in your public profile editor.</p>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <span className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
            {profile?.username ? `@${profile.username}` : 'Your community profile is ready.'}
          </span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link className="os-button os-button-primary" href="/community/profile/edit">
              Edit Profile
            </Link>
            {profile?.username && (
              <a className="os-button os-button-secondary" href={`/community/profile/${profile.username}`}>
                View Public Profile
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-card-title">Email</div>
          <p className="os-type-body-small">Your login and account recovery email.</p>
        </div>
        <div>
          <span className="os-type-body">{user?.email ?? 'No email on file.'}</span>
        </div>
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
          <div className="os-type-card-title">Security</div>
          <p className="os-type-body-small">Use Privacy & Security for message permissions, public visibility, and trusted-device controls.</p>
        </div>
        <div>
          <Link className="os-button os-button-secondary" href="/settings?tab=privacy">
            Open Privacy & Security
          </Link>
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

function SystemSettings() {
  const { user } = useAuth();
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [accent, setAccentState] = useState<ThemeAccent>('amber');
  const [landingPage, setLandingPage] = useState<LandingPageId>('store');
  const [countryCode, setCountryCode] = useState(DEFAULT_VIEWER_COUNTRY);
  const [displayCurrency, setDisplayCurrency] = useState(DEFAULT_VIEWER_CURRENCY);
  const [marketStatus, setMarketStatus] = useState('');

  useEffect(() => {
    setModeState(getStoredMode());
    setAccentState(getStoredAccent());
    setLandingPage(getLandingPageId());
    setCountryCode(getStoredViewerCountry());
    setDisplayCurrency(getStoredViewerCurrency());
  }, []);

  useEffect(() => {
    async function loadSystemPreferences() {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('country_code, display_currency')
        .eq('id', user.id)
        .maybeSingle();

      const nextCountry = !isMissingColumnError(error) && data?.country_code
        ? data.country_code
        : getStoredViewerCountry() || DEFAULT_VIEWER_COUNTRY;
      const nextCurrency = !isMissingColumnError(error) && data?.display_currency
        ? data.display_currency
        : getStoredViewerCurrency() || DEFAULT_VIEWER_CURRENCY;
      setCountryCode(nextCountry);
      setDisplayCurrency(nextCurrency);
      setStoredViewerPreferences(nextCountry, nextCurrency);
    }

    loadSystemPreferences();
  }, [user]);

  function chooseMode(m: ThemeMode) {
    setModeState(m);
    setMode(m);
  }
  function chooseAccent(a: ThemeAccent) {
    setAccentState(a);
    setAccent(a);
  }
  function chooseLandingPage(id: LandingPageId) {
    setLandingPage(id);
    setLandingPageId(id);
  }

  async function saveMarketPreferences(nextCountry: string, nextCurrency: string) {
    setCountryCode(nextCountry);
    setDisplayCurrency(nextCurrency);
    setStoredViewerPreferences(nextCountry, nextCurrency);
    setMarketStatus('');

    if (!user) {
      setMarketStatus('Saved on this device.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        country_code: nextCountry,
        display_currency: nextCurrency,
      })
      .eq('id', user.id);

    if (isMissingColumnError(error)) {
      setMarketStatus('Saved on this device.');
      return;
    }

    setMarketStatus(error ? error.message : 'System preferences saved.');
  }

  return (
    <div className="settings-section">
      <div className="settings-block">
        <h2 className="os-type-panel-title">System</h2>
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

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-card-title">Landing Page</div>
          <p className="os-type-body-small">Choose where 44 opens after login.</p>
        </div>
        <div className="settings-segment" role="group" aria-label="Landing page">
          {LANDING_PAGES.map(page => (
            <button
              key={page.id}
              type="button"
              className={page.id === landingPage ? 'settings-segment-item settings-segment-item-active' : 'settings-segment-item'}
              onClick={() => chooseLandingPage(page.id)}
            >
              {page.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-card-title">Region</div>
          <p className="os-type-body-small">Tell 44 which market you browse from so local creator pricing can appear when it applies.</p>
        </div>
        <select
          className="input"
          value={countryCode}
          onChange={event => {
            const nextCountry = event.target.value;
            void saveMarketPreferences(nextCountry, currencyForCountry(nextCountry));
          }}
        >
          {COUNTRIES.map(country => (
            <option key={country.code} value={country.code}>{country.name}</option>
          ))}
        </select>
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-card-title">Display Currency</div>
          <p className="os-type-body-small">Prices outside local creator offers are converted from USD into this currency.</p>
        </div>
        <select
          className="input"
          value={displayCurrency}
          onChange={event => void saveMarketPreferences(countryCode, event.target.value)}
        >
          {CURRENCIES.map(currency => (
            <option key={currency.code} value={currency.code}>
              {currency.code} - {currency.label}
            </option>
          ))}
        </select>
      </div>

      {marketStatus && (
        <span className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
          {marketStatus}
        </span>
      )}

      {!user && (
        <div className="settings-field">
          <div className="settings-field-head">
            <div className="os-type-card-title">Account settings</div>
            <p className="os-type-body-small">Log in to manage your profile, password, privacy, notifications, billing, and orders.</p>
          </div>
          <div>
            <Link href="/login" className="os-button os-button-primary">
              Log In
            </Link>
          </div>
        </div>
      )}
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
        <ToggleRow storageKey={SETTINGS_KEYS.publicLibrary} title="Show library publicly" desc="Display items you own on your profile." />
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
