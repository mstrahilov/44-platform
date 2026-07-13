'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageShell, HubHero, SectionHeader } from '@/components/Ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTopbarBack } from '@/components/TopbarContext';
import { UploadField } from '@/components/UploadField';
import { StudioCreatorUpdates } from '@/components/StudioCreatorUpdates';
import { TagMultiSelect } from '@/components/TagMultiSelect';
import {
  StudioReleaseFeatures,
  createReleaseFeatureState,
  featureAssetTypes,
  hydrateReleaseFeatureState,
  normalizeFeatureStateForSection,
  saveReleaseFeatures,
  validateReleaseFeatureState,
  type SavedProductAchievement,
} from '@/components/StudioReleaseFeatures';
import { useAuth } from '@/lib/useAuth';
import type { ProductCategory } from '@/lib/platform';
import type { Product } from '@/lib/products';
import { currencyForCountry, normalizeMarketMode, type MarketMode } from '@/lib/marketPreferences';
import { getStudioDisplayName, loadStudioProfile } from '@/lib/studioProfiles';
import { getStudioCatalogSectionForProduct, type StudioCatalogSectionId } from '@/lib/studioCatalog';
import {
  archiveStudioItem,
  listCatalogTaxonomy,
  listItemCategories,
  loadStudioItemEditor,
  replaceStudioAsset,
  replaceStudioItemTaxonomy,
  syncStudioTracks,
  updateStudioItem,
} from '@/lib/domain/studioPublishing';
import type { Database } from '@/lib/database.types';
import { ExternalLinksEditor } from '@/components/ExternalLinksEditor';
import { activeExternalLinkDrafts, listExternalLinkPlatforms, materializeExternalLinkDrafts, replaceOwnedItemExternalLinks, validateExternalLinkDrafts, type ExternalLinkDraft, type ExternalLinkPlatform } from '@/lib/domain/externalLinks';

function formatPriceInput(value: string) {
  const normalized = value.replace(/[^\d.]/g, '');
  const [whole = '', ...decimalParts] = normalized.split('.');
  const decimals = decimalParts.join('').slice(0, 2);
  const safeWhole = whole.replace(/^0+(?=\d)/, '').slice(0, 7);
  return decimalParts.length > 0 ? `${safeWhole || '0'}.${decimals}` : safeWhole;
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

function experienceTypeForSection(sectionId: StudioCatalogSectionId) {
  if (sectionId === 'merch') return 'merch';
  if (sectionId === 'books') return 'book';
  if (sectionId === 'assets') return 'asset';
  return 'music';
}

function productAssetTypeForSection(sectionId: StudioCatalogSectionId) {
  if (sectionId === 'merch') return 'merch';
  if (sectionId === 'books') return 'book';
  if (sectionId === 'assets') return 'sample_pack';
  return 'music';
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [creatorName, setCreatorName] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productType, setProductType] = useState('');
  const [storeTypeId, setStoreTypeId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [taxonomyTypes, setTaxonomyTypes] = useState<Database['public']['Tables']['item_types']['Row'][]>([]);
  const [taxonomyTags, setTaxonomyTags] = useState<Database['public']['Tables']['item_tags']['Row'][]>([]);
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
  const [externalLinks, setExternalLinks] = useState<ExternalLinkDraft[]>([]);
  const [externalLinkPlatforms, setExternalLinkPlatforms] = useState<ExternalLinkPlatform[]>([]);
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

      const [categoryRows, profileResult, taxonomy, linkPlatforms] = await Promise.all([
        listItemCategories(),
        loadStudioProfile(user.id),
        listCatalogTaxonomy(),
        listExternalLinkPlatforms('item'),
      ]);

      setCategories(categoryRows);
      setTaxonomyTypes(taxonomy.types);
      setTaxonomyTags(taxonomy.tags);
      setExternalLinkPlatforms(linkPlatforms);
      setCreatorName(getStudioDisplayName(profileResult.profile, user.email));
      const profileId = profileResult.profile?.id ?? user.id;
      const fallbackLocalCurrency =
        profileResult.profile?.display_currency ||
        currencyForCountry(profileResult.profile?.country_code) ||
        profileResult.profile?.home_currency ||
        currencyForCountry(profileResult.profile?.home_country_code);
      setOwnerId(profileId);

      let editor;
      try {
        editor = await loadStudioItemEditor(id, profileId);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load this Item.');
        setFetching(false);
        return;
      }
      if (!editor) {
        setError('Item not found.');
        setFetching(false);
        return;
      }
      const { item: product, tracks: trackRows, assets: assetRows, achievements: achievementRows } = editor;

      const productSection = getStudioCatalogSectionForProduct(product);
      const featureAssets = assetRows.filter(asset => featureAssetTypes().includes(asset.asset_type ?? ''));

      setTitle(product.title ?? '');
      setCategoryId(product.item_category_id ?? '');
      setProductType(product.item_type ?? '');
      setStoreTypeId(editor.taxonomyTypeId ?? taxonomy.types.find(type => type.category_id === product.item_category_id)?.id ?? '');
      setSelectedTagIds(editor.taxonomyTagIds);
      setExternalLinks(materializeExternalLinkDrafts(linkPlatforms, editor.externalLinks));
      setPrice(product.price_cents ? (product.price_cents / 100).toFixed(2) : '');
      setMarketMode(normalizeMarketMode(product.market_mode));
      setLocalPrice(product.local_price_cents ? (product.local_price_cents / 100).toFixed(2) : '');
      setLocalCurrency(product.local_currency || fallbackLocalCurrency);
      setMerchFulfillmentMode((product as Product & { merch_fulfillment_mode?: 'ship' | 'deliver' | null }).merch_fulfillment_mode || (product.available_locally_only ? 'deliver' : 'ship'));
      setMerchShippingScope((product as Product & { merch_shipping_scope?: 'local' | 'global' | null }).merch_shipping_scope || (product.available_locally_only ? 'local' : 'global'));
      setCoverUrl(product.cover_url ?? '');
      const primaryAsset = assetRows.find(asset => !featureAssetTypes().includes(asset.asset_type ?? ''));
      setItemFileUrl(product.read_url || product.download_url || primaryAsset?.storage_path || primaryAsset?.file_url || '');
      setYear(product.year ? String(product.year) : '');
      setFeatureState(hydrateReleaseFeatureState(
        productSection.id,
        (achievementRows as Array<{
          code: string;
          title: string;
          description: string | null;
          trigger_type: string;
          reward_config: Record<string, unknown> | null;
          is_secret: boolean | null;
          icon: string | null;
        }>).map(achievement => ({
          code: achievement.code,
          title: achievement.title,
          description: achievement.description ?? '',
          triggerType: achievement.trigger_type,
          reward_config: achievement.reward_config,
          is_secret: achievement.is_secret,
          iconUrl: achievement.icon ?? '',
          enabled: true,
        })) satisfies SavedProductAchievement[],
        featureAssets,
      ));
      setHasSavedFeatures(Boolean(achievementRows.length || featureAssets.length));

      const resolvedTracks = trackRows.map(track => ({
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

  const section = useMemo(() => {
    const slug = selectedCategory?.slug;
    if (slug === 'books') return getStudioCatalogSectionForProduct({ item_type: productType, experience_type: 'book', fulfillment_type: 'digital' });
    if (slug === 'assets') return getStudioCatalogSectionForProduct({ item_type: productType, experience_type: 'asset', fulfillment_type: 'digital' });
    if (slug === 'merch') return getStudioCatalogSectionForProduct({ item_type: productType, experience_type: 'merch', fulfillment_type: 'physical' });
    return getStudioCatalogSectionForProduct({ item_type: productType, experience_type: 'music', fulfillment_type: 'digital' });
  }, [productType, selectedCategory]);
  const deleteLabel = `Remove ${section.itemLabel.replace(/\b\w/g, char => char.toUpperCase())}`;
  const isMusicProduct = section.id === 'music';
  const isMerchProduct = section.id === 'merch';
  const needsDigitalFile = section.id === 'books' || section.id === 'assets';
  const merchUsesLocalOnlyPricing = isMerchProduct && (merchFulfillmentMode === 'deliver' || merchShippingScope === 'local');

  useTopbarBack({ href: section.href, label: section.label });

  useEffect(() => {
    if (!isMusicProduct) return;
    Promise.resolve().then(() => {
      setTracks(current => ensureTrackCount(current, Number(trackCount || '0')));
    });
  }, [isMusicProduct, trackCount]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setFeatureState(current => normalizeFeatureStateForSection(current, section.id));
    });
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
    if (!cleanTitle || !categoryId || !storeTypeId) {
      setError('Please fill out the title and choose an Item Type.');
      return;
    }
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
    if (isMusicProduct) {
      const linkError = validateExternalLinkDrafts(externalLinks, externalLinkPlatforms);
      if (linkError) {
        setError(linkError);
        return;
      }
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
      item_category_id: categoryId,
      item_type: productType.trim(),
      price_cents: merchUsesLocalOnlyPricing ? 0 : priceCents,
      market_mode: isMerchProduct ? (merchUsesLocalOnlyPricing ? 'global_plus_local' : marketMode) : marketMode,
      local_price_cents: isMerchProduct ? (localPriceCents ?? priceCents) : (marketMode === 'global' ? null : localPriceCents),
      local_currency: isMerchProduct ? localCurrency : (marketMode === 'global' ? null : localCurrency),
      available_locally_only: isMerchProduct ? merchUsesLocalOnlyPricing : false,
      is_free: isFree,
      cover_url: coverUrl.trim() || null,
      experience_type: experienceTypeForSection(section.id),
      fulfillment_type: isMerchProduct ? 'physical' : 'digital',
      merch_fulfillment_mode: isMerchProduct ? merchFulfillmentMode : null,
      merch_shipping_scope: isMerchProduct ? (merchFulfillmentMode === 'deliver' ? 'local' : merchShippingScope) : null,
      read_url: null,
      download_url: null,
      year: year ? Number(year) : null,
      creator: creatorName,
    };

    try {
      await updateStudioItem(id, profileId, updatePayload);
    } catch (updateError) {
      setSaving(false);
      setError(updateError instanceof Error ? updateError.message : 'Could not update this Item.');
      return;
    }

    try {
      await replaceStudioItemTaxonomy(id, storeTypeId, selectedTagIds);
    } catch (taxonomyError) {
      setSaving(false);
      setError(taxonomyError instanceof Error ? taxonomyError.message : 'Could not save Browse taxonomy.');
      return;
    }

    if (isMusicProduct) {
      const existingIds = tracks.map(track => track.id).filter(Boolean) as string[];
      const keptIds = visibleTracks.map(track => track.id).filter(Boolean) as string[];
      const idsToDelete = existingIds.filter(existingId => !keptIds.includes(existingId));

      const trackRows = visibleTracks.map((track, index) => ({
          id: track.id,
          item_id: id,
          number: index + 1,
          title: track.title.trim(),
          duration_seconds: track.durationSeconds ? Number(track.durationSeconds) : null,
          audio_url: track.audioUrl.trim(),
          download_url: null,
        }));
      try {
        await syncStudioTracks(id, trackRows, idsToDelete);
      } catch (trackError) {
        setSaving(false);
        setError(trackError instanceof Error ? trackError.message : 'Could not save tracks.');
        return;
      }
    }

    if (needsDigitalFile) {
      const assetType = productAssetTypeForSection(section.id);
      try {
        await replaceStudioAsset(id, assetType, {
          item_id: id,
          asset_type: assetType,
          title: productType.trim() || title.trim(),
          file_url: null,
          storage_path: itemFileUrl.trim(),
          is_downloadable: true,
          sort_order: 0,
        });
      } catch (assetError) {
        setSaving(false);
        setError(assetError instanceof Error ? assetError.message : 'Could not save the digital file.');
        return;
      }
    }

      const featureError = section.id === 'music' ? await saveReleaseFeatures({
        productId: id,
        sectionId: section.id,
        state: featureState,
      }) : '';

    if (featureError) {
      setSaving(false);
      setError(featureError);
      return;
    }
    if (isMusicProduct) {
      try {
        await replaceOwnedItemExternalLinks(id, activeExternalLinkDrafts(externalLinks));
      } catch (linkSaveError) {
        setSaving(false);
        setError(linkSaveError instanceof Error ? linkSaveError.message : 'Could not save release links.');
        return;
      }
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

    try {
      await archiveStudioItem(id, profileId);
    } catch (deleteError) {
      setDeleting(false);
      setError(deleteError instanceof Error ? deleteError.message : 'Could not remove this Item.');
      return;
    }

    setDeleting(false);
    router.push(section.href);
  }

  const hasTracks = tracks.some(track => track.title.trim() || track.audioUrl.trim());
  const deleteDescription = hasTracks || isMusicProduct
    ? 'Remove this release? It will leave Store and active Studio views while existing Library access and activity history stay intact.'
    : `Remove this ${section.itemLabel}? It will leave Store and active Studio views while existing Library access and activity history stay intact.`;

  return (
    <PageShell>
      <div className="dashboard-editor">
        <HubHero title={section.editTitle} copy={`Update this ${section.itemLabel} for Browse and Library.`} />
        <div className="dashboard-section">
          <form onSubmit={handleSubmit} className="dashboard-form">
            <section className="dashboard-form-section">
              <SectionHeader title="Details" description="Set the core title, type, pricing, artwork, and main details for this item." />
              <div className="dashboard-form-step">
            <label className="dashboard-field"><div className="dashboard-field-label">{isMerchProduct ? 'Product Name' : 'Title'}</div><input className="os-input-field" value={title} onChange={e => setTitle(e.target.value)} /></label>

            <div className="dashboard-form-grid dashboard-form-grid-3">
              <label className="dashboard-field"><div className="dashboard-field-label">{isMerchProduct ? 'Drop Year' : 'Release Year'}</div><input className="os-input-field" value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
              {!merchUsesLocalOnlyPricing ? (
                <label className="dashboard-field">
                  <div className="dashboard-field-label">{isMerchProduct ? 'Global Price' : 'Price'}</div>
                  <span className="dashboard-price-input">
                    <span>{currencySymbol('USD')}</span>
                    <input className="os-input-field" value={price} onChange={e => setPrice(formatPriceInput(e.target.value))} />
                  </span>
                </label>
              ) : null}
              <label className="dashboard-field">
                <div className="dashboard-field-label">Item Type</div>
                <select className="os-input-field" value={storeTypeId} onChange={event => {
                  setStoreTypeId(event.target.value);
                  setProductType(taxonomyTypes.find(type => type.id === event.target.value)?.label ?? '');
                  setSelectedTagIds([]);
                }}>
                  {taxonomyTypes.filter(type => type.category_id === categoryId).map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                </select>
              </label>
            </div>

            <div className="dashboard-field">
              <div className="dashboard-field-label">Item Tags</div>
              <TagMultiSelect options={taxonomyTags.filter(tag => tag.category_id === categoryId && (!tag.item_type_id || tag.item_type_id === storeTypeId))} value={selectedTagIds} onChange={setSelectedTagIds} />
              <span className="dashboard-form-note">Optional. Select any approved genre, style, or format tags that apply.</span>
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
              label={isMerchProduct ? 'Product Image' : 'Artwork'}
              folder="products/covers"
              userId={user.id}
              value={coverUrl}
              accept="image/*"
              previewKind="image"
              buttonLabel={isMerchProduct ? 'Upload product image' : 'Upload artwork'}
              onChange={setCoverUrl}
            />

            {needsDigitalFile ? (
              <UploadField
                label={section.id === 'books' ? 'Book File' : 'Asset File'}
                folder={section.id === 'books' ? 'products/books' : 'products/assets'}
                storage="private-item"
                userId={user.id}
                value={itemFileUrl}
                accept={section.id === 'books' ? 'application/pdf,.pdf,.epub' : 'application/zip,.zip,audio/*'}
                buttonLabel={section.id === 'books' ? 'Upload book file' : 'Upload asset file'}
                onChange={setItemFileUrl}
              />
            ) : null}
              </div>
            </section>

            {isMusicProduct ? (
              <section className="dashboard-form-section studio-tracks-section">
                <SectionHeader
                  title="Tracks"
                  description="Add up to 30 tracks for this release. Each track should have a title and an audio upload."
                  action={(
                    <label className="dashboard-field" style={{ minWidth: 140 }}>
                    <div className="dashboard-field-label">Track Count</div>
                    <select className="os-input-field" value={trackCount} onChange={event => setTrackCount(event.target.value)}>
                      {Array.from({ length: 30 }, (_, index) => index + 1).map(count => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </select>
                    </label>
                  )}
                />

                <div className="dashboard-track-editor-list">
                    {tracks.slice(0, Number(trackCount || '0')).map((track, index) => (
                      <div key={track.id ?? `track-${index}`} className="dashboard-track-editor-row">
                        <div className="dashboard-track-editor-copy">
                          <label className="dashboard-field studio-track-title-field">
                            <span className="dashboard-field-label">{index + 1}. Track Title</span>
                            <input
                              className="os-input-field"
                              value={track.title}
                              onChange={event => updateTrack(index, { title: event.target.value })}
                              placeholder={`Track ${index + 1} title`}
                            />
                          </label>

                          <UploadField
                            label="Audio File"
                            folder="tracks/audio"
                            userId={user.id}
                            value={track.audioUrl}
                            accept="audio/*"
                            buttonLabel="Upload audio"
                            previewKind="none"
                            hideLabel
                            hideSuccessMessage
                            onChange={nextValue => updateTrack(index, { audioUrl: nextValue })}
                            onAudioMetadata={durationSeconds => updateTrack(index, { durationSeconds: String(durationSeconds) })}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            ) : null}

            {isMusicProduct ? (
              <section className="dashboard-form-section">
                <SectionHeader title="Listen Elsewhere" description="Link this release to its official pages on other listening platforms." />
                <ExternalLinksEditor
                  links={externalLinks}
                  platforms={externalLinkPlatforms}
                  onChange={setExternalLinks}
                  description="Paste the matching release link for each service you use. Leave a field blank when this release is not available there."
                />
              </section>
            ) : null}

            {section.id === 'music' ? (
              <StudioReleaseFeatures
                sectionId={section.id}
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
          <StudioCreatorUpdates itemId={id} />
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
