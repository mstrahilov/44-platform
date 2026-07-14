'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageShell, HubHero, SectionHeader } from '@/components/Ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTopbarBack } from '@/components/TopbarContext';
import { UploadField } from '@/components/UploadField';
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
  isPublishingReviewRequired,
  setStudioPublicationStatus,
  submitStudioItemForReview,
  syncStudioTracks,
  updateStudioItem,
} from '@/lib/domain/studioPublishing';
import type { Database } from '@/lib/database.types';
import { ExternalLinksEditor } from '@/components/ExternalLinksEditor';
import { activeExternalLinkDrafts, listExternalLinkPlatforms, materializeExternalLinkDrafts, replaceOwnedItemExternalLinks, validateExternalLinkDrafts, type ExternalLinkDraft, type ExternalLinkPlatform } from '@/lib/domain/externalLinks';
import { replaceStudioSampleFiles, saveStudioBookContent } from '@/lib/domain/nativeContent';
import { StudioBookFields, StudioSamplePreviewFields, type DraftSamplePreview } from '@/components/StudioNativeContentFields';
import { clearStudioFormRecovery, readStudioFormRecovery, writeStudioFormRecovery } from '@/lib/studioFormRecovery';

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

type EditItemRecovery = {
  title: string; description: string; categoryId: string; productType: string; storeTypeId: string;
  selectedTagIds: string[]; price: string; marketMode: MarketMode; localPrice: string; localCurrency: string;
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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

      const [categoryRows, profileResult, taxonomy, linkPlatforms] = await Promise.all([
        listItemCategories(),
        loadStudioProfile(userId),
        listCatalogTaxonomy(),
        listExternalLinkPlatforms('item'),
      ]);

      setCategories(categoryRows);
      setTaxonomyTypes(taxonomy.types);
      setTaxonomyTags(taxonomy.tags);
      setExternalLinkPlatforms(linkPlatforms);
      setCreatorName(getStudioDisplayName(profileResult.profile, userEmail));
      const profileId = profileResult.profile?.id ?? userId;
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
      setMarketMode(normalizeMarketMode(product.market_mode));
      setLocalPrice(product.local_price_cents ? (product.local_price_cents / 100).toFixed(2) : '');
      setLocalCurrency(product.local_currency || fallbackLocalCurrency);
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

      const resolvedTracks = trackRows.map(track => ({
        id: track.id,
        title: track.title ?? '',
        durationSeconds: track.duration_seconds ? String(track.duration_seconds) : '',
        audioUrl: track.audio_url ?? '',
      }));
      const nextTracks = resolvedTracks.length ? resolvedTracks : [createDraftTrack()];
      setTracks(nextTracks);
      setTrackCount(String(Math.min(30, nextTracks.length)));
      const recovered = readStudioFormRecovery<EditItemRecovery>(recoveryKey);
      if (recovered) {
        setTitle(recovered.title); setDescription(recovered.description); setCategoryId(recovered.categoryId);
        setProductType(recovered.productType); setStoreTypeId(recovered.storeTypeId); setSelectedTagIds(recovered.selectedTagIds);
        setPrice(recovered.price); setMarketMode(recovered.marketMode); setLocalPrice(recovered.localPrice);
        setLocalCurrency(recovered.localCurrency); setMerchFulfillmentMode(recovered.merchFulfillmentMode);
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
      title, description, categoryId, productType, storeTypeId, selectedTagIds, price, marketMode,
      localPrice, localCurrency, merchFulfillmentMode, merchShippingScope, coverUrl, itemFileUrl,
      bookPreviewUrl, bookTotalPages, bookSamplePages, bookLanguage, samplePreviews, year, releaseDate,
      trackCount, tracks, featureState, externalLinks, externalLinksEnabled,
    } satisfies EditItemRecovery);
  }, [bookLanguage, bookPreviewUrl, bookSamplePages, bookTotalPages, categoryId, coverUrl, description,
    externalLinks, externalLinksEnabled, featureState, formRecoveryReady, itemFileUrl, localCurrency, localPrice, marketMode,
    merchFulfillmentMode, merchShippingScope, price, productType, recoveryKey, samplePreviews,
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
    if (section.id === 'assets' && samplePreviews.some(sample => !sample.title.trim() || !sample.previewUrl.trim())) {
      setError('Each sample preview needs a name and uploaded audio.');
      return;
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

    const priceNumber = Number(price || '0');
    const isFree = !Number.isFinite(priceNumber) || priceNumber <= 0;
    const priceCents = isFree ? 0 : Math.round(priceNumber * 100);
    const localPriceNumber = Number(localPrice || '0');
    const localPriceCents = localPrice.trim() && Number.isFinite(localPriceNumber) ? Math.max(0, Math.round(localPriceNumber * 100)) : null;

    const updatePayload = {
      title: title.trim(),
      long_description: description.trim(),
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
      year: releaseDate ? Number(releaseDate.slice(0, 4)) : (year ? Number(year) : null),
      release_date: releaseDate || null,
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
              <SectionHeader title="Details" description="Set the core title, type, pricing, artwork, and main details for this item." />
              <div className="dashboard-form-step">
            <label className="dashboard-field"><div className="dashboard-field-label">{isMerchProduct ? 'Product Name' : 'Title'}</div><input className="os-input-field" value={title} onChange={e => setTitle(e.target.value)} /></label>

            {(section.id === 'books' || section.id === 'assets') ? (
              <label className="dashboard-field">
                <div className="dashboard-field-label">Description</div>
                <textarea className="os-input-field dashboard-textarea" value={description} onChange={event => setDescription(event.target.value)} />
              </label>
            ) : null}

              <div className="dashboard-form-grid dashboard-form-grid-3">
              <label className="dashboard-field"><div className="dashboard-field-label">{isMerchProduct ? 'Drop Year' : 'Release Date'}</div>{isMerchProduct ? <input className="os-input-field" value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} /> : <input className="os-input-field" type="date" value={releaseDate} onChange={e => { setReleaseDate(e.target.value); setYear(e.target.value.slice(0, 4)); }} />}</label>
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

            {isMusicProduct ? (
              <label className="dashboard-field">
                <div className="dashboard-field-label">Track Count</div>
                <select className="os-input-field" value={trackCount} onChange={event => setTrackCount(event.target.value)}>
                  {Array.from({ length: 30 }, (_, index) => index + 1).map(count => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </label>
            ) : null}

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
                label={section.id === 'books' ? 'Book File' : 'Sample Pack ZIP'}
                folder={section.id === 'books' ? 'products/books' : 'products/assets'}
                storage="private-item"
                userId={user.id}
                value={itemFileUrl}
                accept={section.id === 'books' ? 'application/pdf,.pdf' : 'application/zip,.zip'}
                buttonLabel={section.id === 'books' ? 'Upload full PDF' : 'Upload full pack ZIP'}
                onChange={setItemFileUrl}
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
              />
            ) : null}

            {section.id === 'assets' ? <StudioSamplePreviewFields userId={user.id} samples={samplePreviews} onChange={setSamplePreviews} /> : null}

            {isMusicProduct ? (
              <section className="dashboard-form-section studio-tracks-section">
                <SectionHeader
                  title="Tracks"
                  description="Add the audio and title for each track in this release."
                />

                <div className="dashboard-list-surface studio-track-panel">
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
                </div>
              </section>
            ) : null}

            {isMusicProduct ? (
              <section className="dashboard-form-section">
                <SectionHeader title="External Links" description="Add links to this release elsewhere." action={(
                  <button type="button" role="switch" aria-checked={externalLinksEnabled} className={externalLinksEnabled ? 'settings-toggle settings-toggle-on' : 'settings-toggle'} onClick={() => setExternalLinksEnabled(enabled => !enabled)} />
                )} />
                {externalLinksEnabled && <div className="dashboard-list-surface studio-feature-panel"><ExternalLinksEditor links={externalLinks} platforms={externalLinkPlatforms} onChange={setExternalLinks} /></div>}
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
                <Link className="os-button os-button-secondary" href={section.href} onClick={() => clearStudioFormRecovery(recoveryKey)}>Cancel</Link>
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
