'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageShell, GlassPanel, HubHero } from '@/components/Ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTopbarBack } from '@/components/TopbarContext';
import { UploadField } from '@/components/UploadField';
import {
  DashboardReleaseFeatures,
  createReleaseFeatureState,
  featureAssetTypes,
  hydrateReleaseFeatureState,
  normalizeFeatureStateForSection,
  saveReleaseFeatures,
  validateReleaseFeatureState,
  type SavedProductAchievement,
} from '@/components/DashboardReleaseFeatures';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category, Track } from '@/lib/platform';
import type { Product } from '@/lib/products';
import { currencyForCountry, normalizeMarketMode, type MarketMode } from '@/lib/marketPreferences';
import { isMissingColumnError } from '@/lib/schemaCompat';
import { getStudioDisplayName, loadStudioProfile } from '@/lib/studioProfiles';
import { getDashboardCatalogSectionForProduct, type DashboardCatalogSectionId } from '@/lib/dashboardCatalog';

function formatPriceInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (!digits) return '';

  const cents = digits.padStart(3, '0');
  const whole = cents.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
  const decimals = cents.slice(-2);
  return `${whole}.${decimals}`;
}

function currencySymbol(currency: string) {
  const symbol = new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
    .formatToParts(0)
    .find(part => part.type === 'currency')?.value;
  return symbol ?? currency;
}

type DraftTrack = {
  id?: string;
  title: string;
  durationSeconds: string;
  audioUrl: string;
};

function createDraftTrack(): DraftTrack {
  return {
    title: '',
    durationSeconds: '',
    audioUrl: '',
  };
}

function ensureTrackCount(current: DraftTrack[], nextCount: number) {
  const clamped = Math.max(0, Math.min(30, nextCount));
  if (current.length === clamped) return current;
  if (current.length > clamped) return current.slice(0, clamped);

  return [...current, ...Array.from({ length: clamped - current.length }, createDraftTrack)];
}

function runtimeTypeForSection(sectionId: DashboardCatalogSectionId) {
  if (sectionId === 'merch') return 'merch';
  if (sectionId === 'books') return 'book';
  if (sectionId === 'assets') return 'sample_pack';
  return 'music';
}

function experienceTypeForSection(sectionId: DashboardCatalogSectionId) {
  if (sectionId === 'merch') return 'merch';
  if (sectionId === 'books') return 'book';
  if (sectionId === 'assets') return 'asset';
  return 'music';
}

function productAssetTypeForSection(sectionId: DashboardCatalogSectionId) {
  if (sectionId === 'merch') return 'merch';
  if (sectionId === 'books') return 'book';
  if (sectionId === 'assets') return 'sample_pack';
  return 'music';
}

type ProductAssetRow = {
  title: string | null;
  file_url: string | null;
  asset_type: string | null;
};

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [creatorName, setCreatorName] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productType, setProductType] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [marketMode, setMarketMode] = useState<MarketMode>('global');
  const [localPrice, setLocalPrice] = useState('');
  const [localCurrency, setLocalCurrency] = useState('USD');
  const [merchFulfillmentMode, setMerchFulfillmentMode] = useState<'ship' | 'deliver'>('deliver');
  const [merchShippingScope, setMerchShippingScope] = useState<'local' | 'global'>('local');
  const [coverUrl, setCoverUrl] = useState('');
  const [itemFileUrl, setItemFileUrl] = useState('');
  const [year, setYear] = useState('');
  const [trackCount, setTrackCount] = useState('1');
  const [tracks, setTracks] = useState<DraftTrack[]>([createDraftTrack()]);
  const [featureState, setFeatureState] = useState(() => createReleaseFeatureState('music'));
  const [hasSavedFeatures, setHasSavedFeatures] = useState(false);
  const [ownerId, setOwnerId] = useState('');
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
        supabase.from('categories').select('*').eq('scope', 'products').order('sort_order'),
        loadStudioProfile(user.id),
      ]);

      setCategories((categoryRows as Category[] | null) ?? []);
      setCreatorName(getStudioDisplayName(profileResult.profile, user.email));
      const profileId = profileResult.profile?.id ?? user.id;
      const fallbackLocalCurrency =
        profileResult.profile?.display_currency ||
        currencyForCountry(profileResult.profile?.country_code) ||
        profileResult.profile?.home_currency ||
        currencyForCountry(profileResult.profile?.home_country_code);
      setOwnerId(profileId);

      const { data: productRow } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('author_id', profileId)
        .maybeSingle();

      const product = (productRow as Product | null) ?? null;
      if (!product) {
        setError('Item not found.');
        setFetching(false);
        return;
      }

      const [{ data: trackRows }, { data: assetRows }, { data: achievementRows }] = await Promise.all([
        supabase.from('tracks').select('*').eq('product_id', id).order('number'),
        supabase.from('product_assets').select('asset_type,title,file_url').eq('product_id', id).order('sort_order'),
        supabase
          .from('product_achievements')
          .select('code,title,description,trigger_type,reward_config,is_secret')
          .eq('product_id', id)
          .order('sort_order'),
      ]);

      const productSection = getDashboardCatalogSectionForProduct(product);
      const featureAssets = ((assetRows as ProductAssetRow[] | null) ?? []).filter(asset => featureAssetTypes().includes(asset.asset_type ?? ''));

      setTitle(product.title ?? '');
      setCategoryId(product.category_id ?? '');
      setProductType(product.product_type ?? '');
      setDescription(product.long_description || product.short_description || '');
      setPrice(product.price_cents ? (product.price_cents / 100).toFixed(2) : '');
      setMarketMode(normalizeMarketMode(product.market_mode));
      setLocalPrice(product.local_price_cents ? (product.local_price_cents / 100).toFixed(2) : '');
      setLocalCurrency(product.local_currency || fallbackLocalCurrency);
      setMerchFulfillmentMode((product as Product & { merch_fulfillment_mode?: 'ship' | 'deliver' | null }).merch_fulfillment_mode || (product.available_locally_only ? 'deliver' : 'ship'));
      setMerchShippingScope((product as Product & { merch_shipping_scope?: 'local' | 'global' | null }).merch_shipping_scope || (product.available_locally_only ? 'local' : 'global'));
      setCoverUrl(product.cover_url ?? '');
      setItemFileUrl(product.read_url || product.download_url || ((assetRows as ProductAssetRow[] | null) ?? []).find(asset => !featureAssetTypes().includes(asset.asset_type ?? ''))?.file_url || '');
      setYear(product.year ? String(product.year) : '');
      setFeatureState(hydrateReleaseFeatureState(
        productSection.id,
        ((achievementRows as Array<{
          code: string;
          title: string;
          description: string | null;
          trigger_type: string;
          reward_config: Record<string, unknown> | null;
          is_secret: boolean | null;
        }> | null) ?? []).map(achievement => ({
          code: achievement.code,
          title: achievement.title,
          description: achievement.description ?? '',
          triggerType: achievement.trigger_type,
          reward_config: achievement.reward_config,
          is_secret: achievement.is_secret,
          hidden: achievement.is_secret ?? false,
          enabled: true,
        })) satisfies SavedProductAchievement[],
        featureAssets,
      ));
      setHasSavedFeatures(Boolean(((achievementRows as unknown[] | null) ?? []).length || featureAssets.length));

      const resolvedTracks = ((trackRows as Track[] | null) ?? []).map(track => ({
        id: track.id,
        title: track.title ?? '',
        durationSeconds: track.duration_seconds ? String(track.duration_seconds) : '',
        audioUrl: track.audio_url ?? '',
      }));
      const nextTracks = resolvedTracks.length ? resolvedTracks : [createDraftTrack()];
      setTracks(nextTracks);
      setTrackCount(String(Math.min(30, nextTracks.length)));
      setFetching(false);
    }

    loadData();
  }, [id, user]);

  const selectedCategory = useMemo(
    () => categories.find(category => category.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const section = useMemo(
    () => getDashboardCatalogSectionForProduct({
      category: selectedCategory?.name ?? '',
      product_type: productType,
      runtime_type: null,
      experience_type: null,
      fulfillment_type: null,
    }),
    [productType, selectedCategory],
  );
  const deleteLabel = `Delete ${section.itemLabel.replace(/\b\w/g, char => char.toUpperCase())}`;
  const isMusicProduct = section.id === 'music';
  const isMerchProduct = section.id === 'merch';
  const needsDigitalFile = section.id === 'books' || section.id === 'assets';
  const merchUsesLocalOnlyPricing = isMerchProduct && (merchFulfillmentMode === 'deliver' || merchShippingScope === 'local');
  const typeOptions = section.typeOptions.includes(productType) || !productType
    ? section.typeOptions
    : [productType, ...section.typeOptions];

  useTopbarBack({ href: section.href, label: section.label });

  useEffect(() => {
    if (!isMusicProduct) return;
    setTracks(current => ensureTrackCount(current, Number(trackCount || '0')));
  }, [isMusicProduct, trackCount]);

  useEffect(() => {
    setFeatureState(current => normalizeFeatureStateForSection(current, section.id));
  }, [section.id]);

  function updateTrack(index: number, patch: Partial<DraftTrack>) {
    setTracks(current => current.map((track, trackIndex) => (trackIndex === index ? { ...track, ...patch } : track)));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const profileResult = ownerId ? null : await loadStudioProfile(user.id);
    const profileId = ownerId || profileResult?.profile?.id || user.id;

    const cleanTitle = title.trim();
    const visibleTracks = tracks.slice(0, Number(trackCount || '0')).map((track, index, list) => ({
      ...track,
      title: track.title.trim() || (list.length === 1 ? cleanTitle : ''),
    }));
    if (isMusicProduct) {
      const hasInvalidTrack = visibleTracks.some(track => !track.title.trim() || !track.audioUrl.trim());
      if (!visibleTracks.length || hasInvalidTrack) {
        setError('Music releases need track titles and uploaded audio for each track.');
        return;
      }
    }
    if (needsDigitalFile && !itemFileUrl.trim()) {
      setError(section.id === 'books' ? 'Books need an uploaded file before saving.' : 'Sample packs need an uploaded file before saving.');
      return;
    }
    const featureValidationError = validateReleaseFeatureState(featureState, section.id);
    if (featureValidationError) {
      setError(featureValidationError);
      return;
    }
    if (hasSavedFeatures && typeof window !== 'undefined') {
      const confirmed = window.confirm('Changing release features can affect users who already own this item. Continue?');
      if (!confirmed) return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const priceNumber = Number(price || '0');
    const isFree = !Number.isFinite(priceNumber) || priceNumber <= 0;
    const priceCents = isFree ? 0 : Math.round(priceNumber * 100);
    const localPriceNumber = Number(localPrice || '0');
    const localPriceCents = localPrice.trim() && Number.isFinite(localPriceNumber) ? Math.max(0, Math.round(localPriceNumber * 100)) : null;

    const updatePayload = {
      title: title.trim(),
      category_id: categoryId,
      category: selectedCategory?.name ?? section.label,
      product_type: productType.trim(),
      short_description: null,
      long_description: description.trim(),
      price_cents: merchUsesLocalOnlyPricing ? 0 : priceCents,
      market_mode: isMerchProduct ? (merchUsesLocalOnlyPricing ? 'global_plus_local' : marketMode) : marketMode,
      local_price_cents: isMerchProduct ? (localPriceCents ?? priceCents) : (marketMode === 'global' ? null : localPriceCents),
      local_currency: isMerchProduct ? localCurrency : (marketMode === 'global' ? null : localCurrency),
      available_locally_only: isMerchProduct ? merchUsesLocalOnlyPricing : false,
      is_free: isFree,
      cover_url: coverUrl.trim() || null,
      runtime_type: runtimeTypeForSection(section.id),
      experience_type: experienceTypeForSection(section.id),
      fulfillment_type: isMerchProduct ? 'physical' : 'digital',
      merch_fulfillment_mode: isMerchProduct ? merchFulfillmentMode : null,
      merch_shipping_scope: isMerchProduct ? (merchFulfillmentMode === 'deliver' ? 'local' : merchShippingScope) : null,
      read_url: section.id === 'books' ? itemFileUrl.trim() : null,
      download_url: needsDigitalFile ? itemFileUrl.trim() : null,
      year: year ? Number(year) : null,
      creator: creatorName,
    };

    let { error: updateError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .eq('author_id', profileId);

    if (isMissingColumnError(updateError)) {
      const {
        market_mode: _marketMode,
        local_price_cents: _localPriceCents,
        local_currency: _localCurrency,
        available_locally_only: _availableLocallyOnly,
        experience_type: _experienceType,
        fulfillment_type: _fulfillmentType,
        merch_fulfillment_mode: _merchFulfillmentMode,
        merch_shipping_scope: _merchShippingScope,
        ...legacyPayload
      } = updatePayload;
      const retry = await supabase
        .from('products')
        .update(legacyPayload)
        .eq('id', id)
        .eq('author_id', profileId);
      updateError = retry.error;
    }

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    if (isMusicProduct) {
      const existingIds = tracks.map(track => track.id).filter(Boolean) as string[];
      const keptIds = visibleTracks.map(track => track.id).filter(Boolean) as string[];
      const idsToDelete = existingIds.filter(existingId => !keptIds.includes(existingId));

      for (const [index, track] of visibleTracks.entries()) {
        const payload = {
          product_id: id,
          number: index + 1,
          title: track.title.trim(),
          duration_seconds: track.durationSeconds ? Number(track.durationSeconds) : null,
          audio_url: track.audioUrl.trim(),
          download_url: null,
        };

        if (track.id) {
          const { error: trackUpdateError } = await supabase.from('tracks').update(payload).eq('id', track.id).eq('product_id', id);
          if (trackUpdateError) {
            setSaving(false);
            setError(trackUpdateError.message);
            return;
          }
        } else {
          const { error: trackInsertError } = await supabase.from('tracks').insert(payload);
          if (trackInsertError) {
            setSaving(false);
            setError(trackInsertError.message);
            return;
          }
        }
      }

      if (idsToDelete.length) {
        const { error: deleteError } = await supabase.from('tracks').delete().in('id', idsToDelete).eq('product_id', id);
        if (deleteError) {
          setSaving(false);
          setError(deleteError.message);
          return;
        }
      }
    }

    if (needsDigitalFile) {
      const assetType = productAssetTypeForSection(section.id);
      const { error: deleteAssetError } = await supabase
        .from('product_assets')
        .delete()
        .eq('product_id', id)
        .eq('asset_type', assetType);

      if (deleteAssetError) {
        setSaving(false);
        setError(deleteAssetError.message);
        return;
      }

      const { error: insertAssetError } = await supabase.from('product_assets').insert({
        product_id: id,
        asset_type: assetType,
        title: productType.trim() || title.trim(),
        file_url: itemFileUrl.trim(),
        storage_path: null,
        is_downloadable: true,
        sort_order: 0,
      });

      if (insertAssetError) {
        setSaving(false);
        setError(insertAssetError.message);
        return;
      }
    }

    const featureError = await saveReleaseFeatures({
      supabaseClient: supabase,
      productId: id,
      sectionId: section.id,
      state: featureState,
    });

    if (featureError) {
      setSaving(false);
      setError(featureError);
      return;
    }

    setSaving(false);
    setSuccess('Changes saved.');
    router.push(section.href);
  }

  if (loading || !user || fetching) return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;

  async function handleDelete() {
    if (!user) return;
    setDeleting(true);
    setError('');
    setSuccess('');

    const profileResult = ownerId ? null : await loadStudioProfile(user.id);
    const profileId = ownerId || profileResult?.profile?.id || user.id;

    const { data: ownedProduct, error: ownershipError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .eq('author_id', profileId)
      .maybeSingle();

    if (ownershipError || !ownedProduct) {
      setDeleting(false);
      setError(ownershipError?.message || 'Item not found.');
      return;
    }

    const { error: tracksError } = await supabase.from('tracks').delete().eq('product_id', id);
    if (tracksError) {
      setDeleting(false);
      setError(tracksError.message);
      return;
    }

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('author_id', profileId);

    if (deleteError) {
      setDeleting(false);
      setError(deleteError.message);
      return;
    }

    setDeleting(false);
    router.push(section.href);
  }

  const hasTracks = tracks.some(track => track.title.trim() || track.audioUrl.trim());
  const deleteDescription = hasTracks || isMusicProduct
    ? 'Delete this release? This will permanently remove the release and its tracklist from 44.'
    : `Delete this ${section.itemLabel}? This will permanently remove it from 44.`;

  return (
    <PageShell>
      <div className="dashboard-editor">
        <HubHero title={section.editTitle} copy={`Update this ${section.itemLabel} inside 44.`} />
        <div className="dashboard-section">
          <form onSubmit={handleSubmit} className="dashboard-form">
            <label className="dashboard-field"><div className="dashboard-field-label">{isMerchProduct ? 'Product Name' : 'Title'}</div><input className="os-input-field" value={title} onChange={e => setTitle(e.target.value)} /></label>

            <label className="dashboard-field">
              <div className="dashboard-field-label">{isMerchProduct ? 'Product Description' : 'Description'}</div>
              <textarea className="os-input-textarea" rows={6} value={description} onChange={event => setDescription(event.target.value)} />
            </label>

            <div className="dashboard-form-grid dashboard-form-grid-3">
              <label className="dashboard-field">
                <div className="dashboard-field-label">{section.typeLabel}</div>
                <select className="os-input-field" value={productType} onChange={event => setProductType(event.target.value)}>
                  {typeOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="dashboard-field"><div className="dashboard-field-label">{isMerchProduct ? 'Drop Year' : 'Release Year'}</div><input className="os-input-field" value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
            </div>

            {isMerchProduct ? (
              <div className="settings-field">
                <div className="settings-field-head">
                  <div className="os-type-card-title">Fulfillment</div>
                  <p className="os-type-body-small">Choose whether you ship the item or deliver it to the customer yourself.</p>
                </div>
                <div className="settings-segment" role="group" aria-label="Merch fulfillment">
                  <button
                    type="button"
                    className={merchFulfillmentMode === 'ship' ? 'settings-segment-item settings-segment-item-active' : 'settings-segment-item'}
                    onClick={() => setMerchFulfillmentMode('ship')}
                  >
                    Ship to Customer
                  </button>
                  <button
                    type="button"
                    className={merchFulfillmentMode === 'deliver' ? 'settings-segment-item settings-segment-item-active' : 'settings-segment-item'}
                    onClick={() => setMerchFulfillmentMode('deliver')}
                  >
                    Deliver to Customer (Local Only)
                  </button>
                </div>
                <p className="dashboard-form-note">
                  {merchFulfillmentMode === 'ship'
                    ? 'After an order is placed, you will provide shipment details and a tracking number yourself.'
                    : 'You will deliver the item locally without a tracking number.'}
                </p>
              </div>
            ) : null}

            {isMerchProduct && merchFulfillmentMode === 'ship' ? (
              <div className="settings-field">
                <div className="settings-field-head">
                  <div className="os-type-card-title">Shipping Area</div>
                  <p className="os-type-body-small">Choose whether you ship only within your home country or ship globally.</p>
                </div>
                <div className="settings-segment" role="group" aria-label="Merch shipping area">
                  <button
                    type="button"
                    className={merchShippingScope === 'global' ? 'settings-segment-item settings-segment-item-active' : 'settings-segment-item'}
                    onClick={() => setMerchShippingScope('global')}
                  >
                    Global Shipping
                  </button>
                  <button
                    type="button"
                    className={merchShippingScope === 'local' ? 'settings-segment-item settings-segment-item-active' : 'settings-segment-item'}
                    onClick={() => setMerchShippingScope('local')}
                  >
                    Local Shipping Only
                  </button>
                </div>
              </div>
            ) : null}

            <div className="dashboard-form-grid dashboard-form-grid-3">
              {!merchUsesLocalOnlyPricing ? (
                <label className="dashboard-field">
                  <div className="dashboard-field-label">{isMerchProduct ? 'Global Price' : 'Price'}</div>
                  <span className="dashboard-price-input">
                    <span>{currencySymbol('USD')}</span>
                    <input className="os-input-field" value={price} onChange={e => setPrice(formatPriceInput(e.target.value))} />
                  </span>
                </label>
              ) : null}
              {(isMerchProduct ? merchUsesLocalOnlyPricing : marketMode !== 'global') && (
                <label className="dashboard-field">
                  <div className="dashboard-field-label">{merchUsesLocalOnlyPricing ? `Price (${localCurrency})` : `Local Price (${localCurrency})`}</div>
                  <span className="dashboard-price-input">
                    <span>{currencySymbol(localCurrency)}</span>
                    <input className="os-input-field" value={localPrice} onChange={e => setLocalPrice(formatPriceInput(e.target.value))} />
                  </span>
                </label>
              )}
            </div>

            {!isMerchProduct ? (
            <div className="settings-field">
              <div className="settings-field-head">
                <div className="os-type-card-title">Market</div>
                <p className="os-type-body-small">Choose one global price, or add a price for your local market. Your local market comes from Settings &gt; Region.</p>
              </div>
              <div className="settings-segment" role="group" aria-label={`${section.label} market`}>
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
              <p className="dashboard-form-note">Leave Local Price blank to use the global price everywhere.</p>
            </div>
            ) : null}

            <UploadField
              label="Artwork"
              folder="products/covers"
              userId={user.id}
              value={coverUrl}
              accept="image/*"
              buttonLabel="Upload artwork"
              onChange={setCoverUrl}
            />

            {needsDigitalFile ? (
              <UploadField
                label={section.id === 'books' ? 'Book File' : 'Asset File'}
                folder={section.id === 'books' ? 'products/books' : 'products/assets'}
                userId={user.id}
                value={itemFileUrl}
                accept={section.id === 'books' ? 'application/pdf,.pdf,.epub' : 'application/zip,.zip,audio/*'}
                buttonLabel={section.id === 'books' ? 'Upload book file' : 'Upload asset file'}
                onChange={setItemFileUrl}
              />
            ) : null}

            {isMusicProduct ? (
              <div className="dashboard-form-section">
                <div className="dashboard-form-section-head">
                  <div className="dashboard-form-section-copy">
                    <div className="dashboard-field-label">Tracks</div>
                    <p>
                      Update the release tracklist here. Each visible row should have a title and an audio upload.
                    </p>
                  </div>

                  <label className="dashboard-field" style={{ minWidth: 140 }}>
                    <div className="dashboard-field-label">Track Count</div>
                    <select className="os-input-field" value={trackCount} onChange={event => setTrackCount(event.target.value)}>
                      {Array.from({ length: 30 }, (_, index) => index + 1).map(count => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={{ display: 'grid', gap: 16 }}>
                  {tracks.slice(0, Number(trackCount || '0')).map((track, index) => (
                    <GlassPanel key={track.id ?? `track-${index}`} style={{ padding: 18 }}>
                      <div style={{ display: 'grid', gap: 16 }}>
                        <div className="dashboard-field-label">Track {index + 1}</div>

                        <div className="dashboard-form-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 180px' }}>
                          <label className="dashboard-field">
                            <div className="dashboard-field-label">Track Title</div>
                            <input
                              className="os-input-field"
                              value={track.title}
                              onChange={event => updateTrack(index, { title: event.target.value })}
                              placeholder={`Track ${index + 1} title`}
                            />
                          </label>

                          <label className="dashboard-field">
                            <div className="dashboard-field-label">Duration (seconds)</div>
                            <input
                              className="os-input-field"
                              value={track.durationSeconds}
                              onChange={event => updateTrack(index, { durationSeconds: event.target.value.replace(/\D/g, '').slice(0, 4) })}
                              placeholder="180"
                            />
                          </label>
                        </div>

                        <UploadField
                          label="Audio File"
                          folder="tracks/audio"
                          userId={user.id}
                          value={track.audioUrl}
                          accept="audio/*"
                          buttonLabel="Upload audio"
                          onChange={nextValue => updateTrack(index, { audioUrl: nextValue })}
                        />
                      </div>
                    </GlassPanel>
                  ))}
                </div>
              </div>
            ) : null}

            {!isMerchProduct ? (
              <DashboardReleaseFeatures
                sectionId={section.id}
                userId={user.id}
                state={featureState}
                onChange={setFeatureState}
              />
            ) : null}

            {error && <div className="dashboard-status dashboard-status-error">{error}</div>}
            {success && <div className="dashboard-status dashboard-status-success">{success}</div>}

            <div className="dashboard-form-actions">
              <div className="dashboard-form-actions-left">
                <button className="os-button os-button-danger" type="button" onClick={() => setShowDeleteConfirm(true)}>{deleteLabel}</button>
              </div>
              <div className="dashboard-form-actions-right">
                <Link className="os-button os-button-secondary" href={section.href}>Cancel</Link>
                <button className="os-button os-button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          </form>
        </div>
        <ConfirmDialog
          open={showDeleteConfirm}
          title={deleteLabel}
          description={deleteDescription}
          confirmLabel={deleteLabel}
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
