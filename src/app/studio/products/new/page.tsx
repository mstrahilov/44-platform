'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell, HubHero, CenteredMessage, SectionHeader } from '@/components/Ui';
import { useTopbarBack } from '@/components/TopbarContext';
import { AUDIO_UPLOAD_ACCEPT, UploadField } from '@/components/UploadField';
import { TagMultiSelect } from '@/components/TagMultiSelect';
import {
  StudioReleaseFeatures,
  createReleaseFeatureState,
  normalizeFeatureStateForSection,
  saveReleaseFeatures,
} from '@/components/StudioReleaseFeatures';
import { useAuth } from '@/lib/useAuth';
import type { ProductCategory } from '@/lib/platform';
import { currencyForCountry, type MarketMode } from '@/lib/marketPreferences';
import { getStudioDisplayName, isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { normalizeTaxonomyValue } from '@/lib/taxonomy';
import { getStudioCatalogSection, type StudioCatalogSectionId } from '@/lib/studioCatalog';
import { addStudioAssets, addStudioTracks, attachStudioAudioAssets, attestStudioItemRights, createStudioItem, isPublishingReviewRequired, listCatalogTaxonomy, listItemCategories, replaceStudioItemTaxonomy, setStudioPublicationStatus, submitStudioItemForReview } from '@/lib/domain/studioPublishing';
import { audioPipelineEnabled } from '@/lib/audioUploads';
import type { Database } from '@/lib/database.types';
import { ExternalLinksEditor } from '@/components/ExternalLinksEditor';
import { activeExternalLinkDrafts, listExternalLinkPlatforms, materializeExternalLinkDrafts, replaceOwnedItemExternalLinks, validateExternalLinkDrafts, type ExternalLinkDraft, type ExternalLinkPlatform } from '@/lib/domain/externalLinks';
import { saveStudioBookContent, replaceStudioSampleFiles } from '@/lib/domain/nativeContent';
import { StudioSamplePreviewFields, type DraftSamplePreview } from '@/components/StudioNativeContentFields';
import { Ui44CheckboxInput, Ui44SelectInput, Ui44TextInput, Ui44Textarea } from '@/components/ui44/Inputs';
import { clearStudioFormRecovery, readStudioFormRecovery, writeStudioFormRecovery } from '@/lib/studioFormRecovery';
import { loadCreatorPaidSalesState, type CreatorPaidSalesState } from '@/lib/domain/creatorCommerce';
import { normalizeOptionalReleaseDate, releaseYear } from '@/lib/releaseDates';
import { StudioDigitalPricingFields, StudioPriceInput } from '@/components/StudioPricingFields';

function buildSlug(title: string) {
  const base = normalizeTaxonomyValue(title) || 'item';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

type DraftTrack = {
  title: string;
  durationSeconds: string;
  audioUrl: string;
  audioAssetId?: string;
};

type NewItemRecovery = {
  title: string; description: string; categoryId: string; productType: string; storeTypeId: string;
  selectedTagIds: string[]; price: string; marketMode: MarketMode; localPrice: string; localCurrency: string;
  availability?: 'free' | 'paid';
  merchFulfillmentMode: 'ship' | 'deliver'; merchShippingScope: 'local' | 'global'; coverUrl: string;
  galleryUrls: string[]; itemFileUrl: string; samplePreviews: DraftSamplePreview[]; year: string; releaseDate?: string;
  trackCount: string; tracks: DraftTrack[]; featureState: ReturnType<typeof createReleaseFeatureState>;
  externalLinks: ExternalLinkDraft[]; externalLinksEnabled?: boolean; rightsConfirmed: boolean;
};

function createDraftTrack(): DraftTrack {
  return {
    title: '',
    durationSeconds: '',
    audioUrl: '',
    audioAssetId: '',
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
  if (sectionId === 'games') return 'game';
  if (sectionId === 'assets') return 'asset';
  return 'music';
}

function productAssetTypeForSection(sectionId: StudioCatalogSectionId) {
  if (sectionId === 'merch') return 'merch';
  if (sectionId === 'books') return 'book';
  if (sectionId === 'games') return 'webgl';
  if (sectionId === 'assets') return 'sample_pack';
  return 'music';
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<PageShell><CenteredMessage status>Loading...</CenteredMessage></PageShell>}>
      <NewProductContent />
    </Suspense>
  );
}

function categoryMatchesSection(category: ProductCategory, sectionId: StudioCatalogSectionId) {
  const name = `${category.name} ${category.slug}`.toLowerCase();
  if (sectionId === 'merch') return name.includes('merch') || name.includes('apparel') || name.includes('shop');
  if (sectionId === 'books') return name.includes('book');
  if (sectionId === 'games') return name.includes('game') || name.includes('interactive');
  if (sectionId === 'assets') return name.includes('asset') || name.includes('sample') || name.includes('preset') || name.includes('template');
  return name.includes('music');
}

const NEW_MUSIC_ITEM_TYPE_SLUGS = new Set(['album', 'ep', 'single', 'mixtape']);

function NewProductContent() {
  const searchParams = useSearchParams();
  const section = getStudioCatalogSection(searchParams.get('section'));
  const defaultProductType = section.typeOptions[0];
  useTopbarBack({ href: section.href, label: section.label });
  const router = useRouter();
  const { user, loading } = useAuth();
  const userId = user?.id ?? '';
  const userEmail = user?.email ?? undefined;
  const recoveryKey = userId ? `new:${userId}:${section.id}` : '';
  const [profile, setProfile] = useState<StudioProfile | null>(null);
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
  const [availability, setAvailability] = useState<'free' | 'paid'>(section.id === 'assets' ? 'paid' : 'free');
  const [paidSales, setPaidSales] = useState<CreatorPaidSalesState | null>(null);
  const [marketMode, setMarketMode] = useState<MarketMode>('global');
  const [localPrice, setLocalPrice] = useState('');
  const [localCurrency, setLocalCurrency] = useState('USD');
  const [merchFulfillmentMode, setMerchFulfillmentMode] = useState<'ship' | 'deliver'>('deliver');
  const [merchShippingScope, setMerchShippingScope] = useState<'local' | 'global'>('local');
  const [coverUrl, setCoverUrl] = useState('');
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [itemFileUrl, setItemFileUrl] = useState('');
  const [samplePreviews, setSamplePreviews] = useState<DraftSamplePreview[]>([]);
  const [year, setYear] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [trackCount, setTrackCount] = useState('');
  const [tracks, setTracks] = useState<DraftTrack[]>([]);
  const [featureState, setFeatureState] = useState(() => createReleaseFeatureState(section.id));
  const [externalLinks, setExternalLinks] = useState<ExternalLinkDraft[]>([]);
  const [externalLinksEnabled, setExternalLinksEnabled] = useState(false);
  const [externalLinkPlatforms, setExternalLinkPlatforms] = useState<ExternalLinkPlatform[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeUploadCount, setActiveUploadCount] = useState(0);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [formRecoveryReady, setFormRecoveryReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, router, user]);

  useEffect(() => {
    async function loadFormData() {
      if (!userId) return;

      const [categoryRows, profileResult, taxonomy, linkPlatforms, paidSalesResult] = await Promise.all([
        listItemCategories(),
        loadStudioProfile(userId),
        listCatalogTaxonomy(),
        listExternalLinkPlatforms('item'),
        loadCreatorPaidSalesState(userId),
      ]);

      const resolvedCategories = categoryRows;
      const resolvedCategoryId = resolvedCategories.find(category => categoryMatchesSection(category, section.id))?.id ?? resolvedCategories[0]?.id ?? '';
      const implicitSectionType = section.id === 'assets'
        ? taxonomy.types.find(type => type.category_id === resolvedCategoryId && type.is_active && type.slug === 'sample-packs')
          ?? taxonomy.types.find(type => type.category_id === resolvedCategoryId && type.is_active)
        : section.id === 'games'
          ? taxonomy.types.find(type => type.category_id === resolvedCategoryId && type.is_active && type.slug === 'game')
            ?? taxonomy.types.find(type => type.category_id === resolvedCategoryId && type.is_active)
        : null;
      setCategoryId(resolvedCategoryId);

      setProfile(profileResult.profile);
      setCreatorName(getStudioDisplayName(profileResult.profile, userEmail));
      const nextCurrency = currencyForCountry(
        profileResult.profile?.country_code || profileResult.profile?.home_country_code,
      );
      setLocalCurrency(nextCurrency);
      setTaxonomyTypes(taxonomy.types);
      setTaxonomyTags(taxonomy.tags);
      setExternalLinkPlatforms(linkPlatforms);
      setPaidSales(paidSalesResult);
      setExternalLinks(materializeExternalLinkDrafts(linkPlatforms, []));
      setStoreTypeId(implicitSectionType?.id ?? '');
      setProductType(implicitSectionType?.label ?? (section.id === 'assets' || section.id === 'games' ? defaultProductType : ''));

      const recovered = readStudioFormRecovery<NewItemRecovery>(recoveryKey);
      if (recovered) {
        setTitle(recovered.title); setDescription(recovered.description); setCategoryId(section.id === 'assets' ? resolvedCategoryId : recovered.categoryId);
        setProductType(section.id === 'assets' ? implicitSectionType?.label ?? defaultProductType : recovered.productType || (section.id === 'games' ? implicitSectionType?.label ?? defaultProductType : ''));
        setStoreTypeId(section.id === 'assets' ? implicitSectionType?.id ?? '' : recovered.storeTypeId || (section.id === 'games' ? implicitSectionType?.id ?? '' : ''));
        setSelectedTagIds(section.id === 'assets' ? [] : recovered.selectedTagIds);
        setPrice(recovered.price); setAvailability(section.id === 'assets' ? 'paid' : recovered.availability ?? 'free'); setMarketMode(recovered.marketMode);
        setLocalPrice(recovered.localCurrency === nextCurrency ? recovered.localPrice : '');
        setMerchFulfillmentMode(recovered.merchFulfillmentMode);
        setMerchShippingScope(recovered.merchShippingScope); setCoverUrl(recovered.coverUrl);
        setGalleryUrls(recovered.galleryUrls); setItemFileUrl(recovered.itemFileUrl);
        setSamplePreviews(recovered.samplePreviews); setYear(recovered.year); setReleaseDate(recovered.releaseDate ?? (recovered.year ? `${recovered.year}-01-01` : ''));
        setTrackCount(recovered.trackCount); setTracks(recovered.tracks); setFeatureState(recovered.featureState);
        setExternalLinks(recovered.externalLinks); setExternalLinksEnabled(recovered.externalLinksEnabled ?? false); setRightsConfirmed(recovered.rightsConfirmed);
      }
      setFormRecoveryReady(true);
    }

    loadFormData();
  }, [defaultProductType, recoveryKey, section.id, userEmail, userId]);

  useEffect(() => {
    if (!formRecoveryReady || !recoveryKey) return;
    writeStudioFormRecovery(recoveryKey, {
      title, description, categoryId, productType, storeTypeId, selectedTagIds, price, availability, marketMode,
      localPrice, localCurrency, merchFulfillmentMode, merchShippingScope, coverUrl, galleryUrls,
      itemFileUrl, samplePreviews,
      year, releaseDate, trackCount, tracks, featureState, externalLinks, externalLinksEnabled, rightsConfirmed,
    } satisfies NewItemRecovery);
  }, [categoryId, coverUrl, description, externalLinks, externalLinksEnabled, featureState, formRecoveryReady,
    galleryUrls, itemFileUrl, localCurrency, localPrice,
    marketMode, merchFulfillmentMode, merchShippingScope, price, availability, productType, recoveryKey, rightsConfirmed,
    samplePreviews, selectedTagIds, storeTypeId, title, trackCount, tracks, year, releaseDate]);

  const isMusicProduct = section.id === 'music';
  const isGameProduct = section.id === 'games';
  const isMerchProduct = section.id === 'merch';
  const needsDigitalFile = section.id === 'books' || section.id === 'games' || section.id === 'assets';
  const merchUsesLocalOnlyPricing = isMerchProduct && (merchFulfillmentMode === 'deliver' || merchShippingScope === 'local');
  const creatorCommerceUnavailable = !isMerchProduct && !isGameProduct && !paidSales?.can_sell_paid;

  useEffect(() => {
    if (profile && isMerchProduct && profile.role !== 'admin') router.replace('/studio');
  }, [isMerchProduct, profile, router]);

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
      setError('Wait for every file upload to finish before publishing.');
      return;
    }
    if (isMerchProduct && profile?.role !== 'admin') {
      setError('Merch publishing is currently limited to 44 administrators.');
      return;
    }

    const cleanTitle = title.trim();
    const cleanType = productType.trim();
    const normalizedReleaseDate = normalizeOptionalReleaseDate(releaseDate);

    if (!cleanTitle || !categoryId || (!isGameProduct && (!cleanType || !storeTypeId))) {
      setError('Please fill out the title and choose an Item Type.');
      return;
    }
    if (isMusicProduct && !normalizedReleaseDate) {
      setError('Choose a valid release date.');
      return;
    }
    if (!coverUrl.trim()) {
      setError(`Upload ${isMerchProduct ? 'a product image' : 'artwork'} before publishing.`);
      return;
    }
    if (isMusicProduct && !trackCount) {
      setError('Choose a total track count.');
      return;
    }
    if (!rightsConfirmed) {
      setError('Confirm that you own this work or have permission to publish it.');
      return;
    }

    const visibleTracks = tracks.slice(0, Number(trackCount || '0')).map(track => ({
      ...track,
      title: track.title.trim(),
    }));
    if (isMusicProduct) {
      const hasInvalidTrack = visibleTracks.some(track => !track.title.trim() || !track.audioUrl.trim());
      if (!visibleTracks.length || hasInvalidTrack) {
        setError('Music releases need track titles and uploaded audio for each track.');
        return;
      }
      if (audioPipelineEnabled() && visibleTracks.some(track => !track.audioAssetId)) {
        setError('Re-upload each track so 44 can prepare its streaming copy before publishing.');
        return;
      }
    }
    if (needsDigitalFile && !itemFileUrl.trim()) {
      setError(section.id === 'books'
        ? 'Books need an uploaded file before saving.'
        : isGameProduct
          ? 'Games need a Unity WebGL export ZIP before submitting.'
          : 'Sample packs need an uploaded file before saving.');
      return;
    }
    if (section.id === 'assets' && samplePreviews.some(sample => !sample.title.trim() || !sample.previewUrl.trim())) {
      setError('Each sample preview needs a name and uploaded audio.');
      return;
    }
    if (isMusicProduct) {
      const linkError = externalLinksEnabled ? validateExternalLinkDrafts(externalLinks, externalLinkPlatforms) : '';
      if (linkError) {
        setError(linkError);
        return;
      }
    }

    setSaving(true);
    setError('');

    if (section.id === 'assets' && creatorCommerceUnavailable) {
      setSaving(false);
      setError('Paid downloads are not available for this account, so a Sample Pack cannot be published yet.');
      return;
    }

    const priceNumber = Number(price || '0');
    const localPriceNumber = Number(localPrice || '0');
    const enteredLocalPriceCents = localPrice.trim() && Number.isFinite(localPriceNumber)
      ? Math.max(0, Math.round(localPriceNumber * 100))
      : null;
    const requiresGlobalPrice = isGameProduct ? false : isMerchProduct ? !merchUsesLocalOnlyPricing : !creatorCommerceUnavailable && availability === 'paid';
    const requiresLocalPrice = isMerchProduct
      ? merchUsesLocalOnlyPricing || marketMode === 'global_plus_local'
      : !isGameProduct && !creatorCommerceUnavailable && availability === 'paid' && marketMode === 'global_plus_local';
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
    const isFree = isGameProduct ? true : isMerchProduct ? false : creatorCommerceUnavailable || availability === 'free';
    const priceCents = isFree || merchUsesLocalOnlyPricing ? 0 : Math.round(priceNumber * 100);
    const localPriceCents = requiresLocalPrice ? enteredLocalPriceCents : null;
    const slug = buildSlug(cleanTitle);
    const sortOrder = Date.now();
    const insertPayload = {
      author_id: profile?.id ?? user.id,
      item_category_id: categoryId,
      slug,
      title: cleanTitle,
      creator: creatorName,
      item_type: cleanType,
      short_description: null,
      long_description: description.trim(),
      price_cents: merchUsesLocalOnlyPricing ? 0 : priceCents,
      market_mode: isFree ? 'global' : (merchUsesLocalOnlyPricing ? 'global_plus_local' : marketMode),
      local_price_cents: isFree || (marketMode === 'global' && !merchUsesLocalOnlyPricing) ? null : localPriceCents,
      local_currency: isFree || (marketMode === 'global' && !merchUsesLocalOnlyPricing) ? null : localCurrency,
      available_locally_only: isMerchProduct ? merchUsesLocalOnlyPricing : false,
      is_free: isFree,
      streaming_enabled: isMusicProduct ? true : isGameProduct ? false : undefined,
      download_purchase_enabled: !isMerchProduct ? (isGameProduct ? false : !isFree) : undefined,
      cover_url: coverUrl.trim() || null,
      hero_url: null,
      experience_type: experienceTypeForSection(section.id),
      fulfillment_type: isMerchProduct ? 'physical' : 'digital',
      merch_fulfillment_mode: isMerchProduct ? merchFulfillmentMode : null,
      merch_shipping_scope: isMerchProduct ? (merchFulfillmentMode === 'deliver' ? 'local' : merchShippingScope) : null,
      read_url: null,
      download_url: null,
      featured: false,
      status: 'draft' as const,
      year: releaseYear(normalizedReleaseDate, year),
      release_date: normalizedReleaseDate,
      sort_order: sortOrder,
    };

    let insertedProductId: string;
    try {
      insertedProductId = await createStudioItem(insertPayload);
      await attestStudioItemRights(insertedProductId);
    } catch (insertError) {
      setSaving(false);
      setError(insertError instanceof Error ? insertError.message : 'Could not create this Item.');
      return;
    }

    try {
      await replaceStudioItemTaxonomy(insertedProductId, storeTypeId, selectedTagIds);
    } catch (taxonomyError) {
      setSaving(false);
      setError(taxonomyError instanceof Error ? taxonomyError.message : 'Could not save Browse taxonomy.');
      return;
    }

    if (isMusicProduct) {
      const trackRows = visibleTracks.map((track, index) => ({
        item_id: insertedProductId,
        number: index + 1,
        title: track.title.trim(),
        duration_seconds: track.durationSeconds ? Number(track.durationSeconds) : null,
        audio_url: track.audioUrl.trim(),
        download_url: null,
      }));

      try {
        const insertedTracks = await addStudioTracks(trackRows);
        const audioAttachments = visibleTracks.flatMap((track, index) => {
          const insertedTrack = insertedTracks.find(row => row.number === index + 1);
          return track.audioAssetId && insertedTrack ? [{ assetId: track.audioAssetId, trackId: insertedTrack.id }] : [];
        });
        await attachStudioAudioAssets(audioAttachments);
      } catch (trackInsertError) {
        setSaving(false);
        setError(trackInsertError instanceof Error ? trackInsertError.message : 'Could not save tracks.');
        return;
      }
    }

    if (needsDigitalFile) {
      try {
        const insertedAssets = await addStudioAssets([{
        item_id: insertedProductId,
        asset_type: productAssetTypeForSection(section.id),
        title: cleanType || cleanTitle,
        file_url: null,
        storage_path: itemFileUrl.trim(),
        is_downloadable: !isGameProduct,
        sort_order: 0,
        }]);
        const fullAsset = insertedAssets[0];
        if (!fullAsset) throw new Error('The protected Item file was not recorded.');
        if (section.id === 'books') {
          await saveStudioBookContent({
            itemId: insertedProductId,
            fileAssetId: fullAsset.id,
            previewUrl: null,
            totalPages: null,
            samplePageLimit: null,
            languageCode: null,
          });
        } else if (section.id === 'assets') {
          await replaceStudioSampleFiles(insertedProductId, samplePreviews.map(sample => ({
            title: sample.title.trim(), previewUrl: sample.previewUrl.trim() || null,
            durationSeconds: sample.durationSeconds, waveformPeaks: sample.waveformPeaks,
            mimeType: sample.mimeType, fileSizeBytes: sample.fileSizeBytes,
          })));
        }
      } catch (assetInsertError) {
        setSaving(false);
        setError(assetInsertError instanceof Error ? assetInsertError.message : 'Could not save the digital file.');
        return;
      }
    }

    if (isMerchProduct && galleryUrls.length > 0) {
      try {
        await addStudioAssets(galleryUrls.map((url, index) => ({
          item_id: insertedProductId,
          asset_type: 'gallery_image',
          title: `Gallery Image ${index + 1}`,
          file_url: url,
          storage_path: null,
          is_downloadable: false,
          sort_order: index,
        })));
      } catch (galleryInsertError) {
        setSaving(false);
        setError(galleryInsertError instanceof Error ? galleryInsertError.message : 'Could not save gallery images.');
        return;
      }
    }

    if (section.id === 'music') {
      const featureError = await saveReleaseFeatures({
        productId: insertedProductId,
        sectionId: section.id,
        state: featureState,
      });

      if (featureError) {
        setSaving(false);
        setError(featureError);
        return;
      }
      try {
        await replaceOwnedItemExternalLinks(insertedProductId, externalLinksEnabled ? activeExternalLinkDrafts(externalLinks) : []);
      } catch (linkSaveError) {
        setSaving(false);
        setError(linkSaveError instanceof Error ? linkSaveError.message : 'Could not save release links.');
        return;
      }
    }

    let reviewRequired = false;
    try {
      reviewRequired = await isPublishingReviewRequired();
      if (isGameProduct && reviewRequired) {
        await submitStudioItemForReview(insertedProductId, crypto.randomUUID());
      } else if (isGameProduct) {
        // Games remain private drafts until 44OS has inspected the ZIP, hosted
        // the unpacked WebGL export on the isolated origin, and approved its
        // interactive build manifest.
      } else if (reviewRequired) {
        await submitStudioItemForReview(insertedProductId, crypto.randomUUID());
      } else {
        await setStudioPublicationStatus(insertedProductId, 'published');
      }
    } catch (publicationError) {
      setSaving(false);
      setError(publicationError instanceof Error ? publicationError.message : (typeof publicationError === 'object' && publicationError && 'message' in publicationError ? String(publicationError.message) : 'This Item is not ready to publish.'));
      return;
    }

    setSaving(false);
    clearStudioFormRecovery(recoveryKey);
    const resultStatus = isGameProduct ? 'game-submitted' : reviewRequired ? 'submitted' : 'published';
    const resultHash = section.id === 'assets' ? 'sample-packs' : section.id;
    router.push(`/studio?studioStatus=${resultStatus}#${resultHash}`);
  }

  if (loading || !user) {
    return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>;
  }
  return (
    <PageShell>
      <div className="dashboard-editor">
        <HubHero
          title={section.createTitle}
          copy={section.createCopy}
        />

        <div className="dashboard-section">
          <form onSubmit={handleSubmit} className="dashboard-form">
            <section className="dashboard-form-section">
              <SectionHeader title="Details" description="Set the core title, type, artwork, and main details for this item." />

              <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">

              <label className="dashboard-field">
                <div className="dashboard-field-label">{isMerchProduct ? 'Product Name' : 'Title'}</div>
                <Ui44TextInput
                  className="os-input-field"
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  placeholder={isMerchProduct ? 'Enter product name' : section.id === 'books' ? 'Enter book title' : isGameProduct ? 'Enter game title' : section.id === 'assets' ? 'Enter sample pack title' : 'Enter release title'}
                />
              </label>

              {isMusicProduct ? (
                <div className="dashboard-form-grid dashboard-form-grid-3 release-core-grid ui44-form-grid">
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Item Type</div>
                    <Ui44SelectInput required value={storeTypeId} onChange={event => {
                      setStoreTypeId(event.target.value);
                      setProductType(taxonomyTypes.find(type => type.id === event.target.value)?.label ?? '');
                      setSelectedTagIds([]);
                    }}>
                      <option value="">Select item type</option>
                      {taxonomyTypes.filter(type => type.category_id === categoryId && NEW_MUSIC_ITEM_TYPE_SLUGS.has(type.slug)).map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                    </Ui44SelectInput>
                  </label>
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Release Date</div>
                    <Ui44TextInput required className="os-input-field release-date-input" type="date" value={releaseDate} onChange={event => { setReleaseDate(event.target.value); setYear(event.target.value.slice(0, 4)); }} />
                  </label>
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Track Count</div>
                    <Ui44SelectInput required value={trackCount} onChange={event => setTrackCount(event.target.value)}>
                      <option value="">Select total tracks</option>
                      {Array.from({ length: 30 }, (_, index) => index + 1).map(count => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </Ui44SelectInput>
                  </label>
                </div>
              ) : isGameProduct ? (
                <div className="dashboard-form-grid dashboard-form-grid-2 release-core-grid ui44-form-grid">
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Item Type</div>
                    <Ui44TextInput className="os-input-field" value={productType || 'Game'} readOnly aria-label="Item Type" />
                  </label>
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Release Date (Optional)</div>
                    <Ui44TextInput className="os-input-field release-date-input" type="date" value={releaseDate} onChange={event => { setReleaseDate(event.target.value); setYear(event.target.value.slice(0, 4)); }} />
                  </label>
                </div>
              ) : section.id === 'books' ? (
                <div className="dashboard-form-grid dashboard-form-grid-2 release-core-grid ui44-form-grid">
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Item Type</div>
                    <Ui44SelectInput value={storeTypeId} onChange={event => {
                      setStoreTypeId(event.target.value);
                      setProductType(taxonomyTypes.find(type => type.id === event.target.value)?.label ?? '');
                      setSelectedTagIds([]);
                    }}>
                      <option value="">Select item type</option>
                      {taxonomyTypes.filter(type => type.category_id === categoryId).map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                    </Ui44SelectInput>
                  </label>
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Release Date (Optional)</div>
                    <Ui44TextInput className="os-input-field release-date-input" type="date" value={releaseDate} onChange={event => { setReleaseDate(event.target.value); setYear(event.target.value.slice(0, 4)); }} />
                  </label>
                </div>
              ) : isMerchProduct ? (
                <div className="dashboard-form-grid dashboard-form-grid-3 ui44-form-grid">
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Drop Year</div>
                    <Ui44TextInput className="os-input-field" value={year} onChange={event => setYear(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))} placeholder="Enter release year" />
                  </label>
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Item Type</div>
                    <Ui44SelectInput value={storeTypeId} onChange={event => {
                      setStoreTypeId(event.target.value);
                      setProductType(taxonomyTypes.find(type => type.id === event.target.value)?.label ?? '');
                      setSelectedTagIds([]);
                    }}>
                      <option value="">Select item type</option>
                      {taxonomyTypes.filter(type => type.category_id === categoryId).map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                    </Ui44SelectInput>
                  </label>
                </div>
              ) : null}

              {section.id !== 'assets' ? <div className="dashboard-field">
                <div className="dashboard-field-label">Item Tags</div>
                <TagMultiSelect options={taxonomyTags.filter(tag => tag.category_id === categoryId && (!tag.item_type_id || tag.item_type_id === storeTypeId))} value={selectedTagIds} onChange={setSelectedTagIds} />
                <span className="dashboard-form-note">Optional. Select any approved genre, style, or format tags that apply.</span>
              </div> : null}

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

              {isGameProduct ? (
                <div className="dashboard-status ui44-status" role="note">
                  Games are desktop-only and free during this private submission phase. Upload one ZIP containing the complete Unity WebGL export; 44OS will inspect, unpack, and host it before the Item can go live.
                </div>
              ) : !isMerchProduct ? (
                <>
                  <StudioDigitalPricingFields
                    availability={availability}
                    marketMode={marketMode}
                    globalPrice={price}
                    localPrice={localPrice}
                    localCurrency={localCurrency}
                    disabled={creatorCommerceUnavailable}
                    noticeId="creator-commerce-new-item-notice"
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
                </>
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

              {(section.id === 'books' || section.id === 'games' || section.id === 'assets') ? (
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Description</div>
                  <Ui44Textarea className="os-input-field dashboard-textarea" value={description} onChange={event => setDescription(event.target.value)} placeholder="Enter description" />
                </label>
              ) : null}

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

              {isMerchProduct ? (
                <div className="dashboard-field">
                  <div className="dashboard-field-label">Image Gallery</div>
                  <UploadField
                    label="Gallery Image"
                    folder="products/gallery"
                    userId={user.id}
                    value=""
                    accept="image/*"
                    previewKind="image"
                    buttonLabel="Add gallery image"
                    onChange={nextValue => {
                      if (nextValue) setGalleryUrls(current => [...current, nextValue]);
                    }}
                    onUploadingChange={handleUploadActivity}
                  />
                  {galleryUrls.length > 0 && (
                    <div className="upload-gallery">
                      {galleryUrls.map((url, index) => (
                        <div key={url} className="upload-preview upload-preview-image upload-gallery-item">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" />
                          <button
                            type="button"
                            className="upload-preview-remove"
                            aria-label={`Remove gallery image ${index + 1}`}
                            onClick={() => setGalleryUrls(current => current.filter(item => item !== url))}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {isMerchProduct ? (
                <div className="dashboard-form-section">
                  <div className="dashboard-field-label">Local Fulfillment</div>
                  <p className="dashboard-form-note">Buyers will enter a delivery address at checkout. 44 does not handle shipping logistics for merch.</p>
                </div>
              ) : needsDigitalFile ? (
                <UploadField
                label={section.id === 'books' ? 'Book File' : isGameProduct ? 'Unity WebGL Export ZIP' : 'Sample Pack ZIP'}
                folder={section.id === 'books' ? 'products/books' : isGameProduct ? 'products/games' : 'products/assets'}
                storage="private-item"
                userId={user.id}
                value={itemFileUrl}
                accept={section.id === 'books' ? 'application/pdf,.pdf' : 'application/zip,.zip'}
                buttonLabel={section.id === 'books' ? 'Upload full PDF' : isGameProduct ? 'Upload WebGL ZIP' : 'Upload full pack ZIP'}
                onChange={setItemFileUrl}
                onUploadingChange={handleUploadActivity}
                />
              ) : null}
              </div>
            </section>

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
                      <div key={`track-${index}`} className="dashboard-track-editor-row">
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
                            onAudioMetadata={durationSeconds => updateTrack(index, { durationSeconds: String(durationSeconds) })}
                            onUploadingChange={handleUploadActivity}
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

            <label className="dashboard-field">
              <span className="settings-checkbox-row studio-rights-checkbox">
                <Ui44CheckboxInput checked={rightsConfirmed} onChange={event => setRightsConfirmed(event.target.checked)} />
                <span>I confirm that I own this work or have the necessary rights and permission to publish and distribute it through 44OS.</span>
              </span>
            </label>

            {!isCreatorProfile(profile) && (
              <p className="dashboard-form-note">
                Studio publishing is available to approved creator accounts. Your fan account remains active while approval is pending.
              </p>
            )}

            <div className="dashboard-form-actions">
              <div className="dashboard-form-actions-right">
                <Link className="os-button os-button-secondary" href={section.href} onClick={() => clearStudioFormRecovery(recoveryKey)}>
                  Cancel
                </Link>
                <button className="os-button os-button-primary" type="submit" disabled={saving || activeUploadCount > 0}>
                  {activeUploadCount > 0 ? 'Uploading files…' : saving ? (isGameProduct ? 'Submitting…' : 'Publishing…') : (isGameProduct ? 'Submit Game' : 'Publish')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
