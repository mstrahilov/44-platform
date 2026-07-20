'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageShell, HubHero, SectionHeader } from '@/components/Ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTopbarBack } from '@/components/TopbarContext';
import { AUDIO_UPLOAD_ACCEPT, UploadField } from '@/components/UploadField';
import { TagMultiSelect } from '@/components/TagMultiSelect';
import { Ui44SelectInput, Ui44TextInput, Ui44Textarea } from '@/components/ui44/Inputs';
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
  attachStudioAudioAssets,
  listCatalogTaxonomy,
  listItemCategories,
  loadStudioItemEditor,
  replaceStudioAsset,
  replaceStudioItemTaxonomy,
  isPublishingReviewRequired,
  setStudioPublicationStatus,
  submitStudioItemForReview,
  syncStudioTracks,
  updateStudioItem,
} from '@/lib/domain/studioPublishing';
import { audioPipelineEnabled } from '@/lib/audioUploads';
import type { Database } from '@/lib/database.types';
import { ExternalLinksEditor } from '@/components/ExternalLinksEditor';
import { activeExternalLinkDrafts, listExternalLinkPlatforms, materializeExternalLinkDrafts, replaceOwnedItemExternalLinks, validateExternalLinkDrafts, type ExternalLinkDraft, type ExternalLinkPlatform } from '@/lib/domain/externalLinks';
import { replaceStudioSampleFiles, saveStudioBookContent } from '@/lib/domain/nativeContent';
import { StudioBookFields, StudioSamplePreviewFields, validateStudioBookMetadata, type DraftSamplePreview } from '@/components/StudioNativeContentFields';
import { clearStudioFormRecovery, readStudioFormRecovery, writeStudioFormRecovery } from '@/lib/studioFormRecovery';
import { loadCreatorPaidSalesState, type CreatorPaidSalesState } from '@/lib/domain/creatorCommerce';
import { normalizeOptionalReleaseDate, releaseYear } from '@/lib/releaseDates';
import { StudioDigitalPricingFields, StudioPriceInput, type StudioAvailability } from '@/components/StudioPricingFields';

type DraftTrack = {
  id?: string;
  title: string;
  durationSeconds: string;
  audioUrl: string;
  audioAssetId?: string;
  initialAudioUrl?: string;
};

type EditItemRecovery = {
  title: string; description: string; categoryId: string; productType: string; storeTypeId: string;
  selectedTagIds: string[]; price: string; availability?: StudioAvailability; marketMode: MarketMode; localPrice: string; localCurrency: string;
  merchFulfillmentMode: 'ship' | 'deliver'; merchShippingScope: 'local' | 'global'; coverUrl: string;
  itemFileUrl: string; bookPreviewUrl: string; bookTotalPages: string; bookSamplePages: string;
  bookLanguage: string; samplePreviews: DraftSamplePreview[]; year: string; releaseDate?: string; trackCount: string;
  tracks: DraftTrack[]; featureState: ReturnType<typeof createReleaseFeatureState>; externalLinks: ExternalLinkDraft[]; externalLinksEnabled?: boolean;
};

function createDraftTrack(): DraftTrack {
  return {
    title: '',
    durationSeconds: '',
    audioUrl: '',
    audioAssetId: '',
    initialAudioUrl: '',
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
  const userId = user?.id ?? '';
  const userEmail = user?.email ?? undefined;
  const recoveryKey = userId ? `edit:${userId}:${id}` : '';
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [creatorName, setCreatorName] = useState('');
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productType, setProductType] = useState('');
  const [storeTypeId, setStoreTypeId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [taxonomyTypes, setTaxonomyTypes] = useState<Database['public']['Tables']['item_types']['Row'][]>([]);
  const [taxonomyTags, setTaxonomyTags] = useState<Database['public']['Tables']['item_tags']['Row'][]>([]);
  const [price, setPrice] = useState('');
  const [availability, setAvailability] = useState<StudioAvailability>('free');
  const [savedPriceCents, setSavedPriceCents] = useState(0);
  const [savedIsFree, setSavedIsFree] = useState(true);
  const [paidSales, setPaidSales] = useState<CreatorPaidSalesState | null>(null);
  const [marketMode, setMarketMode] = useState<MarketMode>('global');
  const [savedMarketMode, setSavedMarketMode] = useState<MarketMode>('global');
  const [localPrice, setLocalPrice] = useState('');
  const [localCurrency, setLocalCurrency] = useState('USD');
  const [savedLocalPriceCents, setSavedLocalPriceCents] = useState<number | null>(null);
  const [savedLocalCurrency, setSavedLocalCurrency] = useState<string | null>(null);
  const [merchFulfillmentMode, setMerchFulfillmentMode] = useState<'ship' | 'deliver'>('deliver');
  const [merchShippingScope, setMerchShippingScope] = useState<'local' | 'global'>('local');
  const [coverUrl, setCoverUrl] = useState('');
  const [itemFileUrl, setItemFileUrl] = useState('');
  const [bookPreviewUrl, setBookPreviewUrl] = useState('');
  const [bookTotalPages, setBookTotalPages] = useState('');
  const [bookSamplePages, setBookSamplePages] = useState('');
  const [bookLanguage, setBookLanguage] = useState('');
  const [samplePreviews, setSamplePreviews] = useState<DraftSamplePreview[]>([]);
  const [year, setYear] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [trackCount, setTrackCount] = useState('1');
  const [tracks, setTracks] = useState<DraftTrack[]>([createDraftTrack()]);
  const [featureState, setFeatureState] = useState(() => createReleaseFeatureState('music'));
  const [externalLinks, setExternalLinks] = useState<ExternalLinkDraft[]>([]);
  const [externalLinksEnabled, setExternalLinksEnabled] = useState(false);
  const [externalLinkPlatforms, setExternalLinkPlatforms] = useState<ExternalLinkPlatform[]>([]);
  const [hasSavedFeatures, setHasSavedFeatures] = useState(false);
  const [ownerId, setOwnerId] = useState('');
  const [itemStatus, setItemStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeUploadCount, setActiveUploadCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formRecoveryReady, setFormRecoveryReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function loadData() {
      if (!userId) return;

      const [categoryRows, profileResult, taxonomy, linkPlatforms, paidSalesResult] = await Promise.all([
        listItemCategories(),
        loadStudioProfile(userId),
        listCatalogTaxonomy(),
        listExternalLinkPlatforms('item'),
        loadCreatorPaidSalesState(userId),
      ]);

      setCategories(categoryRows);
      setTaxonomyTypes(taxonomy.types);
      setTaxonomyTags(taxonomy.tags);
      setExternalLinkPlatforms(linkPlatforms);
      setCreatorName(getStudioDisplayName(profileResult.profile, userEmail));
      setProfileRole(profileResult.profile?.role ?? null);
      setPaidSales(paidSalesResult);
      const profileId = profileResult.profile?.id ?? userId;
      const fallbackLocalCurrency = currencyForCountry(
        profileResult.profile?.country_code || profileResult.profile?.home_country_code,
      );
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
      setItemStatus(product.status ?? null);

      const productSection = getStudioCatalogSectionForProduct(product);
      const featureAssets = assetRows.filter(asset => featureAssetTypes().includes(asset.asset_type ?? ''));

      setTitle(product.title ?? '');
      setDescription(product.long_description ?? '');
      setCategoryId(product.item_category_id ?? '');
      setProductType(product.item_type ?? '');
      setStoreTypeId(editor.taxonomyTypeId ?? taxonomy.types.find(type => type.category_id === product.item_category_id)?.id ?? '');
      setSelectedTagIds(editor.taxonomyTagIds);
      setExternalLinks(materializeExternalLinkDrafts(linkPlatforms, editor.externalLinks));
      setExternalLinksEnabled(editor.externalLinks.some(link => link.url.trim().length > 0));
      setPrice(product.price_cents ? (product.price_cents / 100).toFixed(2) : '');
      const paidDownloadEnabled = Boolean(product.download_purchase_enabled && !product.is_free && product.price_cents > 0);
      const defaultAvailability = productSection.id === 'assets' ? 'paid' : paidDownloadEnabled ? 'paid' : 'free';
      setAvailability(defaultAvailability);
      setSavedPriceCents(product.price_cents ?? 0);
      setSavedIsFree(product.is_free ?? true);
      const productMarketMode = normalizeMarketMode(product.market_mode);
      const editableLocalCurrency = paidSalesResult.can_sell_paid
        ? fallbackLocalCurrency
        : product.local_currency || fallbackLocalCurrency;
      setMarketMode(productMarketMode);
      setSavedMarketMode(productMarketMode);
      setSavedLocalPriceCents(product.local_price_cents ?? null);
      setSavedLocalCurrency(product.local_currency ?? null);
      setLocalPrice(product.local_currency && product.local_currency !== editableLocalCurrency
        ? ''
        : product.local_price_cents ? (product.local_price_cents / 100).toFixed(2) : '');
      setLocalCurrency(editableLocalCurrency);
      setMerchFulfillmentMode((product as Product & { merch_fulfillment_mode?: 'ship' | 'deliver' | null }).merch_fulfillment_mode || (product.available_locally_only ? 'deliver' : 'ship'));
      setMerchShippingScope((product as Product & { merch_shipping_scope?: 'local' | 'global' | null }).merch_shipping_scope || (product.available_locally_only ? 'local' : 'global'));
      setCoverUrl(product.cover_url ?? '');
      const primaryAsset = assetRows.find(asset => !featureAssetTypes().includes(asset.asset_type ?? ''));
      setItemFileUrl(product.read_url || product.download_url || primaryAsset?.storage_path || primaryAsset?.file_url || '');
      setBookPreviewUrl(editor.bookContent?.preview_url ?? '');
      setBookTotalPages(editor.bookContent?.total_pages ? String(editor.bookContent.total_pages) : '');
      setBookSamplePages(editor.bookContent?.sample_page_limit ? String(editor.bookContent.sample_page_limit) : '');
      setBookLanguage(editor.bookContent?.language_code ?? '');
      setSamplePreviews(editor.sampleFiles.map(sample => ({
        title: sample.title,
        previewUrl: sample.preview_url ?? '',
        durationSeconds: sample.duration_seconds === null ? null : Number(sample.duration_seconds),
        waveformPeaks: Array.isArray(sample.waveform_peaks) ? sample.waveform_peaks.map(value => Number(value)) : [],
        mimeType: sample.mime_type,
        fileSizeBytes: sample.file_size_bytes,
      })));
      setYear(product.year ? String(product.year) : '');
      setReleaseDate(product.release_date ?? (product.year ? `${product.year}-01-01` : ''));
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
        editor.videoEmbeds,
      ));
      setHasSavedFeatures(Boolean(achievementRows.length || featureAssets.length));

      const audioAssetByTrack = new Map(editor.audioAssets.map(asset => [asset.track_id, asset]));
      const resolvedTracks = trackRows.map(track => ({
        id: track.id,
        title: track.title ?? '',
        durationSeconds: track.duration_seconds ? String(track.duration_seconds) : '',
        audioUrl: track.audio_url ?? '',
        initialAudioUrl: track.audio_url ?? '',
        audioAssetId: audioAssetByTrack.get(track.id)?.id ?? '',
      }));
      const nextTracks = resolvedTracks.length ? resolvedTracks : [createDraftTrack()];
      setTracks(nextTracks);
      setTrackCount(String(Math.min(30, nextTracks.length)));
      const recovered = readStudioFormRecovery<EditItemRecovery>(recoveryKey);
      if (recovered) {
        setTitle(recovered.title); setDescription(recovered.description); setCategoryId(recovered.categoryId);
        setProductType(recovered.productType); setStoreTypeId(recovered.storeTypeId); setSelectedTagIds(recovered.selectedTagIds);
        setPrice(recovered.price); setAvailability(productSection.id === 'assets' ? 'paid' : recovered.availability ?? defaultAvailability); setMarketMode(recovered.marketMode);
        setLocalPrice(recovered.localCurrency === editableLocalCurrency ? recovered.localPrice : '');
        setMerchFulfillmentMode(recovered.merchFulfillmentMode);
        setMerchShippingScope(recovered.merchShippingScope); setCoverUrl(recovered.coverUrl);
        setItemFileUrl(recovered.itemFileUrl); setBookPreviewUrl(recovered.bookPreviewUrl);
        setBookTotalPages(recovered.bookTotalPages); setBookSamplePages(recovered.bookSamplePages);
        setBookLanguage(recovered.bookLanguage); setSamplePreviews(recovered.samplePreviews); setYear(recovered.year); setReleaseDate(recovered.releaseDate ?? (recovered.year ? `${recovered.year}-01-01` : ''));
        setTrackCount(recovered.trackCount); setTracks(recovered.tracks); setFeatureState(recovered.featureState);
        setExternalLinks(recovered.externalLinks); setExternalLinksEnabled(recovered.externalLinksEnabled ?? recovered.externalLinks.some(link => link.url.trim().length > 0));
      }
      setFormRecoveryReady(true);
      setFetching(false);
    }

    loadData();
  }, [id, recoveryKey, userEmail, userId]);

  useEffect(() => {
    if (!formRecoveryReady || !recoveryKey) return;
    writeStudioFormRecovery(recoveryKey, {
      title, description, categoryId, productType, storeTypeId, selectedTagIds, price, availability, marketMode,
      localPrice, localCurrency, merchFulfillmentMode, merchShippingScope, coverUrl, itemFileUrl,
      bookPreviewUrl, bookTotalPages, bookSamplePages, bookLanguage, samplePreviews, year, releaseDate,
      trackCount, tracks, featureState, externalLinks, externalLinksEnabled,
    } satisfies EditItemRecovery);
  }, [bookLanguage, bookPreviewUrl, bookSamplePages, bookTotalPages, categoryId, coverUrl, description,
    externalLinks, externalLinksEnabled, featureState, formRecoveryReady, itemFileUrl, localCurrency, localPrice, marketMode,
    merchFulfillmentMode, merchShippingScope, price, availability, productType, recoveryKey, samplePreviews,
    selectedTagIds, storeTypeId, title, trackCount, tracks, year, releaseDate]);

  const selectedCategory = useMemo(
    () => categories.find(category => category.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const section = useMemo(() => {
    const slug = selectedCategory?.slug;
    if (slug === 'books') return getStudioCatalogSectionForProduct({ item_type: productType, experience_type: 'book', fulfillment_type: 'digital' });
    if (slug === 'assets' || slug === 'sample-packs') return getStudioCatalogSectionForProduct({ item_type: productType, experience_type: 'asset', fulfillment_type: 'digital' });
    if (slug === 'merch') return getStudioCatalogSectionForProduct({ item_type: productType, experience_type: 'merch', fulfillment_type: 'physical' });
    return getStudioCatalogSectionForProduct({ item_type: productType, experience_type: 'music', fulfillment_type: 'digital' });
  }, [productType, selectedCategory]);
  const deleteLabel = `Remove ${section.itemLabel.replace(/\b\w/g, char => char.toUpperCase())}`;
  const isMusicProduct = section.id === 'music';
  const isMerchProduct = section.id === 'merch';
  const needsDigitalFile = section.id === 'books' || section.id === 'assets';
  const merchUsesLocalOnlyPricing = isMerchProduct && (merchFulfillmentMode === 'deliver' || merchShippingScope === 'local');
  const creatorCommerceUnavailable = !isMerchProduct && !paidSales?.can_sell_paid;

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

  function handleUploadActivity(uploading: boolean) {
    setActiveUploadCount(current => Math.max(0, current + (uploading ? 1 : -1)));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (activeUploadCount > 0) {
      setError('Wait for every file upload to finish before saving.');
      return;
    }
    if (isMerchProduct && profileRole !== 'admin') {
      setError('Merch management is currently limited to 44 administrators.');
      return;
    }
    const profileResult = ownerId ? null : await loadStudioProfile(user.id);
    const profileId = ownerId || profileResult?.profile?.id || user.id;

    const cleanTitle = title.trim();
    const normalizedReleaseDate = normalizeOptionalReleaseDate(releaseDate);
    if (!cleanTitle || !categoryId || !storeTypeId) {
      setError('Please fill out the title and choose an Item Type.');
      return;
    }
    if (isMusicProduct && !normalizedReleaseDate) {
      setError('Choose a valid release date.');
      return;
    }
    if (!coverUrl.trim()) {
      setError(`Upload ${isMerchProduct ? 'a product image' : 'artwork'} before saving.`);
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
      if (audioPipelineEnabled() && visibleTracks.some(track => !track.audioAssetId && (!track.id || track.audioUrl !== track.initialAudioUrl))) {
        setError('Wait for every replacement track to finish preparing before saving.');
        return;
      }
    }
    if (needsDigitalFile && !itemFileUrl.trim()) {
      setError(section.id === 'books' ? 'Books need an uploaded file before saving.' : 'Sample packs need an uploaded file before saving.');
      return;
    }
    if (section.id === 'assets' && samplePreviews.some(sample => !sample.title.trim() || !sample.previewUrl.trim())) {
      setError('Each sample preview needs a name and uploaded audio.');
      return;
    }
    if (section.id === 'books') {
      const bookError = validateStudioBookMetadata(bookTotalPages, bookSamplePages, bookLanguage);
      if (bookError) {
        setError(bookError);
        return;
      }
    }
    const featureValidationError = validateReleaseFeatureState(featureState, section.id);
    if (featureValidationError) {
      setError(featureValidationError);
      return;
    }
    if (isMusicProduct) {
      const linkError = externalLinksEnabled ? validateExternalLinkDrafts(externalLinks, externalLinkPlatforms) : '';
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

    if (section.id === 'assets' && creatorCommerceUnavailable) {
      setSaving(false);
      setError('Paid downloads are not available for this account, so this Sample Pack cannot be saved as publishable yet.');
      return;
    }

    const priceNumber = Number(price || '0');
    const localPriceNumber = Number(localPrice || '0');
    const enteredLocalPriceCents = localPrice.trim() && Number.isFinite(localPriceNumber)
      ? Math.max(0, Math.round(localPriceNumber * 100))
      : null;
    const requiresGlobalPrice = isMerchProduct ? !merchUsesLocalOnlyPricing : !creatorCommerceUnavailable && availability === 'paid';
    const requiresLocalPrice = isMerchProduct
      ? merchUsesLocalOnlyPricing || marketMode === 'global_plus_local'
      : !creatorCommerceUnavailable && availability === 'paid' && marketMode === 'global_plus_local';
    if (requiresGlobalPrice && (!Number.isFinite(priceNumber) || priceNumber <= 0)) {
      setSaving(false);
      setError('Enter a price greater than zero for a paid Item.');
      return;
    }
    if (requiresLocalPrice && (!Number.isFinite(localPriceNumber) || localPriceNumber <= 0)) {
      setSaving(false);
      setError(`Enter a ${localCurrency} local price greater than zero.`);
      return;
    }
    const isFree = isMerchProduct ? false : creatorCommerceUnavailable ? savedIsFree : availability === 'free';
    const priceCents = creatorCommerceUnavailable
      ? savedPriceCents
      : isFree || merchUsesLocalOnlyPricing ? 0 : Math.round(priceNumber * 100);
    const localPriceCents = enteredLocalPriceCents;
    const updatePayload = {
      title: title.trim(),
      long_description: description.trim(),
      item_category_id: categoryId,
      item_type: productType.trim(),
      price_cents: merchUsesLocalOnlyPricing ? 0 : priceCents,
      market_mode: creatorCommerceUnavailable ? savedMarketMode : isFree ? 'global' : (merchUsesLocalOnlyPricing ? 'global_plus_local' : marketMode),
      local_price_cents: creatorCommerceUnavailable
        ? savedLocalPriceCents
        : isFree || (marketMode === 'global' && !merchUsesLocalOnlyPricing) ? null : localPriceCents,
      local_currency: creatorCommerceUnavailable
        ? savedLocalCurrency
        : isFree || (marketMode === 'global' && !merchUsesLocalOnlyPricing) ? null : localCurrency,
      available_locally_only: isMerchProduct ? merchUsesLocalOnlyPricing : false,
      is_free: isFree,
      ...(!isMerchProduct && !creatorCommerceUnavailable ? {
        ...(isMusicProduct ? { streaming_enabled: true } : {}),
        download_purchase_enabled: !isFree,
      } : {}),
      cover_url: coverUrl.trim() || null,
      experience_type: experienceTypeForSection(section.id),
      fulfillment_type: isMerchProduct ? 'physical' : 'digital',
      merch_fulfillment_mode: isMerchProduct ? merchFulfillmentMode : null,
      merch_shipping_scope: isMerchProduct ? (merchFulfillmentMode === 'deliver' ? 'local' : merchShippingScope) : null,
      read_url: null,
      download_url: null,
      year: releaseYear(normalizedReleaseDate, year),
      release_date: normalizedReleaseDate,
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
        const savedTracks = await syncStudioTracks(id, trackRows, idsToDelete);
        const audioAttachments = visibleTracks.flatMap((track, index) => {
          const savedTrack = savedTracks[index];
          return track.audioAssetId && savedTrack ? [{ assetId: track.audioAssetId, trackId: savedTrack.id }] : [];
        });
        await attachStudioAudioAssets(audioAttachments);
      } catch (trackError) {
        setSaving(false);
        setError(trackError instanceof Error ? trackError.message : 'Could not save tracks.');
        return;
      }
    }

    if (needsDigitalFile) {
      const assetType = productAssetTypeForSection(section.id);
      try {
        const insertedAssets = await replaceStudioAsset(id, assetType, {
          item_id: id,
          asset_type: assetType,
          title: productType.trim() || title.trim(),
          file_url: null,
          storage_path: itemFileUrl.trim(),
          is_downloadable: true,
          sort_order: 0,
        });
        const fullAsset = insertedAssets[0];
        if (!fullAsset) throw new Error('The protected Item file was not recorded.');
        if (section.id === 'books') {
          await saveStudioBookContent({
            itemId: id, fileAssetId: fullAsset.id, previewUrl: bookPreviewUrl.trim() || null,
            totalPages: bookTotalPages ? Number(bookTotalPages) : null,
            samplePageLimit: bookSamplePages ? Number(bookSamplePages) : null,
            languageCode: bookLanguage.trim() || null,
          });
        } else {
          await replaceStudioSampleFiles(id, samplePreviews.map(sample => ({
            title: sample.title.trim(), previewUrl: sample.previewUrl.trim() || null,
            durationSeconds: sample.durationSeconds, waveformPeaks: sample.waveformPeaks,
            mimeType: sample.mimeType, fileSizeBytes: sample.fileSizeBytes,
          })));
        }
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
        await replaceOwnedItemExternalLinks(id, externalLinksEnabled ? activeExternalLinkDrafts(externalLinks) : []);
      } catch (linkSaveError) {
        setSaving(false);
        setError(linkSaveError instanceof Error ? linkSaveError.message : 'Could not save release links.');
        return;
      }
    }

    // An already-published release has already passed the creator rights
    // attestation. Editing its features should not ask the creator to attest
    // ownership again or re-run the first-publication gate.
    if (itemStatus === 'published') {
      setSaving(false);
      setSuccess('Changes saved and published.');
      clearStudioFormRecovery(recoveryKey);
      router.push(`${section.href}?studioStatus=published`);
      return;
    }

    let reviewRequired = false;
    try {
      reviewRequired = await isPublishingReviewRequired();
      if (reviewRequired) {
        await submitStudioItemForReview(id, crypto.randomUUID());
      } else {
        await setStudioPublicationStatus(id, 'published');
      }
    } catch (publicationError) {
      setSaving(false);
      setError(publicationError instanceof Error ? publicationError.message : (typeof publicationError === 'object' && publicationError && 'message' in publicationError ? String(publicationError.message) : 'This Item is not ready to publish.'));
      return;
    }

    setSaving(false);
    setSuccess(reviewRequired ? 'Changes submitted for review.' : 'Changes saved and published.');
    clearStudioFormRecovery(recoveryKey);
    router.push(`${section.href}?studioStatus=${reviewRequired ? 'submitted' : 'published'}`);
  }

  if (loading || !user || fetching) return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>;

  if (isMerchProduct && profileRole !== 'admin') {
    return (
      <PageShell>
        <div className="dashboard-page">
          <HubHero title="Merch management unavailable" copy="Creator merch selling is planned for a future version of 44OS." />
          <div className="ui44-centered-action"><Link className="os-button os-button-primary" href="/studio">Return to Studio</Link></div>
        </div>
      </PageShell>
    );
  }

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
    clearStudioFormRecovery(recoveryKey);
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
              <SectionHeader title="Details" description="Set the core title, type, artwork, and main details for this item." />
              <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
            <label className="dashboard-field"><div className="dashboard-field-label">{isMerchProduct ? 'Product Name' : 'Title'}</div><Ui44TextInput className="os-input-field" value={title} placeholder={isMerchProduct ? 'Enter product name' : section.id === 'books' ? 'Enter book title' : section.id === 'assets' ? 'Enter sample pack title' : 'Enter release title'} onChange={e => setTitle(e.target.value)} /></label>

            {(section.id === 'books' || section.id === 'assets') ? (
              <label className="dashboard-field">
                <div className="dashboard-field-label">Description</div>
                <Ui44Textarea className="os-input-field dashboard-textarea" value={description} placeholder="Enter description" onChange={event => setDescription(event.target.value)} />
              </label>
            ) : null}

            {isMusicProduct ? (
              <div className="dashboard-form-grid dashboard-form-grid-3 release-core-grid ui44-form-grid">
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Item Type</div>
                  <Ui44SelectInput required value={storeTypeId} onChange={event => {
                    setStoreTypeId(event.target.value);
                    setProductType(taxonomyTypes.find(type => type.id === event.target.value)?.label ?? '');
                    setSelectedTagIds([]);
                  }}>
                    {taxonomyTypes.filter(type => type.category_id === categoryId).map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                  </Ui44SelectInput>
                </label>
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Release Date</div>
                  <Ui44TextInput required className="os-input-field release-date-input" type="date" value={releaseDate} onChange={e => { setReleaseDate(e.target.value); setYear(e.target.value.slice(0, 4)); }} />
                </label>
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Track Count</div>
                  <Ui44SelectInput required value={trackCount} onChange={event => setTrackCount(event.target.value)}>
                    {Array.from({ length: 30 }, (_, index) => index + 1).map(count => (
                      <option key={count} value={count}>{count}</option>
                    ))}
                  </Ui44SelectInput>
                </label>
              </div>
            ) : (
              <div className="dashboard-form-grid dashboard-form-grid-3 ui44-form-grid">
                <label className="dashboard-field"><div className="dashboard-field-label">{isMerchProduct ? 'Drop Year' : 'Release Date (Optional)'}</div>{isMerchProduct ? <Ui44TextInput className="os-input-field" value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} /> : <Ui44TextInput className="os-input-field release-date-input" type="date" value={releaseDate} onChange={e => { setReleaseDate(e.target.value); setYear(e.target.value.slice(0, 4)); }} />}</label>
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Item Type</div>
                  <Ui44SelectInput value={storeTypeId} onChange={event => {
                    setStoreTypeId(event.target.value);
                    setProductType(taxonomyTypes.find(type => type.id === event.target.value)?.label ?? '');
                    setSelectedTagIds([]);
                  }}>
                    {taxonomyTypes.filter(type => type.category_id === categoryId).map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                  </Ui44SelectInput>
                </label>
              </div>
            )}

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
                <Ui44SelectInput value={merchFulfillmentMode} onChange={event => setMerchFulfillmentMode(event.target.value as 'ship' | 'deliver')} aria-label="Merch fulfillment">
                  <option value="ship">Ship to Customer</option>
                  <option value="deliver">Deliver to Customer (Local Only)</option>
                </Ui44SelectInput>
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
                <Ui44SelectInput value={merchShippingScope} onChange={event => setMerchShippingScope(event.target.value as 'local' | 'global')} aria-label="Merch shipping area">
                  <option value="global">Global Shipping</option>
                  <option value="local">Local Shipping Only</option>
                </Ui44SelectInput>
              </div>
            ) : null}

            {!isMerchProduct ? (
              <StudioDigitalPricingFields
                availability={availability}
                marketMode={marketMode}
                globalPrice={price}
                localPrice={localPrice}
                localCurrency={localCurrency}
                disabled={creatorCommerceUnavailable}
                noticeId="creator-commerce-existing-item-notice"
                freeAccessDescription={isMusicProduct
                  ? 'Everyone can listen and add this release to their Library for free. Enable this to let listeners purchase downloadable audio files.'
                  : section.id === 'books'
                    ? 'Everyone can read and add this book to their Library for free. Enable this to let readers purchase the downloadable PDF.'
                    : undefined}
                paidDownloadRequired={section.id === 'assets'}
                onAvailabilityChange={setAvailability}
                onMarketModeChange={setMarketMode}
                onGlobalPriceChange={setPrice}
                onLocalPriceChange={setLocalPrice}
              />
            ) : (
              <div className="dashboard-form-grid dashboard-form-grid-2 ui44-form-grid">
                {!merchUsesLocalOnlyPricing ? (
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Market</div>
                    <Ui44SelectInput value={marketMode} onChange={event => setMarketMode(event.target.value as MarketMode)}>
                      <option value="global">Global</option>
                      <option value="global_plus_local">Global + Local</option>
                    </Ui44SelectInput>
                  </label>
                ) : null}
                {!merchUsesLocalOnlyPricing ? (
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Global Price (USD)</div>
                    <StudioPriceInput currency="USD" value={price} onChange={setPrice} />
                  </label>
                ) : null}
                {merchUsesLocalOnlyPricing || marketMode === 'global_plus_local' ? (
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">{merchUsesLocalOnlyPricing ? 'Price' : 'Local Price'} ({localCurrency})</div>
                    <StudioPriceInput currency={localCurrency} value={localPrice} onChange={setLocalPrice} />
                  </label>
                ) : null}
              </div>
            )}

            <UploadField
              label={isMerchProduct ? 'Product Image' : 'Artwork'}
              folder="products/covers"
              userId={user.id}
              value={coverUrl}
              accept="image/*"
              previewKind="image"
              buttonLabel={isMerchProduct ? 'Upload product image' : 'Upload artwork'}
              hideActionsWhenPreviewed={!isMerchProduct}
              onChange={setCoverUrl}
              onUploadingChange={handleUploadActivity}
            />

            {needsDigitalFile ? (
              <UploadField
                label={section.id === 'books' ? 'Book File' : 'Sample Pack ZIP'}
                folder={section.id === 'books' ? 'products/books' : 'products/assets'}
                storage="private-item"
                userId={user.id}
                value={itemFileUrl}
                accept={section.id === 'books' ? 'application/pdf,.pdf' : 'application/zip,.zip'}
                buttonLabel={section.id === 'books' ? 'Upload full PDF' : 'Upload full pack ZIP'}
                onChange={setItemFileUrl}
                onUploadingChange={handleUploadActivity}
              />
            ) : null}
              </div>
            </section>

            {section.id === 'books' ? (
              <StudioBookFields
                userId={user.id}
                previewUrl={bookPreviewUrl}
                onPreviewUrlChange={setBookPreviewUrl}
                totalPages={bookTotalPages}
                onTotalPagesChange={setBookTotalPages}
                samplePages={bookSamplePages}
                onSamplePagesChange={setBookSamplePages}
                languageCode={bookLanguage}
                onLanguageCodeChange={setBookLanguage}
                onUploadingChange={handleUploadActivity}
              />
            ) : null}

            {section.id === 'assets' ? <StudioSamplePreviewFields userId={user.id} samples={samplePreviews} onChange={setSamplePreviews} onUploadingChange={handleUploadActivity} /> : null}

            {isMusicProduct ? (
              <section className="dashboard-form-section studio-tracks-section">
                <SectionHeader
                  title="Tracks"
                  description="Add the audio and title for each track in this release."
                />

                <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip studio-track-panel">
                <div className="dashboard-track-editor-list">
                    {tracks.slice(0, Number(trackCount || '0')).map((track, index) => (
                      <div key={track.id ?? `track-${index}`} className="dashboard-track-editor-row">
                        <div className="dashboard-track-editor-copy">
                          <label className="dashboard-field studio-track-title-field">
                            <span className="dashboard-field-label">{index + 1}. Track Title</span>
                            <Ui44TextInput
                              className="os-input-field"
                              value={track.title}
                              onChange={event => updateTrack(index, { title: event.target.value })}
                              placeholder="Enter track title"
                            />
                          </label>

                          <UploadField
                            label="Audio File"
                            folder="tracks/audio"
                            userId={user.id}
                            value={track.audioUrl}
                            storage={audioPipelineEnabled() ? 'audio-track' : 'public'}
                            audioAssetId={track.audioAssetId}
                            accept={AUDIO_UPLOAD_ACCEPT}
                            buttonLabel="Upload audio"
                            previewKind="none"
                            hideLabel
                            hideSuccessMessage
                            onChange={nextValue => updateTrack(index, { audioUrl: nextValue })}
                            onAudioAssetChange={audioAssetId => updateTrack(index, { audioAssetId })}
                            onUploadingChange={handleUploadActivity}
                            onAudioMetadata={durationSeconds => updateTrack(index, { durationSeconds: String(durationSeconds) })}
                          />
                        </div>
                      </div>
                    ))}
                </div>
                </div>
              </section>
            ) : null}

            {isMusicProduct ? (
              <section className="dashboard-form-section">
                <SectionHeader title="External Links" description="Add links to this release elsewhere." action={(
                  <button type="button" role="switch" aria-checked={externalLinksEnabled} className={externalLinksEnabled ? 'settings-toggle settings-toggle-on ui44-switch ui44-switch-on' : 'settings-toggle ui44-switch'} onClick={() => setExternalLinksEnabled(enabled => !enabled)} />
                )} />
                {externalLinksEnabled && <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-visible studio-feature-panel"><ExternalLinksEditor links={externalLinks} platforms={externalLinkPlatforms} onChange={setExternalLinks} /></div>}
              </section>
            ) : null}

            {section.id === 'music' ? (
              <StudioReleaseFeatures
                sectionId={section.id}
                state={featureState}
                onChange={setFeatureState}
              />
            ) : null}

            {error && <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div>}
            {success && <div className="dashboard-status dashboard-status-success ui44-status ui44-status-success" role="status">{success}</div>}

            <div className="dashboard-form-actions">
              <div className="dashboard-form-actions-left">
                <button className="os-button os-button-danger" type="button" onClick={() => setShowDeleteConfirm(true)}>{deleteLabel}</button>
              </div>
              <div className="dashboard-form-actions-right">
                <Link className="os-button os-button-secondary" href={section.href} onClick={() => clearStudioFormRecovery(recoveryKey)}>Cancel</Link>
                <button className="os-button os-button-primary" type="submit" disabled={saving || activeUploadCount > 0}>
                  {activeUploadCount > 0 ? 'Uploading files…' : saving ? 'Saving…' : 'Save Changes'}
                </button>
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
