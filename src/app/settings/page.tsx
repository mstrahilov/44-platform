'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { PageShell, HubHero, EmptyMessage, SectionHeader } from '@/components/Ui';
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
      <DockSettings />
    </div>
  );
}

function ThemeSettings() {
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

  return (
    <>
      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Theme</div>
          <p className="os-type-body-small">Choose the system color mode.</p>
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
          <p className="os-type-body-small">Set the active system accent color.</p>
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
    onStatus('');

    if (!user) {
      onStatus('Saved on this device.');
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
      onStatus('Saved on this device.');
      return;
    }

    onStatus(error ? error.message : 'System preferences saved.');
  }

  return (
    <>
      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Region</div>
          <p className="os-type-body-small">Set your local market.</p>
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
          <p className="os-type-body-small">Choose prices shown across Store.</p>
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
    <>
      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Landing App</div>
          <p className="os-type-body-small">Choose where 44OS opens.</p>
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
          <p className="os-type-body-small">Set the Dock display density.</p>
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
    </>
  );
}

function AccountSettings() {
  const { user } = useAuth();
  const [sendingReset, setSendingReset] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
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

  async function sendPasswordReset() {
    if (!user?.email || sendingReset) return;
    setSendingReset(true);
    setStatus('');
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: getSitePathUrl('/settings'),
    });
    setSendingReset(false);
    setStatus(error ? error.message : 'Password reset email sent.');
  }

  return (
    <div className="settings-section settings-section-wide settings-two-column">
      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Email</div>
          <p className="os-type-body-small">Your login and recovery email.</p>
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
          <p className="os-type-body-small">Send a secure reset link to your email.</p>
        </div>
        <div className="settings-inline-form">
          <button className="os-button os-button-secondary" type="button" onClick={sendPasswordReset} disabled={!user?.email || sendingReset}>
            {sendingReset ? 'Sending...' : 'Send Reset Link'}
          </button>
        </div>
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
