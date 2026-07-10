'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { PageShell, HubHero, EmptyMessage } from '@/components/Ui';
import { useTopbarTabs } from '@/components/TopbarContext';
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
  currencyForCountry,
  getDetectedViewerCountry,
  getStoredViewerCountry,
  getStoredViewerCurrency,
  setStoredViewerPreferences,
} from '@/lib/marketPreferences';
import { getLandingPageId, setLandingPageId, type LandingPageId } from '@/lib/landingPage';
import { isMissingColumnError } from '@/lib/schemaCompat';
import { getSitePathUrl } from '@/lib/siteUrl';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { getAvailableDockApps } from '@/lib/osApps';
import { setDockMode, useDockPreferences, type DockMode } from '@/lib/dockPreferences';
import { getNotificationPreference, resetNotificationPreferences, setNotificationPreference, type NotificationPreferenceKind } from '@/lib/notificationPreferences';

type SettingsTabId = 'system' | 'dock' | 'region' | 'account';

const TABS: Array<{ id: SettingsTabId; label: string; copy: string }> = [
  { id: 'account', label: 'Account', copy: 'Email, password, privacy, and notifications.' },
  { id: 'system', label: 'System', copy: 'Theme, accent, and the way 44OS opens.' },
  { id: 'dock', label: 'Dock', copy: 'Control Dock layout, visible apps, and where 44OS opens.' },
  { id: 'region', label: 'Region', copy: 'Region, currency, and local pricing defaults.' },
];

const ACCOUNT_KEYS = {
  mentions: 'mentions',
  replies: 'replies',
  likes: 'likes',
  achievements: 'achievements',
} as const;

function normalizeSettingsTab(value: string | null): SettingsTabId {
  if (value === 'appearance' || value === 'clock' || value === 'accessibility' || value === 'advanced') return 'system';
  if (value === 'privacy' || value === 'notifications' || value === 'orders') return 'account';
  return TABS.some(tab => tab.id === value) ? (value as SettingsTabId) : 'account';
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageShell><div /></PageShell>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { user, loading } = useAuth();
  const tabs = TABS;
  const searchParams = useSearchParams();
  const requestedTab = normalizeSettingsTab(searchParams.get('tab'));
  const initialTab: SettingsTabId = requestedTab;
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);

  useEffect(() => {
    Promise.resolve().then(() => setActiveTab(requestedTab));
  }, [requestedTab, tabs]);

  useEffect(() => {
    if (!tabs.some(tab => tab.id === activeTab)) {
      Promise.resolve().then(() => setActiveTab(tabs[0]?.id ?? 'system'));
    }
  }, [activeTab, tabs]);

  useTopbarTabs(
    tabs.map(tab => ({
      id: tab.id,
      label: tab.label,
      href: `/settings?tab=${tab.id}`,
      active: tab.id === activeTab,
    })),
  );

  const activeMeta = tabs.find(tab => tab.id === activeTab) ?? tabs[0];

  if (loading) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Settings" copy="System, Dock, region, and account controls." />
          <EmptyMessage>Log in to manage your 44OS settings.</EmptyMessage>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--os-space-4)' }}>
            <Link href="/login" className="os-button os-button-primary">
              Log In
            </Link>
          </div>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero title="Settings" copy={activeMeta?.copy} />
        {activeTab === 'system' && <SystemSettings />}
        {activeTab === 'dock' && <DockSettings />}
        {activeTab === 'region' && <RegionSettings />}
        {activeTab === 'account' && <AccountSettings />}
      </main>
    </PageShell>
  );
}

function SystemSettings() {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [accent, setAccentState] = useState<ThemeAccent>('amber');

  useEffect(() => {
    Promise.resolve().then(() => {
      setModeState(getStoredMode());
      setAccentState(getStoredAccent());
    });
  }, []);

  function chooseMode(m: ThemeMode) {
    setModeState(m);
    setMode(m);
  }
  function chooseAccent(a: ThemeAccent) {
    setAccentState(a);
    setAccent(a);
  }

  function resetSystemDefaults() {
    chooseMode('light');
    chooseAccent('amber');
  }

  return (
    <div className="settings-section">
      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Theme</div>
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
          <div className="os-type-field-title">Accent</div>
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
      <div className="settings-section-actions">
        <button className="os-button os-button-secondary os-button-compact" type="button" onClick={resetSystemDefaults}>
          Reset Defaults
        </button>
      </div>
    </div>
  );
}

function RegionSettings() {
  const { user } = useAuth();
  const [countryCode, setCountryCode] = useState('US');
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [marketStatus, setMarketStatus] = useState('');

  useEffect(() => {
    Promise.resolve().then(() => {
      setCountryCode(getStoredViewerCountry());
      setDisplayCurrency(getStoredViewerCurrency());
    });
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
        : getStoredViewerCountry();
      const nextCurrency = !isMissingColumnError(error) && data?.display_currency
        ? data.display_currency
        : getStoredViewerCurrency();
      setCountryCode(nextCountry);
      setDisplayCurrency(nextCurrency);
      setStoredViewerPreferences(nextCountry, nextCurrency);
    }

    loadSystemPreferences();
  }, [user]);

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

  function resetRegionDefaults() {
    const detectedCountry = getDetectedViewerCountry();
    void saveMarketPreferences(detectedCountry, currencyForCountry(detectedCountry));
  }

  return (
    <div className="settings-section">
      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Region</div>
          <p className="os-type-body-small">Choose your local market. Creator item forms use this region when you add a local price.</p>
        </div>
        <select
          className="os-input-field"
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
          <div className="os-type-field-title">Display Currency</div>
          <p className="os-type-body-small">Set the currency used for browsing and for local-price defaults when your region does not provide one automatically.</p>
        </div>
        <select
          className="os-input-field"
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
      <div className="settings-section-actions">
        <button className="os-button os-button-secondary os-button-compact" type="button" onClick={resetRegionDefaults}>
          Reset Defaults
        </button>
      </div>
    </div>
  );
}

const DOCK_MODES: Array<{ id: DockMode; label: string }> = [
  { id: 'full', label: 'Full' },
  { id: 'compact', label: 'Compact' },
];

function DockSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [landingPage, setLandingPage] = useState<LandingPageId>('store');
  const { mode } = useDockPreferences();

  useEffect(() => {
    if (!user) { Promise.resolve().then(() => setProfile(null)); return; }
    loadStudioProfile(user.id).then(r => setProfile(r.profile));
  }, [user]);

  useEffect(() => {
    Promise.resolve().then(() => setLandingPage(getLandingPageId()));
  }, []);

  const availableApps = getAvailableDockApps({
    signedIn: Boolean(user),
    isCreator: isCreatorProfile(profile),
  });
  const landingApps = ['library', 'store', 'radio', 'community']
    .map(id => availableApps.find(app => app.id === id))
    .filter((app): app is NonNullable<typeof app> => Boolean(app));

  function chooseLandingPage(id: LandingPageId) {
    setLandingPage(id);
    setLandingPageId(id);
  }

  return (
    <div className="settings-section settings-section-wide">
      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Landing App</div>
          <p className="os-type-body-small">Choose which visible Dock app opens after login.</p>
        </div>
        <div className="settings-segment" role="group" aria-label="Landing app">
          {landingApps.map(app => (
            <button
              key={app.id}
              type="button"
              className={app.id === landingPage ? 'settings-segment-item settings-segment-item-active' : 'settings-segment-item'}
              onClick={() => chooseLandingPage(app.id as LandingPageId)}
            >
              {app.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Dock</div>
          <p className="os-type-body-small">Full shows icons and labels. Compact shows icons only.</p>
        </div>
        <div className="settings-segment" role="group" aria-label="Dock mode">
          {DOCK_MODES.map(m => (
            <button
              key={m.id}
              type="button"
              className={m.id === mode ? 'settings-segment-item settings-segment-item-active' : 'settings-segment-item'}
              onClick={() => setDockMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountSettings() {
  const { user } = useAuth();
  const [sendingReset, setSendingReset] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('');
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    Promise.resolve().then(() => setNewEmail(user?.email ?? ''));
  }, [user?.email]);

  async function changeEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.email || !newEmail.trim() || savingEmail) return;
    if (newEmail.trim() === user.email) {
      setStatus('Email is already current.');
      return;
    }
    setSavingEmail(true);
    setStatus('');
    const { error } = await supabase.auth.updateUser(
      { email: newEmail.trim() },
      { emailRedirectTo: getSitePathUrl('/settings?tab=account') },
    );
    setSavingEmail(false);
    setStatus(error ? error.message : 'Check your new email to confirm the change.');
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8 || savingPassword) {
      setStatus('Password must be at least 8 characters.');
      return;
    }
    setSavingPassword(true);
    setStatus('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    setStatus(error ? error.message : 'Password updated.');
    if (!error) setNewPassword('');
  }

  async function sendPasswordReset() {
    if (!user?.email || sendingReset) return;
    setSendingReset(true);
    setStatus('');
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: getSitePathUrl('/settings?tab=account'),
    });
    setSendingReset(false);
    setStatus(error ? error.message : 'Password reset email sent.');
  }

  function resetAccountDefaults() {
    resetNotificationPreferences();
    setStatus('Account preferences reset.');
    setResetSignal(current => current + 1);
  }

  return (
    <div className="settings-section settings-section-wide">
      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Email</div>
          <p className="os-type-body-small">Your login and account recovery email. Changes require email confirmation.</p>
        </div>
        <form className="settings-inline-form" onSubmit={changeEmail}>
          <input
            className="os-input-field"
            type="email"
            value={newEmail}
            onChange={event => setNewEmail(event.target.value)}
            placeholder={user?.email ?? 'email@example.com'}
            autoComplete="email"
          />
          <button className="os-button os-button-secondary" type="submit" disabled={!user?.email || savingEmail}>
            {savingEmail ? 'Saving...' : 'Change Email'}
          </button>
        </form>
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Password</div>
          <p className="os-type-body-small">Update your current password, or send a reset link to your email.</p>
        </div>
        <form className="settings-inline-form" onSubmit={changePassword}>
          <input
            className="os-input-field"
            type="password"
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            minLength={8}
          />
          <button className="os-button os-button-primary" type="submit" disabled={savingPassword || newPassword.length < 8}>
            {savingPassword ? 'Saving...' : 'Change Password'}
          </button>
          <button className="os-button os-button-secondary" type="button" onClick={sendPasswordReset} disabled={!user?.email || sendingReset}>
            {sendingReset ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        {status && <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>{status}</p>}
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Notifications</div>
          <p className="os-type-body-small">Choose which account activity should reach you.</p>
        </div>
        <ToggleRow preferenceKind={ACCOUNT_KEYS.mentions} title="Mentions" desc="When someone mentions you in Community." defaultOn resetSignal={resetSignal} />
        <ToggleRow preferenceKind={ACCOUNT_KEYS.replies} title="Replies" desc="When someone replies to your posts or comments." defaultOn resetSignal={resetSignal} />
        <ToggleRow preferenceKind={ACCOUNT_KEYS.likes} title="Likes" desc="When someone likes your post or reply." defaultOn resetSignal={resetSignal} />
        <ToggleRow preferenceKind={ACCOUNT_KEYS.achievements} title="Achievements" desc="When you unlock achievements across 44OS." defaultOn resetSignal={resetSignal} />
      </div>
      <div className="settings-section-actions">
        <button className="os-button os-button-secondary os-button-compact" type="button" onClick={resetAccountDefaults}>
          Reset Defaults
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  preferenceKind,
  defaultOn = false,
  resetSignal = 0,
}: {
  title: string;
  desc: string;
  preferenceKind: NotificationPreferenceKind;
  defaultOn?: boolean;
  resetSignal?: number;
}) {
  const [on, setOn] = useState(defaultOn);

  useEffect(() => {
    Promise.resolve().then(() => setOn(getNotificationPreference(preferenceKind, defaultOn)));
  }, [preferenceKind, defaultOn, resetSignal]);

  function toggle() {
    setOn(current => {
      const next = !current;
      setNotificationPreference(preferenceKind, next);
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
