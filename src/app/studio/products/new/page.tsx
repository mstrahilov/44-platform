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
import { addStudioAssets, addStudioTracks, attestStudioItemRights, createStudioItem, isPublishingReviewRequired, listCatalogTaxonomy, listItemCategories, replaceStudioItemTaxonomy, setStudioPublicationStatus, submitStudioItemForReview } from '@/lib/domain/studioPublishing';
import type { Database } from '@/lib/database.types';
import { ExternalLinksEditor } from '@/components/ExternalLinksEditor';
import { activeExternalLinkDrafts, listExternalLinkPlatforms, materializeExternalLinkDrafts, replaceOwnedItemExternalLinks, validateExternalLinkDrafts, type ExternalLinkDraft, type ExternalLinkPlatform } from '@/lib/domain/externalLinks';
import { saveStudioBookContent, replaceStudioSampleFiles } from '@/lib/domain/nativeContent';
import { StudioBookFields, StudioSamplePreviewFields, validateStudioBookMetadata, type DraftSamplePreview } from '@/components/StudioNativeContentFields';
import { Ui44CheckboxInput, Ui44SelectInput, Ui44TextInput, Ui44Textarea } from '@/components/ui44/Inputs';
import { clearStudioFormRecovery, readStudioFormRecovery, writeStudioFormRecovery } from '@/lib/studioFormRecovery';
import { creatorPaidSalesMessage, loadCreatorPaidSalesState, type CreatorPaidSalesState } from '@/lib/domain/creatorCommerce';
import { normalizeOptionalReleaseDate, releaseYear } from '@/lib/releaseDates';

function buildSlug(title: string) {
  const base = normalizeTaxonomyValue(title) || 'item';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

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
  title: string;
  durationSeconds: string;
  audioUrl: string;
};

type NewItemRecovery = {
  title: string; description: string; categoryId: string; productType: string; storeTypeId: string;
  selectedTagIds: string[]; price: string; marketMode: MarketMode; localPrice: string; localCurrency: string;
  availability?: 'free' | 'paid';
  merchFulfillmentMode: 'ship' | 'deliver'; merchShippingScope: 'local' | 'global'; coverUrl: string;
  galleryUrls: string[]; itemFileUrl: string; bookPreviewUrl: string; bookTotalPages: string;
  bookSamplePages: string; bookLanguage: string; samplePreviews: DraftSamplePreview[]; year: string; releaseDate?: string;
  trackCount: string; tracks: DraftTrack[]; featureState: ReturnType<typeof createReleaseFeatureState>;
  externalLinks: ExternalLinkDraft[]; externalLinksEnabled?: boolean; rightsConfirmed: boolean;
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
  if (sectionId === 'assets') return name.includes('asset') || name.includes('sample') || name.includes('preset') || name.includes('template');
  return name.includes('music');
}

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
  const [availability, setAvailability] = useState<'free' | 'paid'>('free');
  const [paidSales, setPaidSales] = useState<CreatorPaidSalesState | null>(null);
  const [marketMode, setMarketMode] = useState<MarketMode>('global');
  const [localPrice, setLocalPrice] = useState('');
  const [localCurrency, setLocalCurrency] = useState('USD');
  const [merchFulfillmentMode, setMerchFulfillmentMode] = useState<'ship' | 'deliver'>('deliver');
  const [merchShippingScope, setMerchShippingScope] = useState<'local' | 'global'>('local');
  const [coverUrl, setCoverUrl] = useState('');
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [itemFileUrl, setItemFileUrl] = useState('');
  const [bookPreviewUrl, setBookPreviewUrl] = useState('');
  const [bookTotalPages, setBookTotalPages] = useState('');
  const [bookSamplePages, setBookSamplePages] = useState('');
  const [bookLanguage, setBookLanguage] = useState('');
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
      setCategoryId(resolvedCategories.find(category => categoryMatchesSection(category, section.id))?.id ?? resolvedCategories[0]?.id ?? '');

      setProfile(profileResult.profile);
      setCreatorName(getStudioDisplayName(profileResult.profile, userEmail));
      const nextCurrency =
        profileResult.profile?.display_currency ||
        currencyForCountry(profileResult.profile?.country_code) ||
        profileResult.profile?.home_currency ||
        currencyForCountry(profileResult.profile?.home_country_code);
      setLocalCurrency(nextCurrency);
      setTaxonomyTypes(taxonomy.types);
      setTaxonomyTags(taxonomy.tags);
      setExternalLinkPlatforms(linkPlatforms);
      setPaidSales(paidSalesResult);
      setExternalLinks(materializeExternalLinkDrafts(linkPlatforms, []));
      setStoreTypeId('');
      setProductType('');

      const recovered = readStudioFormRecovery<NewItemRecovery>(recoveryKey);
      if (recovered) {
        setTitle(recovered.title); setDescription(recovered.description); setCategoryId(recovered.categoryId);
        setProductType(recovered.productType); setStoreTypeId(recovered.storeTypeId); setSelectedTagIds(recovered.selectedTagIds);
        setPrice(recovered.price); setAvailability(recovered.availability ?? 'free'); setMarketMode(recovered.marketMode); setLocalPrice(recovered.localPrice);
        setLocalCurrency(recovered.localCurrency); setMerchFulfillmentMode(recovered.merchFulfillmentMode);
        setMerchShippingScope(recovered.merchShippingScope); setCoverUrl(recovered.coverUrl);
        setGalleryUrls(recovered.galleryUrls); setItemFileUrl(recovered.itemFileUrl); setBookPreviewUrl(recovered.bookPreviewUrl);
        setBookTotalPages(recovered.bookTotalPages); setBookSamplePages(recovered.bookSamplePages);
        setBookLanguage(recovered.bookLanguage); setSamplePreviews(recovered.samplePreviews); setYear(recovered.year); setReleaseDate(recovered.releaseDate ?? (recovered.year ? `${recovered.year}-01-01` : ''));
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
      itemFileUrl, bookPreviewUrl, bookTotalPages, bookSamplePages, bookLanguage, samplePreviews,
      year, releaseDate, trackCount, tracks, featureState, externalLinks, externalLinksEnabled, rightsConfirmed,
    } satisfies NewItemRecovery);
  }, [bookLanguage, bookPreviewUrl, bookSamplePages, bookTotalPages, categoryId, coverUrl, description,
    externalLinks, externalLinksEnabled, featureState, formRecoveryReady, galleryUrls, itemFileUrl, localCurrency, localPrice,
    marketMode, merchFulfillmentMode, merchShippingScope, price, availability, productType, recoveryKey, rightsConfirmed,
    samplePreviews, selectedTagIds, storeTypeId, title, trackCount, tracks, year, releaseDate]);

  const isMusicProduct = section.id === 'music';
  const isMerchProduct = section.id === 'merch';
  const needsDigitalFile = section.id === 'books' || section.id === 'assets';
  const merchUsesLocalOnlyPricing = isMerchProduct && (merchFulfillmentMode === 'deliver' || merchShippingScope === 'local');
  const creatorCommerceUnavailable = !isMerchProduct && !paidSales?.can_sell_paid;

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

    if (!cleanTitle || !categoryId || !cleanType || !storeTypeId) {
      setError('Please fill out the title and choose an Item Type.');
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
    if (isMusicProduct) {
      const linkError = externalLinksEnabled ? validateExternalLinkDrafts(externalLinks, externalLinkPlatforms) : '';
      if (linkError) {
        setError(linkError);
        return;
      }
    }

    setSaving(true);
    setError('');

    const priceNumber = creatorCommerceUnavailable || availability === 'free' ? 0 : Number(price || '0');
    if (!creatorCommerceUnavailable && availability === 'paid' && (!Number.isFinite(priceNumber) || priceNumber <= 0)) {
      setSaving(false);
      setError('Enter a price greater than zero for a paid Item.');
      return;
    }
    const isFree = creatorCommerceUnavailable || availability === 'free' || !Number.isFinite(priceNumber) || priceNumber <= 0;
    const priceCents = isFree ? 0 : Math.round(priceNumber * 100);
    const localPriceNumber = Number(localPrice || '0');
    const localPriceCents = localPrice.trim() && Number.isFinite(localPriceNumber) ? Math.max(0, Math.round(localPriceNumber * 100)) : null;
    const slug = buildSlug(cleanTitle);
    const sortOrder = Date.now();
    const normalizedReleaseDate = normalizeOptionalReleaseDate(releaseDate);

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
      market_mode: isMerchProduct ? (merchUsesLocalOnlyPricing ? 'global_plus_local' : marketMode) : 'global',
      local_price_cents: isMerchProduct ? (localPriceCents ?? priceCents) : null,
      local_currency: isMerchProduct ? localCurrency : null,
      available_locally_only: isMerchProduct ? merchUsesLocalOnlyPricing : false,
      is_free: isFree,
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
        await addStudioTracks(trackRows);
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
        is_downloadable: true,
        sort_order: 0,
        }]);
        const fullAsset = insertedAssets[0];
        if (!fullAsset) throw new Error('The protected Item file was not recorded.');
        if (section.id === 'books') {
          await saveStudioBookContent({
            itemId: insertedProductId,
            fileAssetId: fullAsset.id,
            previewUrl: bookPreviewUrl.trim() || null,
            totalPages: bookTotalPages ? Number(bookTotalPages) : null,
            samplePageLimit: bookSamplePages ? Number(bookSamplePages) : null,
            languageCode: bookLanguage.trim() || null,
          });
        } else {
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
      if (reviewRequired) {
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
    router.push(`${section.href}?studioStatus=${reviewRequired ? 'submitted' : 'published'}`);
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
              <SectionHeader title="Details" description="Set the core title, type, availability, artwork, and main details for this item." />

              <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">

              <label className="dashboard-field">
                <div className="dashboard-field-label">{isMerchProduct ? 'Product Name' : 'Title'}</div>
                <Ui44TextInput
                  className="os-input-field"
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  placeholder={isMerchProduct ? 'Enter product name' : section.id === 'books' ? 'Enter book title' : section.id === 'assets' ? 'Enter sample pack title' : 'Enter release title'}
                />
              </label>

              {isMusicProduct ? (
                <div className="dashboard-form-grid dashboard-form-grid-3 release-core-grid ui44-form-grid">
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
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Track Count</div>
                    <Ui44SelectInput value={trackCount} onChange={event => setTrackCount(event.target.value)}>
                      <option value="">Select total tracks</option>
                      {Array.from({ length: 30 }, (_, index) => index + 1).map(count => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </Ui44SelectInput>
                  </label>
                </div>
              ) : !isMerchProduct ? (
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
              ) : (
                <div className="dashboard-form-grid dashboard-form-grid-3 ui44-form-grid">
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Drop Year</div>
                    <Ui44TextInput className="os-input-field" value={year} onChange={event => setYear(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))} placeholder="Enter release year" />
                  </label>
                  {!merchUsesLocalOnlyPricing ? (
                    <label className="dashboard-field">
                      <div className="dashboard-field-label">Global Price</div>
                      <span className="dashboard-price-input">
                        <span>{currencySymbol('USD')}</span>
                        <Ui44TextInput className="os-input-field" value={price} onChange={event => setPrice(formatPriceInput(event.target.value))} />
                      </span>
                    </label>
                  ) : null}
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
                  <div className="ui44-segmented settings-segment" role="radiogroup" aria-label="Merch fulfillment">
                    <button
                      type="button"
                      className={merchFulfillmentMode === 'ship' ? 'ui44-segmented-item ui44-segmented-item-active settings-segment-item settings-segment-item-active' : 'ui44-segmented-item settings-segment-item'}
                      role="radio"
                      aria-checked={merchFulfillmentMode === 'ship'}
                      onClick={() => setMerchFulfillmentMode('ship')}
                    >
                      Ship to Customer
                    </button>
                    <button
                      type="button"
                      className={merchFulfillmentMode === 'deliver' ? 'ui44-segmented-item ui44-segmented-item-active settings-segment-item settings-segment-item-active' : 'ui44-segmented-item settings-segment-item'}
                      role="radio"
                      aria-checked={merchFulfillmentMode === 'deliver'}
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
                  <div className="ui44-segmented settings-segment" role="radiogroup" aria-label="Merch shipping area">
                    <button
                      type="button"
                      className={merchShippingScope === 'global' ? 'ui44-segmented-item ui44-segmented-item-active settings-segment-item settings-segment-item-active' : 'ui44-segmented-item settings-segment-item'}
                      role="radio"
                      aria-checked={merchShippingScope === 'global'}
                      onClick={() => setMerchShippingScope('global')}
                    >
                      Global Shipping
                    </button>
                    <button
                      type="button"
                      className={merchShippingScope === 'local' ? 'ui44-segmented-item ui44-segmented-item-active settings-segment-item settings-segment-item-active' : 'ui44-segmented-item settings-segment-item'}
                      role="radio"
                      aria-checked={merchShippingScope === 'local'}
                      onClick={() => setMerchShippingScope('local')}
                    >
                      Local Shipping Only
                    </button>
                  </div>
                </div>
              ) : null}

              {!isMerchProduct ? (
                <>
                  <div className="dashboard-form-grid release-market-grid dashboard-form-grid-2">
                    <label className="dashboard-field">
                      <div className="dashboard-field-label">Availability</div>
                      <Ui44SelectInput value={creatorCommerceUnavailable ? 'free' : availability} disabled={creatorCommerceUnavailable} onChange={event => setAvailability(event.target.value as 'free' | 'paid')} aria-describedby="creator-commerce-new-item-notice">
                        <option value="free">Free</option>
                        <option value="paid">Paid download</option>
                      </Ui44SelectInput>
                    </label>
                    <label className="dashboard-field">
                      <div className="dashboard-field-label">Price</div>
                      <span className="dashboard-price-input">
                        <span>{currencySymbol('USD')}</span>
                        <Ui44TextInput className="os-input-field" value={creatorCommerceUnavailable || availability === 'free' ? '0.00' : price} disabled={creatorCommerceUnavailable || availability === 'free'} onChange={event => setPrice(formatPriceInput(event.target.value))} aria-describedby="creator-commerce-new-item-notice" />
                      </span>
                    </label>
                  </div>
                  <div id="creator-commerce-new-item-notice" className="dashboard-status ui44-status" role="status">
                    <strong>{paidSales?.can_sell_paid ? 'Creator payouts enabled.' : 'Creator payouts unavailable.'}</strong> {creatorPaidSalesMessage(paidSales)}
                  </div>
                </>
              ) : (
                <div className="dashboard-form-grid dashboard-form-grid-3 ui44-form-grid">
                  {merchUsesLocalOnlyPricing ? (
                      <label className="dashboard-field">
                        <div className="dashboard-field-label">Price ({localCurrency})</div>
                        <span className="dashboard-price-input">
                          <span>{currencySymbol(localCurrency)}</span>
                          <Ui44TextInput className="os-input-field" value={localPrice} onChange={event => setLocalPrice(formatPriceInput(event.target.value))} />
                        </span>
                      </label>
                  ) : null}
                </div>
              )}

              {(section.id === 'books' || section.id === 'assets') ? (
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
                            accept={AUDIO_UPLOAD_ACCEPT}
                            buttonLabel="Upload audio"
                            previewKind="none"
                            hideLabel
                            hideSuccessMessage
                            onChange={nextValue => updateTrack(index, { audioUrl: nextValue })}
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
              <span className="dashboard-form-note">This records your confirmation; it does not mean 44 has independently verified ownership.</span>
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
                  {activeUploadCount > 0 ? 'Uploading files…' : saving ? 'Publishing…' : 'Publish'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
