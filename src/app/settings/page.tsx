'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { getThemePreference, saveThemePreference } from '@/lib/domain/preferences';
import { getProfileMarketPreferences, saveProfileMarketPreferences } from '@/lib/domain/profiles';
import { PageShell, HubHero, EmptyMessage, SectionHeader } from '@/components/Ui';
import { Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';
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
  getStoredViewerCountry,
  setStoredViewerPreferences,
} from '@/lib/marketPreferences';
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
  if (value === 'dock') return 'appearance';
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
    return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Settings" />
          <EmptyMessage>Log in to manage your 44OS settings.</EmptyMessage>
          <div className="ui44-centered-action">
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
    <div className="settings-section settings-section-wide settings-two-column ui44-form-grid">
      <ThemeSettings />
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
        <Ui44SelectInput value={mode} onChange={event => chooseMode(event.target.value as ThemeMode)} aria-label="Theme mode">
          {MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </Ui44SelectInput>
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
              className={a.id === accent ? 'settings-swatch settings-swatch-active ui44-swatch ui44-swatch-active' : 'settings-swatch ui44-swatch'}
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

  useEffect(() => {
    Promise.resolve().then(() => setCountryCode(getStoredViewerCountry()));
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
      setCountryCode(nextCountry);
      setStoredViewerPreferences(nextCountry);
    }

    loadSystemPreferences();
  }, [user]);

  async function saveMarketPreferences(nextCountry: string) {
    setCountryCode(nextCountry);
    setStoredViewerPreferences(nextCountry);
    onStatus('');

    if (!user) {
      onStatus('Saved on this device.');
      return;
    }

    let error: unknown = null;
    try { await saveProfileMarketPreferences(user.id, nextCountry); } catch (saveError) { error = saveError; }

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
          <div className="os-type-field-title">Country</div>
        </div>
        <Ui44SelectInput
          value={countryCode}
          onChange={event => {
            void saveMarketPreferences(event.target.value);
          }}
        >
          {COUNTRIES.map(country => (
            <option key={country.code} value={country.code}>{country.name}</option>
          ))}
        </Ui44SelectInput>
        <span className="dashboard-form-note">Your country automatically sets the currency used to display converted prices.</span>
      </div>
    </>
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
    if (newPassword.length < 8) {
      setStatus('Use at least 8 characters for your new password.');
      return;
    }
    setSavingPassword(true);
    setStatus('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (!error) setNewPassword('');
    setStatus(error ? error.message : 'Password saved.');
  }

  return (
    <div className="settings-section settings-section-wide settings-two-column ui44-form-grid">
      <div className="settings-field">
        <div className="settings-field-head">
          <div className="os-type-field-title">Email</div>
        </div>
        <form className="settings-inline-form" onSubmit={changeEmail}>
          <Ui44TextInput
            className="os-input-field"
            type="email"
            value={newEmail}
            onChange={event => setNewEmail(event.target.value)}
            placeholder="Enter new email"
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
          <Ui44TextInput
            className="os-input-field"
            type="password"
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            placeholder="Enter new password"
            autoComplete="new-password"
            minLength={8}
          />
          <button className="os-button os-button-secondary" type="submit" disabled={!newPassword || savingPassword}>
            {savingPassword ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      <RegionSettingsFields onStatus={setStatus} />

      {status && <p className="settings-status os-type-body-small ui44-status" role="status" aria-live="polite">{status}</p>}
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="settings-section settings-section-wide">
      <div className="settings-list ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        <ToggleRow preferenceKind={ACCOUNT_KEYS.mentions} title="Mentions" defaultOn />
        <ToggleRow preferenceKind={ACCOUNT_KEYS.replies} title="Replies" defaultOn />
        <ToggleRow preferenceKind={ACCOUNT_KEYS.likes} title="Likes" defaultOn />
        <ToggleRow preferenceKind={ACCOUNT_KEYS.achievements} title="Achievements" defaultOn />
        <NewsletterConsentRow />
      </div>
    </div>
  );
}

function NewsletterConsentRow() {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void (async () => {
      try {
        const result = await supabase.from('newsletter_consents' as never).select('status').eq('user_id', user.id).maybeSingle();
        if (!alive) return;
        const row = result.data as unknown as { status?: string } | null;
        setSubscribed(row?.status === 'subscribed');
      } catch {
        // Consent defaults off when the unapplied schema or network is unavailable.
      }
    })();
    return () => { alive = false; };
  }, [user]);

  async function toggle() {
    if (!user || saving) return;
    setSaving(true);
    setStatus('');
    const next = !subscribed;
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) {
      setSaving(false);
      setStatus('Sign in again to change newsletter consent.');
      return;
    }
    const response = await fetch('/api/email/newsletter', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscribed: next }),
    });
    setSaving(false);
    if (!response.ok) {
      setStatus('Newsletter preference could not be saved.');
      return;
    }
    setSubscribed(next);
    setStatus(next ? 'Subscribed to consent-based 44OS News.' : 'Unsubscribed from 44OS News.');
  }

  return (
    <div className="settings-row ui44-list-row ui44-list-row-settings">
      <div className="settings-row-copy">
        <div className="os-type-card-title">44OS News</div>
        <div className="os-type-body-small">Optional release and newsletter email. Account and purchase email do not opt you in.</div>
        {status && <div className="os-type-body-small" role="status" aria-live="polite">{status}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={subscribed}
        aria-label="44OS News newsletter consent"
        disabled={saving}
        className={subscribed ? 'settings-toggle settings-toggle-on ui44-switch ui44-switch-on' : 'settings-toggle ui44-switch'}
        onClick={() => void toggle()}
      />
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
    <div className="settings-row ui44-list-row ui44-list-row-settings">
      <div className="settings-row-copy">
        <div className="os-type-card-title">{title}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        className={on ? 'settings-toggle settings-toggle-on ui44-switch ui44-switch-on' : 'settings-toggle ui44-switch'}
        onClick={toggle}
      />
    </div>
  );
}
