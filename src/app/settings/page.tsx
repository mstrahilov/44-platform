'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { PageShell, HubHero } from '@/components/Ui';
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
  DEFAULT_VIEWER_COUNTRY,
  DEFAULT_VIEWER_CURRENCY,
  currencyForCountry,
  getStoredViewerCountry,
  getStoredViewerCurrency,
  setStoredViewerPreferences,
} from '@/lib/marketPreferences';
import { getLandingPageId, setLandingPageId, type LandingPageId } from '@/lib/landingPage';
import { isMissingColumnError } from '@/lib/schemaCompat';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { getAvailableDockApps } from '@/lib/osApps';
import { setDockAppHidden, setDockMode, useDockPreferences, type DockMode } from '@/lib/dockPreferences';

type SettingsTabId = 'appearance' | 'dock' | 'region' | 'clock' | 'accessibility' | 'advanced';

const TABS: Array<{ id: SettingsTabId; label: string; copy: string }> = [
  { id: 'appearance', label: 'Appearance', copy: 'Theme, accent, typography, and visual comfort for 44OS.' },
  { id: 'dock', label: 'Dock', copy: 'Control Dock layout, visible apps, and where 44OS opens.' },
  { id: 'region', label: 'Region', copy: 'Region, currency, language, and local pricing defaults.' },
  { id: 'clock', label: 'Clock', copy: 'Time display and system clock preferences.' },
  { id: 'accessibility', label: 'Accessibility', copy: 'Motion, contrast, readability, and input preferences.' },
  { id: 'advanced', label: 'Advanced', copy: 'Storage, reset tools, integrations, and future OS-level controls.' },
];

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageShell><div /></PageShell>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const tabs = TABS;
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab') as SettingsTabId | null;
  const initialTab: SettingsTabId = tabs.some(tab => tab.id === requestedTab) ? (requestedTab as SettingsTabId) : tabs[0]?.id ?? 'appearance';
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);

  useEffect(() => {
    if (tabs.some(tab => tab.id === requestedTab)) {
      setActiveTab(requestedTab as SettingsTabId);
      return;
    }
    setActiveTab(tabs[0]?.id ?? 'appearance');
  }, [requestedTab, tabs]);

  useEffect(() => {
    if (!tabs.some(tab => tab.id === activeTab)) {
      Promise.resolve().then(() => setActiveTab(tabs[0]?.id ?? 'appearance'));
    }
  }, [activeTab, tabs]);

  useTopbarTabs(
    tabs.map(tab => ({
      id: tab.id,
      label: tab.label,
      href: tab.id === 'appearance' ? '/settings' : `/settings?tab=${tab.id}`,
      active: tab.id === activeTab,
    })),
  );

  const activeMeta = tabs.find(tab => tab.id === activeTab) ?? tabs[0];

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero title="Settings" copy={activeMeta?.copy} />
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'dock' && <DockSettings />}
        {activeTab === 'region' && <RegionSettings />}
        {activeTab === 'clock' && <ClockSettings />}
        {activeTab === 'accessibility' && <AccessibilitySettings />}
        {activeTab === 'advanced' && <AdvancedSettings />}
      </main>
    </PageShell>
  );
}

function AppearanceSettings() {
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

      <PlaceholderField
        title="Typography"
        desc="Font family, reader font, and interface scale controls will live here."
        items={['System font', 'Reader font', 'Interface density']}
      />

      <PlaceholderField
        title="Wallpaper"
        desc="Environment image and glass intensity controls can be added here later."
        items={['Environment style', 'Glass intensity', 'Noise texture']}
      />
    </div>
  );
}

function RegionSettings() {
  const { user } = useAuth();
  const [countryCode, setCountryCode] = useState(DEFAULT_VIEWER_COUNTRY);
  const [displayCurrency, setDisplayCurrency] = useState(DEFAULT_VIEWER_CURRENCY);
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

      <PlaceholderField
        title="Language"
        desc="Interface language and content translation preferences can live here when localization lands."
        items={['Interface language', 'Content translation', 'Measurement units']}
      />

      {marketStatus && (
        <span className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
          {marketStatus}
        </span>
      )}
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
  const [landingPage, setLandingPage] = useState<LandingPageId>('music');
  const { mode, hiddenIds } = useDockPreferences();

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
  const dockApps = useMemo(
    () => availableApps.filter(app => app.locked || !hiddenIds.includes(app.id)),
    [availableApps, hiddenIds],
  );
  const hideableApps = availableApps.filter(app => !app.locked);
  const landingApps = dockApps.filter(app => app.id !== 'notifications' && app.id !== 'home');

  function chooseLandingPage(id: LandingPageId) {
    setLandingPage(id);
    setLandingPageId(id);
  }

  return (
    <>
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

      <PlaceholderField
        title="Dock Behavior"
        desc="Future controls for sorting, pinning, badges, and app presets will live here."
        items={['Reorder apps', 'Badge visibility', 'Reset Dock preset']}
      />
    </>
  );
}

function ClockSettings() {
  return (
    <div className="settings-section">
      <PlaceholderField
        title="Clock Format"
        desc="Choose how the Dock clock displays time."
        items={['12-hour clock', '24-hour clock', 'Hide clock in full Dock']}
      />

      <PlaceholderField
        title="Time Zone"
        desc="Use your system time zone or choose a fixed 44OS time zone."
        items={['Use device time zone', 'Manual time zone', 'Show secondary time zone']}
      />

      <PlaceholderField
        title="Date Display"
        desc="Optional date and calendar display controls can live here."
        items={['Show date in Dock', 'Calendar week starts on', 'Relative timestamps']}
      />
    </div>
  );
}

function AccessibilitySettings() {
  return (
    <div className="settings-section settings-section-wide">
      <PlaceholderToggle title="Reduce motion" desc="Limit transitions, popovers, and route movement." />
      <PlaceholderToggle title="Increase contrast" desc="Strengthen text, dividers, and control outlines." />
      <PlaceholderToggle title="Larger interface text" desc="Use a larger fixed type scale across 44OS." />
      <PlaceholderToggle title="Keyboard focus mode" desc="Make focus rings and keyboard navigation more prominent." />
    </div>
  );
}

function AdvancedSettings() {
  return (
    <div className="settings-section">
      <PlaceholderField
        title="Storage"
        desc="Downloaded files, cached artwork, and offline data controls can live here."
        items={['Clear cache', 'Offline storage', 'Download location']}
      />

      <PlaceholderField
        title="System Reset"
        desc="Reset local OS preferences without touching your account data."
        items={['Reset theme', 'Reset Dock', 'Reset all local preferences']}
      />

      <PlaceholderField
        title="Integrations"
        desc="Future desktop wrapper, deep links, and connected app controls can live here."
        items={['Desktop app links', 'Protocol handlers', 'Connected services']}
      />
    </div>
  );
}

function PlaceholderField({ title, desc, items }: { title: string; desc: string; items: string[] }) {
  return (
    <div className="settings-field">
      <div className="settings-field-head">
        <div className="os-type-field-title">{title}</div>
        <p className="os-type-body-small">{desc}</p>
      </div>
      <div className="settings-segment" role="group" aria-label={title}>
        {items.map(item => (
          <button key={item} className="settings-segment-item" type="button" disabled>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlaceholderToggle({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="settings-row">
      <div className="settings-row-copy">
        <div className="os-type-card-title">{title}</div>
        <p className="os-type-body-small">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={false}
        aria-label={title}
        className="settings-toggle"
        disabled
      />
    </div>
  );
}
