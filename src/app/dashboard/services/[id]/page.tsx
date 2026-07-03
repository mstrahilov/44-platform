'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageShell, HubHero } from '@/components/Ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTopbarBack } from '@/components/TopbarContext';
import { UploadField } from '@/components/UploadField';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category } from '@/lib/platform';
import { currencyForCountry, normalizeMarketMode, type MarketMode } from '@/lib/marketPreferences';
import { isMissingColumnError } from '@/lib/schemaCompat';
import { getStudioDisplayName, loadStudioProfile } from '@/lib/studioProfiles';

function formatPriceInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, '');
  const [whole = '', decimals = ''] = normalized.split('.');
  return decimals ? `${whole}.${decimals.slice(0, 2)}` : whole;
}

export default function EditServicePage() {
  useTopbarBack({ href: '/dashboard/services', label: 'Services' });
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
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
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [{ data: categoryRows }, profileResult] = await Promise.all([
        supabase.from('categories').select('*').eq('scope', 'services').order('sort_order'),
        loadStudioProfile(user.id),
      ]);

      setCategories((categoryRows as Category[] | null) ?? []);
      setCreatorName(getStudioDisplayName(profileResult.profile, user.email));
      const profileId = profileResult.profile?.id ?? user.id;
      const fallbackLocalCurrency = profileResult.profile?.home_currency || currencyForCountry(profileResult.profile?.home_country_code);
      const { data: ownedService } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .eq('author_id', profileId)
        .maybeSingle();
      if (!ownedService) {
        setError('Service not found.');
        setFetching(false);
        return;
      }

      setTitle(ownedService.title ?? '');
      setCategoryId(ownedService.category_id ?? '');
      setServiceType(ownedService.service_type ?? '');
      setShortDescription(ownedService.short_description ?? '');
      setLongDescription(ownedService.long_description ?? '');
      setStartingPrice(((ownedService.starting_price_cents ?? 0) / 100).toFixed(2));
      setMarketMode(normalizeMarketMode(ownedService.market_mode || profileResult.profile?.service_market_mode));
      setLocalPrice(((ownedService.local_price_cents ?? 0) / 100).toFixed(2));
      setLocalCurrency(ownedService.local_currency || fallbackLocalCurrency);
      setAvailableLocallyOnly(Boolean(ownedService.available_locally_only));
      setDeliveryEstimate(ownedService.delivery_estimate ?? '');
      setCoverUrl(ownedService.cover_url ?? '');
      setFetching(false);
    }

    loadData();
  }, [id, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');
    const profileResult = await loadStudioProfile(user.id);
    const profileId = profileResult.profile?.id ?? user.id;
    const priceNumber = Number(startingPrice || '0');
    const startingPriceCents = Number.isFinite(priceNumber) ? Math.max(0, Math.round(priceNumber * 100)) : 0;
    const localPriceNumber = Number(localPrice || '0');
    const localPriceCents = Number.isFinite(localPriceNumber) ? Math.max(0, Math.round(localPriceNumber * 100)) : 0;

    const updatePayload = {
      title: title.trim(),
      category_id: categoryId,
      service_type: serviceType.trim(),
      short_description: shortDescription.trim(),
      long_description: longDescription.trim(),
      starting_price_cents: startingPriceCents,
      market_mode: marketMode,
      local_price_cents: marketMode === 'global' ? null : localPriceCents,
      local_currency: marketMode === 'global' ? null : localCurrency,
      available_locally_only: availableLocallyOnly,
      delivery_estimate: deliveryEstimate.trim() || null,
      cover_url: coverUrl.trim() || null,
    };

    let { error: updateError } = await supabase
      .from('services')
      .update(updatePayload)
      .eq('id', id)
      .eq('author_id', profileId);

    if (isMissingColumnError(updateError)) {
      const {
        market_mode: _marketMode,
        local_price_cents: _localPriceCents,
        local_currency: _localCurrency,
        available_locally_only: _availableLocallyOnly,
        ...legacyPayload
      } = updatePayload;
      const retry = await supabase
        .from('services')
        .update(legacyPayload)
        .eq('id', id)
        .eq('author_id', profileId);
      updateError = retry.error;
    }

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess('Changes saved.');
    router.push('/dashboard/services');
  }

  if (loading || !user || fetching) return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;

  async function handleDelete() {
    if (!user) return;
    setDeleting(true);
    setError('');
    setSuccess('');

    const profileResult = await loadStudioProfile(user.id);
    const profileId = profileResult.profile?.id ?? user.id;

    const { error: deleteError } = await supabase
      .from('services')
      .delete()
      .eq('id', id)
      .eq('author_id', profileId);

    if (deleteError) {
      setDeleting(false);
      setError(deleteError.message);
      return;
    }

    setDeleting(false);
    router.push('/dashboard/services');
  }

  return (
    <PageShell>
      <div className="dashboard-editor">
        <HubHero title="Edit Service" copy="Update the service details stored in 44." />
        <div className="dashboard-section">
          <form onSubmit={handleSubmit} className="dashboard-form">
            <label className="dashboard-field"><div className="dashboard-field-label">Service Title</div><input className="os-input-field" value={title} onChange={e => setTitle(e.target.value)} /></label>
            <div className="dashboard-form-grid dashboard-form-grid-2">
              <label className="dashboard-field"><div className="dashboard-field-label">Category</div><select className="os-input-field" value={categoryId} onChange={e => setCategoryId(e.target.value)}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="dashboard-field"><div className="dashboard-field-label">Type</div><input className="os-input-field" value={serviceType} onChange={e => setServiceType(e.target.value)} /></label>
            </div>
            <label className="dashboard-field"><div className="dashboard-field-label">Short Description</div><textarea className="os-input-textarea" rows={3} value={shortDescription} onChange={e => setShortDescription(e.target.value)} /></label>
            <label className="dashboard-field"><div className="dashboard-field-label">Long Description</div><textarea className="os-input-textarea" rows={5} value={longDescription} onChange={e => setLongDescription(e.target.value)} /></label>
            <div className="dashboard-form-grid dashboard-form-grid-3">
              <label className="dashboard-field"><div className="dashboard-field-label">Starting Price (USD)</div><input className="os-input-field" value={startingPrice} onChange={e => setStartingPrice(formatPriceInput(e.target.value))} /></label>
              {marketMode !== 'global' && (
                <label className="dashboard-field"><div className="dashboard-field-label">Local Starting Price ({localCurrency})</div><input className="os-input-field" value={localPrice} onChange={e => setLocalPrice(formatPriceInput(e.target.value))} /></label>
              )}
              <label className="dashboard-field"><div className="dashboard-field-label">Delivery Estimate</div><input className="os-input-field" value={deliveryEstimate} onChange={e => setDeliveryEstimate(e.target.value)} /></label>
              <label className="dashboard-field"><div className="dashboard-field-label">Creator</div><input className="os-input-field" value={creatorName} readOnly /></label>
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
            {success && <div className="dashboard-status dashboard-status-success">{success}</div>}
            <div className="dashboard-form-actions">
              <div className="dashboard-form-actions-left">
                <button className="os-button os-button-danger" type="button" onClick={() => setShowDeleteConfirm(true)}>Delete Service</button>
              </div>
              <div className="dashboard-form-actions-right">
                <Link className="os-button os-button-secondary" href="/dashboard/services">Cancel</Link>
                <button className="os-button os-button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          </form>
        </div>
        <ConfirmDialog
          open={showDeleteConfirm}
          title="Delete Service"
          description="Delete this service? This will permanently remove it from 44."
          confirmLabel="Delete Service"
          destructive
          busy={deleting}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={async () => {
            setShowDeleteConfirm(false);
            await handleDelete();
          }}
        />
      </div>
    </PageShell>
  );
}
