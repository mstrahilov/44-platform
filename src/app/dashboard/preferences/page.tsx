'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { useDashboardTabs } from '@/lib/dashboardTabs';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import {
  COUNTRIES,
  getStoredCreatorPreferences,
  setStoredCreatorPreferences,
  DEFAULT_CREATOR_COUNTRY,
  DEFAULT_MARKET_MODE,
  currencyForCountry,
  normalizeMarketMode,
  type MarketMode,
} from '@/lib/marketPreferences';
import { isMissingColumnError } from '@/lib/schemaCompat';

type PreferenceState = {
  homeCountryCode: string;
  serviceMarket: MarketMode;
  productMarket: MarketMode;
};

const defaultPreferences: PreferenceState = {
  homeCountryCode: DEFAULT_CREATOR_COUNTRY,
  serviceMarket: DEFAULT_MARKET_MODE,
  productMarket: DEFAULT_MARKET_MODE,
};

export default function DashboardPreferencesPage() {
  useDashboardTabs('preferences');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [preferences, setPreferences] = useState<PreferenceState>(defaultPreferences);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    loadStudioProfile(user.id).then(result => {
      setProfile(result.profile);
      const stored = getStoredCreatorPreferences();
      const nextCountry = result.profile?.home_country_code || stored?.homeCountryCode || DEFAULT_CREATOR_COUNTRY;
      setPreferences({
        homeCountryCode: nextCountry,
        serviceMarket: normalizeMarketMode(result.profile?.service_market_mode || stored?.serviceMarket),
        productMarket: normalizeMarketMode(result.profile?.product_market_mode || stored?.productMarket),
      });
    });
  }, [user]);

  function updatePreferences(patch: Partial<PreferenceState>) {
    setSaved(false);
    setError('');
    setPreferences(current => ({ ...current, ...patch }));
  }

  async function savePreferences() {
    if (!user) return;
    setError('');
    setStoredCreatorPreferences({
      ...preferences,
      homeCurrency: currencyForCountry(preferences.homeCountryCode),
    });
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        home_country_code: preferences.homeCountryCode,
        home_currency: currencyForCountry(preferences.homeCountryCode),
        product_market_mode: preferences.productMarket,
        service_market_mode: preferences.serviceMarket,
      })
      .eq('id', user.id);

    if (updateError) {
      if (isMissingColumnError(updateError)) {
        setSaved(true);
        setError('');
        return;
      }
      setError(updateError.message);
      return;
    }

    setSaved(true);
  }

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  if (profile && !isCreatorProfile(profile)) {
    return (
      <PageShell>
        <div className="dashboard-page">
          <GlassPanel style={{ padding: 40 }}>
            <h1 className="os-type-panel-title" style={{ marginBottom: 8 }}>Creator Access Required</h1>
            <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginBottom: 18 }}>
              Dashboard preferences are for creator accounts.
            </p>
            <Link href="/profile" className="os-button os-button-primary">Open Public Profile</Link>
          </GlassPanel>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div className="dashboard-header-copy">
            <h1 className="os-type-display">Preferences</h1>
            <p className="os-type-body">
              Shape how new products and services inherit global USD pricing and optional local market pricing.
            </p>
          </div>
        </header>

        <section className="dashboard-section">
          <div className="dashboard-header-copy">
            <h2 className="os-type-panel-content">Market Defaults</h2>
            <p className="os-type-body-small">
              These controls establish creator-level defaults for new products and services.
            </p>
          </div>

          <GlassPanel className="dashboard-form-panel" style={{ padding: 32 }}>
            <div className="dashboard-form">
              <div className="dashboard-form-grid dashboard-form-grid-2">
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Local Market</div>
                  <select
                    className="input"
                    value={preferences.homeCountryCode}
                    onChange={event => updatePreferences({ homeCountryCode: event.target.value })}
                  >
                    {COUNTRIES.map(country => (
                      <option key={country.code} value={country.code}>{country.name}</option>
                    ))}
                  </select>
                  <p className="dashboard-form-note">Local currency is derived automatically: {currencyForCountry(preferences.homeCountryCode)}.</p>
                </label>
              </div>

              <PreferenceSegment
                title="Services"
                description="Choose whether new services start with one global USD price or add a local market price."
                value={preferences.serviceMarket}
                onChange={value => updatePreferences({ serviceMarket: value })}
              />

              <PreferenceSegment
                title="Products"
                description="Choose whether new products start with one global USD price or add a local market price."
                value={preferences.productMarket}
                onChange={value => updatePreferences({ productMarket: value })}
              />

              {saved && <div className="dashboard-status dashboard-status-success">Preferences saved.</div>}
              {error && <div className="dashboard-status dashboard-status-error">{error}</div>}

              <div className="dashboard-form-actions">
                <div className="dashboard-form-actions-left" />
                <div className="dashboard-form-actions-right">
                  <button className="os-button os-button-secondary" type="button" onClick={() => setPreferences(defaultPreferences)}>
                    Reset
                  </button>
                  <button className="os-button os-button-primary" type="button" onClick={() => void savePreferences()}>
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          </GlassPanel>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-header-copy">
            <h2 className="os-type-panel-content">Pricing Model Preview</h2>
            <p className="os-type-body-small">
              This is how product and service forms behave when local and global pricing are enabled.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18 }}>
            <GlassPanel style={{ padding: 24 }}>
              <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)', textTransform: 'uppercase' }}>Universal Price</div>
              <div className="os-type-panel-content" style={{ marginTop: 10 }}>USD stays the global anchor.</div>
              <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)', marginTop: 8 }}>
                Buyers outside a creator's local market see the universal catalog price.
              </p>
            </GlassPanel>
            <GlassPanel style={{ padding: 24 }}>
              <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)', textTransform: 'uppercase' }}>Local Price</div>
              <div className="os-type-panel-content" style={{ marginTop: 10 }}>{currencyForCountry(preferences.homeCountryCode)} follows Local Market.</div>
              <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)', marginTop: 8 }}>
                Local buyers can receive a creator-defined regional price instead of a converted USD price.
              </p>
            </GlassPanel>
            <GlassPanel style={{ padding: 24 }}>
              <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)', textTransform: 'uppercase' }}>Buyer View</div>
              <div className="os-type-panel-content" style={{ marginTop: 10 }}>Pricing follows market context.</div>
              <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)', marginTop: 8 }}>
                44 can show local pricing where enabled and global pricing everywhere else.
              </p>
            </GlassPanel>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function PreferenceSegment({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: MarketMode;
  onChange: (value: MarketMode) => void;
}) {
  const options: Array<{ id: MarketMode; label: string }> = [
    { id: 'global', label: 'Global' },
    { id: 'global_plus_local', label: 'Global + Local' },
  ];

  return (
    <div className="settings-field">
      <div className="settings-field-head">
        <div className="os-type-card-title">{title}</div>
        <p className="os-type-body-small">{description}</p>
      </div>
      <div className="settings-segment" role="group" aria-label={`${title} market`}>
        {options.map(option => (
          <button
            key={option.id}
            type="button"
            className={option.id === value ? 'settings-segment-item settings-segment-item-active' : 'settings-segment-item'}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
