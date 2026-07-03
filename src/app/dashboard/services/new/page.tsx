'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { useTopbarBack } from '@/components/TopbarContext';
import { UploadField } from '@/components/UploadField';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category } from '@/lib/platform';
import { currencyForCountry, normalizeMarketMode, type MarketMode } from '@/lib/marketPreferences';
import { isMissingColumnError } from '@/lib/schemaCompat';
import { getStudioDisplayName, isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { normalizeTaxonomyValue } from '@/lib/taxonomy';

function buildSlug(title: string) {
  const base = normalizeTaxonomyValue(title) || 'service';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function formatPriceInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, '');
  const [whole = '', decimals = ''] = normalized.split('.');
  return decimals ? `${whole}.${decimals.slice(0, 2)}` : whole;
}

export default function NewServicePage() {
  useTopbarBack({ href: '/dashboard/services', label: 'Services' });
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [creatorName, setCreatorName] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('0.00');
  const [marketMode, setMarketMode] = useState<MarketMode>('global');
  const [localPrice, setLocalPrice] = useState('0.00');
  const [localCurrency, setLocalCurrency] = useState('USD');
  const [availableLocallyOnly, setAvailableLocallyOnly] = useState(false);
  const [deliveryEstimate, setDeliveryEstimate] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, router, user]);

  useEffect(() => {
    async function loadFormData() {
      if (!user) return;

      const [{ data: categoryRows }, profileResult] = await Promise.all([
        supabase.from('categories').select('*').eq('scope', 'services').order('sort_order'),
        loadStudioProfile(user.id),
      ]);

      const resolvedCategories = (categoryRows as Category[] | null) ?? [];
      setCategories(resolvedCategories);
      setCategoryId(resolvedCategories[0]?.id ?? '');
      setProfile(profileResult.profile);
      setCreatorName(getStudioDisplayName(profileResult.profile, user.email));
      setMarketMode(normalizeMarketMode(profileResult.profile?.service_market_mode));
      setLocalCurrency(profileResult.profile?.home_currency || currencyForCountry(profileResult.profile?.home_country_code));
    }

    loadFormData();
  }, [user]);

  const selectedCategory = useMemo(
    () => categories.find(category => category.id === categoryId) ?? null,
    [categories, categoryId],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const cleanTitle = title.trim();
    const cleanShortDescription = shortDescription.trim();
    const cleanLongDescription = longDescription.trim();
    const cleanType = serviceType.trim();

    if (!cleanTitle || !categoryId || !cleanType || !cleanShortDescription || !cleanLongDescription) {
      setError('Please fill out the title, category, type, and both descriptions.');
      return;
    }

    setSaving(true);
    setError('');

    const priceNumber = Number(startingPrice || '0');
    const startingPriceCents = Number.isFinite(priceNumber) ? Math.max(0, Math.round(priceNumber * 100)) : 0;
    const localPriceNumber = Number(localPrice || '0');
    const localPriceCents = Number.isFinite(localPriceNumber) ? Math.max(0, Math.round(localPriceNumber * 100)) : 0;

    const insertPayload = {
      author_id: profile?.id ?? user.id,
      category_id: categoryId,
      slug: buildSlug(cleanTitle),
      title: cleanTitle,
      short_description: cleanShortDescription,
      long_description: cleanLongDescription,
      service_type: cleanType,
      starting_price_cents: startingPriceCents,
      market_mode: marketMode,
      local_price_cents: marketMode === 'global' ? null : localPriceCents,
      local_currency: marketMode === 'global' ? null : localCurrency,
      available_locally_only: availableLocallyOnly,
      delivery_estimate: deliveryEstimate.trim() || null,
      cover_url: coverUrl.trim() || null,
      featured: false,
      status: 'draft',
      feature_description: selectedCategory?.name
        ? `Professional ${cleanType.toLowerCase()} under ${selectedCategory.name}.`
        : null,
    };

    let { error: insertError } = await supabase.from('services').insert(insertPayload);

    if (isMissingColumnError(insertError)) {
      const {
        market_mode: _marketMode,
        local_price_cents: _localPriceCents,
        local_currency: _localCurrency,
        available_locally_only: _availableLocallyOnly,
        ...legacyPayload
      } = insertPayload;
      const retry = await supabase.from('services').insert(legacyPayload);
      insertError = retry.error;
    }

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push('/dashboard/services');
  }

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  return (
    <PageShell>
      <div className="dashboard-editor">
        <header className="dashboard-header">
          <div className="dashboard-header-copy">
            <h1 className="os-type-display">New Service</h1>
            <p className="os-type-body">
              Create a service offering directly from inside the app.
            </p>
          </div>
        </header>

        <GlassPanel className="dashboard-form-panel" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} className="dashboard-form">
            <label className="dashboard-field">
              <div className="dashboard-field-label">Service Title</div>
              <input className="input" value={title} onChange={event => setTitle(event.target.value)} placeholder="Example: Bass Guitar Recording" />
            </label>

            <div className="dashboard-form-grid dashboard-form-grid-2">
              <label className="dashboard-field">
                <div className="dashboard-field-label">Category</div>
                <select className="input" value={categoryId} onChange={event => setCategoryId(event.target.value)}>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>

              <label className="dashboard-field">
                <div className="dashboard-field-label">Type</div>
                <input className="input" value={serviceType} onChange={event => setServiceType(event.target.value)} placeholder="Mixing, Web Design, Strategy…" />
              </label>
            </div>

            <label className="dashboard-field">
              <div className="dashboard-field-label">Short Description</div>
              <textarea className="input" rows={3} value={shortDescription} onChange={event => setShortDescription(event.target.value)} placeholder="Short card copy for this service." />
            </label>

            <label className="dashboard-field">
              <div className="dashboard-field-label">Long Description</div>
              <textarea className="input" rows={5} value={longDescription} onChange={event => setLongDescription(event.target.value)} placeholder="Full service description used on detail pages." />
            </label>

            <div className="dashboard-form-grid dashboard-form-grid-3">
              <label className="dashboard-field">
                <div className="dashboard-field-label">Global Starting Price (USD)</div>
                <input className="input" value={startingPrice} onChange={event => setStartingPrice(formatPriceInput(event.target.value))} placeholder="299.00" />
              </label>

              {marketMode !== 'global' && (
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Local Starting Price ({localCurrency})</div>
                  <input className="input" value={localPrice} onChange={event => setLocalPrice(formatPriceInput(event.target.value))} placeholder="0.00" />
                </label>
              )}

              <label className="dashboard-field">
                <div className="dashboard-field-label">Delivery Estimate</div>
                <input className="input" value={deliveryEstimate} onChange={event => setDeliveryEstimate(event.target.value)} placeholder="3–5 days" />
              </label>

              <label className="dashboard-field">
                <div className="dashboard-field-label">Creator</div>
                <input className="input" value={creatorName} readOnly />
              </label>
            </div>

            <div className="settings-field">
              <div className="settings-field-head">
                <div className="os-type-card-title">Market</div>
                <p className="os-type-body-small">Choose whether this service uses one global USD price or adds a local market price.</p>
              </div>
              <div className="settings-segment" role="group" aria-label="Service market">
                {[
                  { id: 'global', label: 'Global' },
                  { id: 'global_plus_local', label: 'Global + Local' },
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    className={option.id === marketMode ? 'settings-segment-item settings-segment-item-active' : 'settings-segment-item'}
                    onClick={() => setMarketMode(option.id as MarketMode)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <label className="dashboard-field" style={{ marginTop: 14 }}>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={availableLocallyOnly}
                    onChange={event => setAvailableLocallyOnly(event.target.checked)}
                  />
                  <span className="dashboard-field-label">Item available locally only</span>
                </span>
                <p className="dashboard-form-note">You can change your local market in Preferences.</p>
              </label>
            </div>

            <UploadField
              label="Cover Image"
              folder="services/covers"
              userId={user.id}
              value={coverUrl}
              accept="image/*"
              buttonLabel="Upload cover"
              onChange={setCoverUrl}
            />

            {error && <div className="dashboard-status dashboard-status-error">{error}</div>}

            {!isCreatorProfile(profile) && (
              <p className="dashboard-form-note">
                This account is not marked as a creator yet. You can still save drafts, but switch your profile role to creator before publishing publicly.
              </p>
            )}

            <div className="dashboard-form-actions">
              <div className="dashboard-form-actions-left" />
              <div className="dashboard-form-actions-right">
                <Link className="os-button os-button-secondary" href="/dashboard/services">
                  Cancel
                </Link>
                <button className="os-button os-button-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
              </div>
            </div>
          </form>
        </GlassPanel>
      </div>
    </PageShell>
  );
}
