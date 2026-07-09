'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
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
import { getAvailableDockApps, type OSAppId } from '@/lib/osApps';
import { resetDockPreferences, setDockAppHidden, setDockMode, useDockPreferences, type DockMode } from '@/lib/dockPreferences';

type SettingsTabId = 'system' | 'dock' | 'region' | 'account';

const TABS: Array<{ id: SettingsTabId; label: string; copy: string }> = [
  { id: 'system', label: 'System', copy: 'Theme, accent, and the way 44OS opens.' },
  { id: 'dock', label: 'Dock', copy: 'Control Dock layout, visible apps, and where 44OS opens.' },
  { id: 'region', label: 'Region', copy: 'Region, currency, and local pricing defaults.' },
  { id: 'account', label: 'Account', copy: 'Email, password, privacy, and notifications.' },
];

const ACCOUNT_KEYS = {
  replies: '44-setting-replies',
  likes: '44-setting-likes',
  releases: '44-setting-releases',
  emails: '44-setting-emails',
  publicProfile: '44-setting-public-profile',
  directMessages: '44-setting-direct-messages',
  recommendations: '44-setting-recommendations',
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

function normalizeSettingsTab(value: string | null): SettingsTabId {
  if (value === 'appearance' || value === 'clock' || value === 'accessibility' || value === 'advanced') return 'system';
  if (value === 'privacy' || value === 'notifications' || value === 'orders') return 'account';
  return TABS.some(tab => tab.id === value) ? (value as SettingsTabId) : 'system';
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
    setActiveTab(requestedTab);
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
      href: tab.id === 'system' ? '/settings' : `/settings?tab=${tab.id}`,
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
  const { mode, hiddenIds, order } = useDockPreferences();

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
  const hideableApps = availableApps
    .filter(app => !app.locked)
    .sort((a, b) => orderIndex(order, a.id) - orderIndex(order, b.id));
  const landingApps = availableApps
    .filter(app => ['store', 'library', 'community', 'dashboard'].includes(app.id))
    .sort((a, b) => orderIndex(order, a.id) - orderIndex(order, b.id));

  function chooseLandingPage(id: LandingPageId) {
    setLandingPage(id);
    setLandingPageId(id);
  }

  function resetDockDefaults() {
    resetDockPreferences();
    setLandingPage('store');
    setLandingPageId('store');
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

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Dock Apps</div>
          <p className="os-type-body-small">Choose which apps appear in your Dock. Settings always stays available.</p>
        </div>
        <div>
          {hideableApps.map(app => {
            const visible = !hiddenIds.includes(app.id);
            return (
              <div key={app.id} className="settings-row">
                <div className="settings-row-copy">
                  <div className="os-type-card-title">{app.label}</div>
                  <p className="os-type-body-small">{app.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={visible}
                  aria-label={`Show ${app.label} in Dock`}
                  className={visible ? 'settings-toggle settings-toggle-on' : 'settings-toggle'}
                  onClick={() => setDockAppHidden(app.id, visible)}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="settings-section-actions">
        <button className="os-button os-button-secondary os-button-compact" type="button" onClick={resetDockDefaults}>
          Reset Defaults
        </button>
      </div>
    </div>
  );
}

function AccountSettings() {
  const { user } = useAuth();
  const [sendingReset, setSendingReset] = useState(false);
  const [status, setStatus] = useState('');
  const [resetSignal, setResetSignal] = useState(0);

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
    Object.entries(ACCOUNT_KEYS).forEach(([, key]) => {
      window.localStorage.removeItem(key);
    });
    setStatus('Account preferences reset.');
    setResetSignal(current => current + 1);
  }

  return (
    <div className="settings-section settings-section-wide">
      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Email</div>
          <p className="os-type-body-small">Your login and account recovery email.</p>
        </div>
        <span className="os-type-body">{user?.email ?? 'Sign in to manage your account.'}</span>
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Password</div>
          <p className="os-type-body-small">Send a password reset link to your email.</p>
        </div>
        <button className="os-button os-button-secondary" type="button" onClick={sendPasswordReset} disabled={!user?.email || sendingReset}>
          {sendingReset ? 'Sending...' : 'Send Password Reset'}
        </button>
        {status && <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>{status}</p>}
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Privacy</div>
          <p className="os-type-body-small">Profile details live on your Profile page. These controls affect account-level visibility.</p>
        </div>
        <ToggleRow storageKey={ACCOUNT_KEYS.publicProfile} title="Public profile" desc="Let others view your profile and creator/member activity." defaultOn resetSignal={resetSignal} />
        <ToggleRow storageKey={ACCOUNT_KEYS.directMessages} title="Allow direct messages" desc="Let members message you directly." defaultOn resetSignal={resetSignal} />
        <ToggleRow storageKey={ACCOUNT_KEYS.recommendations} title="Personalized recommendations" desc="Use your activity to tailor what you see." defaultOn resetSignal={resetSignal} />
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Notifications</div>
          <p className="os-type-body-small">Choose which account activity should reach you.</p>
        </div>
        <ToggleRow storageKey={ACCOUNT_KEYS.replies} title="Replies to your posts" desc="When someone replies in the community." defaultOn resetSignal={resetSignal} />
        <ToggleRow storageKey={ACCOUNT_KEYS.likes} title="Likes" desc="When someone likes your post or reply." defaultOn resetSignal={resetSignal} />
        <ToggleRow storageKey={ACCOUNT_KEYS.releases} title="New releases from creators you follow" desc="Music, books, assets, resources, and merch drops." defaultOn resetSignal={resetSignal} />
        <ToggleRow storageKey={ACCOUNT_KEYS.emails} title="44 emails" desc="Occasional news about 44." resetSignal={resetSignal} />
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
  storageKey,
  defaultOn = false,
  resetSignal = 0,
}: {
  title: string;
  desc: string;
  storageKey: string;
  defaultOn?: boolean;
  resetSignal?: number;
}) {
  const [on, setOn] = useState(defaultOn);

  useEffect(() => {
    Promise.resolve().then(() => setOn(getStoredToggle(storageKey, defaultOn)));
  }, [storageKey, defaultOn, resetSignal]);

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

function orderIndex(order: OSAppId[], id: string) {
  const index = order.indexOf(id as OSAppId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
