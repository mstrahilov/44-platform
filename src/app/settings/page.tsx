'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { getThemePreference, saveThemePreference } from '@/lib/domain/preferences';
import { getProfileMarketPreferences, saveProfileMarketPreferences } from '@/lib/domain/profiles';
import { PageShell, HubHero, EmptyMessage, SectionHeader } from '@/components/Ui';
import {
  ACCENTS,
  applyTheme,
  DEFAULT_THEME_ACCENT,
  DEFAULT_THEME_MODE,
  MODES,
  isThemeAccent,
  isThemeMode,
  type ThemeAccent,
  type ThemeMode,
} from '@/lib/theme';
import {
  COUNTRIES,
  CURRENCIES,
  currencyForCountry,
  getStoredViewerCountry,
  getStoredViewerCurrency,
  setStoredViewerPreferences,
} from '@/lib/marketPreferences';
import { getLandingPageId, LANDING_PAGES, setLandingPageId, type LandingPageId } from '@/lib/landingPage';
import { isMissingColumnError } from '@/lib/schemaCompat';
import { getSitePathUrl } from '@/lib/siteUrl';
import { getNotificationPreference, setNotificationPreference, type NotificationPreferenceKind } from '@/lib/notificationPreferences';

type SettingsAnchorId = 'account' | 'notifications' | 'appearance' | 'dock';

const ACCOUNT_KEYS = {
  mentions: 'mentions',
  replies: 'replies',
  likes: 'likes',
  achievements: 'achievements',
} as const;

function normalizeSettingsAnchor(value: string | null | undefined): SettingsAnchorId | null {
  if (!value) return null;
  if (value === 'dock') return 'dock';
  if (value === 'system' || value === 'appearance' || value === 'clock' || value === 'accessibility' || value === 'advanced') return 'appearance';
  if (value === 'notifications') return 'notifications';
  if (value === 'region') return 'account';
  if (value === 'account' || value === 'privacy' || value === 'orders') return 'account';
  return null;
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
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loading || typeof window === 'undefined') return;
    let frame = 0;
    function scrollToRequestedSection() {
      const hash = window.location.hash.replace(/^#/, '');
      const anchor = normalizeSettingsAnchor(hash) ?? normalizeSettingsAnchor(searchParams.get('tab'));
      if (!anchor) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
      });
    }
    scrollToRequestedSection();
    window.addEventListener('hashchange', scrollToRequestedSection);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', scrollToRequestedSection);
    };
  }, [loading, searchParams]);

  if (loading) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Settings" />
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
        <HubHero title="Settings" />
        <div className="settings-page-stack">
          <SettingsPageSection
            id="appearance"
            title="Appearance"
          >
            <AppearanceSettings />
          </SettingsPageSection>
          <SettingsPageSection
            id="account"
            title="Account"
          >
            <AccountSettings />
          </SettingsPageSection>
          <SettingsPageSection
            id="notifications"
            title="Notifications"
          >
            <NotificationSettings />
          </SettingsPageSection>
        </div>
      </main>
    </PageShell>
  );
}

function SettingsPageSection({
  id,
  title,
  description,
  action,
  children,
}: {
  id: SettingsAnchorId;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="settings-page-section" id={id} aria-label={title}>
      <SectionHeader title={title} description={description} action={action} />
      {children}
    </section>
  );
}

function AppearanceSettings() {
  return (
    <div className="settings-section settings-section-wide settings-two-column" id="dock">
      <ThemeSettings />
      <LandingAppSettings />
    </div>
  );
}

function ThemeSettings() {
  const { user } = useAuth();
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_THEME_MODE);
  const [accent, setAccentState] = useState<ThemeAccent>(DEFAULT_THEME_ACCENT);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    getThemePreference(user.id)
      .then(data => {
        if (!alive) return;
        setModeState(isThemeMode(data?.theme_mode) ? data.theme_mode : DEFAULT_THEME_MODE);
        setAccentState(isThemeAccent(data?.theme_accent) ? data.theme_accent : DEFAULT_THEME_ACCENT);
      }).catch(() => {});
    return () => { alive = false; };
  }, [user]);

  async function saveTheme(nextMode: ThemeMode, nextAccent: ThemeAccent) {
    if (!user) return;
    try { await saveThemePreference(user.id, nextMode, nextAccent); } catch { return; }
    setModeState(nextMode);
    setAccentState(nextAccent);
    applyTheme(nextMode, nextAccent);
  }

  function chooseMode(m: ThemeMode) {
    void saveTheme(m, accent);
  }
  function chooseAccent(a: ThemeAccent) {
    void saveTheme(mode, a);
  }

  return (
    <>
      <div className="settings-field settings-theme-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Theme</div>
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

      <div className="settings-field settings-accent-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Accent</div>
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
    </>
  );
}

function RegionSettingsFields({ onStatus }: { onStatus: (status: string) => void }) {
  const { user } = useAuth();
  const [countryCode, setCountryCode] = useState('US');
  const [displayCurrency, setDisplayCurrency] = useState('USD');

  useEffect(() => {
    Promise.resolve().then(() => {
      setCountryCode(getStoredViewerCountry());
      setDisplayCurrency(getStoredViewerCurrency());
    });
  }, []);

  useEffect(() => {
    async function loadSystemPreferences() {
      if (!user) return;
      let data = null;
      let error: unknown = null;
      try { data = await getProfileMarketPreferences(user.id); } catch (loadError) { error = loadError; }

      const nextCountry = !isMissingColumnError(error as { message?: string | null; code?: string | null }) && data?.country_code
        ? data.country_code
        : getStoredViewerCountry();
      const nextCurrency = !isMissingColumnError(error as { message?: string | null; code?: string | null }) && data?.display_currency
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
    onStatus('');

    if (!user) {
      onStatus('Saved on this device.');
      return;
    }

    let error: unknown = null;
    try { await saveProfileMarketPreferences(user.id, nextCountry, nextCurrency); } catch (saveError) { error = saveError; }

    if (isMissingColumnError(error as { message?: string | null; code?: string | null })) {
      onStatus('Saved on this device.');
      return;
    }

    onStatus(error instanceof Error ? error.message : 'System preferences saved.');
  }

  return (
    <>
      <div className="settings-field settings-market-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Region</div>
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

      <div className="settings-field settings-market-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Display Currency</div>
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
    </>
  );
}

function LandingAppSettings() {
  const [landingPage, setLandingPage] = useState<LandingPageId>('store');

  useEffect(() => {
    Promise.resolve().then(() => setLandingPage(getLandingPageId()));
  }, []);

  function chooseLandingPage(id: LandingPageId) {
    setLandingPage(id);
    setLandingPageId(id);
  }

  return (
      <div className="settings-field settings-landing-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Landing App</div>
        </div>
        <div className="settings-segment" role="group" aria-label="Landing app">
          {LANDING_PAGES.map(app => (
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
  );
}

function AccountSettings() {
  const { user } = useAuth();
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('');

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
      { emailRedirectTo: getSitePathUrl('/settings') },
    );
    setSavingEmail(false);
    setStatus(error ? error.message : 'Check your new email to confirm the change.');
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !newPassword || savingPassword) return;
    setSavingPassword(true);
    setStatus('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (!error) setNewPassword('');
    setStatus(error ? error.message : 'Password saved.');
  }

  return (
    <div className="settings-section settings-section-wide settings-two-column">
      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Email</div>
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
            {savingEmail ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Password</div>
        </div>
        <form className="settings-inline-form" onSubmit={changePassword}>
          <input
            className="os-input-field"
            type="password"
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            minLength={6}
          />
          <button className="os-button os-button-secondary" type="submit" disabled={!newPassword || savingPassword}>
            {savingPassword ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      <RegionSettingsFields onStatus={setStatus} />

      {status && <p className="settings-status os-type-body-small">{status}</p>}
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="settings-section settings-section-wide">
      <div className="settings-list">
        <ToggleRow preferenceKind={ACCOUNT_KEYS.mentions} title="Mentions" defaultOn />
        <ToggleRow preferenceKind={ACCOUNT_KEYS.replies} title="Replies" defaultOn />
        <ToggleRow preferenceKind={ACCOUNT_KEYS.likes} title="Likes" defaultOn />
        <ToggleRow preferenceKind={ACCOUNT_KEYS.achievements} title="Achievements" defaultOn />
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  preferenceKind,
  defaultOn = false,
  resetSignal = 0,
}: {
  title: string;
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
