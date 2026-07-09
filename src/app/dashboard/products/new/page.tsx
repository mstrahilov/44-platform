'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell, GlassPanel, HubHero, CenteredMessage } from '@/components/Ui';
import { useTopbarBack } from '@/components/TopbarContext';
import { UploadField } from '@/components/UploadField';
import {
  DashboardReleaseFeatures,
  createReleaseFeatureState,
  normalizeFeatureStateForSection,
  saveReleaseFeatures,
} from '@/components/DashboardReleaseFeatures';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category } from '@/lib/platform';
import { currencyForCountry, type MarketMode } from '@/lib/marketPreferences';
import { isMissingColumnError } from '@/lib/schemaCompat';
import { getStudioDisplayName, isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { normalizeTaxonomyValue } from '@/lib/taxonomy';
import { getDashboardCatalogSection, type DashboardCatalogSectionId } from '@/lib/dashboardCatalog';

function buildSlug(title: string) {
  const base = normalizeTaxonomyValue(title) || 'item';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

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

export default function NewProductPage() {
  return (
    <Suspense fallback={<PageShell><CenteredMessage>Loading...</CenteredMessage></PageShell>}>
      <NewProductContent />
    </Suspense>
  );
}

function categoryMatchesSection(category: Category, sectionId: DashboardCatalogSectionId) {
  const name = `${category.name} ${category.slug}`.toLowerCase();
  if (sectionId === 'merch') return name.includes('merch') || name.includes('apparel') || name.includes('shop');
  if (sectionId === 'books') return name.includes('book');
  if (sectionId === 'assets') return name.includes('asset') || name.includes('sample') || name.includes('preset') || name.includes('template');
  return name.includes('music');
}

function NewProductContent() {
  const searchParams = useSearchParams();
  const section = getDashboardCatalogSection(searchParams.get('section'));
  useTopbarBack({ href: section.href, label: section.label });
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [creatorName, setCreatorName] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productType, setProductType] = useState(section.typeOptions[0]);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [marketMode, setMarketMode] = useState<MarketMode>('global');
  const [localPrice, setLocalPrice] = useState('');
  const [localCurrency, setLocalCurrency] = useState('USD');
  const [merchFulfillmentMode, setMerchFulfillmentMode] = useState<'ship' | 'deliver'>('deliver');
  const [merchShippingScope, setMerchShippingScope] = useState<'local' | 'global'>('local');
  const [coverUrl, setCoverUrl] = useState('');
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [itemFileUrl, setItemFileUrl] = useState('');
  const [year, setYear] = useState('');
  const [trackCount, setTrackCount] = useState('1');
  const [tracks, setTracks] = useState<DraftTrack[]>([createDraftTrack()]);
  const [featureState, setFeatureState] = useState(() => createReleaseFeatureState(section.id));
  const [publishStatus, setPublishStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');
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
        supabase.from('categories').select('*').eq('scope', 'products').order('sort_order'),
        loadStudioProfile(user.id),
      ]);

      const resolvedCategories = (categoryRows as Category[] | null) ?? [];
      setCategories(resolvedCategories);
      setCategoryId(resolvedCategories.find(category => categoryMatchesSection(category, section.id))?.id ?? resolvedCategories[0]?.id ?? '');

      setProfile(profileResult.profile);
      setCreatorName(getStudioDisplayName(profileResult.profile, user.email));
      const nextCurrency =
        profileResult.profile?.display_currency ||
        currencyForCountry(profileResult.profile?.country_code) ||
        profileResult.profile?.home_currency ||
        currencyForCountry(profileResult.profile?.home_country_code);
      setLocalCurrency(nextCurrency);
      setProductType(section.typeOptions[0]);
    }

    loadFormData();
  }, [section.id, user]);

  const selectedCategory = useMemo(
    () => categories.find(category => category.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const isMusicProduct = section.id === 'music';
  const isMerchProduct = section.id === 'merch';
  const needsDigitalFile = section.id === 'books' || section.id === 'assets';
  const merchUsesLocalOnlyPricing = isMerchProduct && (merchFulfillmentMode === 'deliver' || merchShippingScope === 'local');

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

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanType = productType.trim();

    if (!cleanTitle || !categoryId || !cleanType || !cleanDescription) {
      setError('Please fill out the title, type, and description.');
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

    setSaving(true);
    setError('');

    const priceNumber = Number(price || '0');
    const isFree = !Number.isFinite(priceNumber) || priceNumber <= 0;
    const priceCents = isFree ? 0 : Math.round(priceNumber * 100);
    const localPriceNumber = Number(localPrice || '0');
    const localPriceCents = localPrice.trim() && Number.isFinite(localPriceNumber) ? Math.max(0, Math.round(localPriceNumber * 100)) : null;
    const slug = buildSlug(cleanTitle);
    const sortOrder = Date.now();

    const insertPayload = {
      author_id: profile?.id ?? user.id,
      category_id: categoryId,
      slug,
      title: cleanTitle,
      creator: creatorName,
      product_type: cleanType,
      category: selectedCategory?.name ?? section.label,
      short_description: null,
      long_description: cleanDescription,
      price_cents: merchUsesLocalOnlyPricing ? 0 : priceCents,
      market_mode: isMerchProduct ? (merchUsesLocalOnlyPricing ? 'global_plus_local' : marketMode) : marketMode,
      local_price_cents: isMerchProduct ? (localPriceCents ?? priceCents) : (marketMode === 'global' ? null : localPriceCents),
      local_currency: isMerchProduct ? localCurrency : (marketMode === 'global' ? null : localCurrency),
      available_locally_only: isMerchProduct ? merchUsesLocalOnlyPricing : false,
      is_free: isFree,
      cover_url: coverUrl.trim() || null,
      hero_url: null,
      runtime_type: runtimeTypeForSection(section.id),
      experience_type: experienceTypeForSection(section.id),
      fulfillment_type: isMerchProduct ? 'physical' : 'digital',
      merch_fulfillment_mode: isMerchProduct ? merchFulfillmentMode : null,
      merch_shipping_scope: isMerchProduct ? (merchFulfillmentMode === 'deliver' ? 'local' : merchShippingScope) : null,
      read_url: section.id === 'books' ? itemFileUrl.trim() : null,
      download_url: needsDigitalFile ? itemFileUrl.trim() : null,
      featured: false,
      status: publishStatus,
      is_published: publishStatus === 'published',
      year: year ? Number(year) : null,
      sort_order: sortOrder,
    };

    let { data: insertedProduct, error: insertError } = await supabase
      .from('products')
      .insert(insertPayload)
      .select('id')
      .single();

    if (isMissingColumnError(insertError)) {
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
      } = insertPayload;
      const retry = await supabase.from('products').insert(legacyPayload).select('id').single();
      insertedProduct = retry.data;
      insertError = retry.error;
    }

    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    if (isMusicProduct && insertedProduct?.id) {
      const trackRows = visibleTracks.map((track, index) => ({
        product_id: insertedProduct.id,
        number: index + 1,
        title: track.title.trim(),
        duration_seconds: null,
        audio_url: track.audioUrl.trim(),
        download_url: null,
      }));

      const { error: trackInsertError } = await supabase.from('tracks').insert(trackRows);
      if (trackInsertError) {
        setSaving(false);
        setError(trackInsertError.message);
        return;
      }
    }

    if (needsDigitalFile && insertedProduct?.id) {
      const { error: assetInsertError } = await supabase.from('product_assets').insert({
        product_id: insertedProduct.id,
        asset_type: productAssetTypeForSection(section.id),
        title: cleanType || cleanTitle,
        file_url: itemFileUrl.trim(),
        storage_path: null,
        is_downloadable: true,
        sort_order: 0,
      });

      if (assetInsertError) {
        setSaving(false);
        setError(assetInsertError.message);
        return;
      }
    }

    if (isMerchProduct && insertedProduct?.id && galleryUrls.length > 0) {
      const { error: galleryInsertError } = await supabase.from('product_assets').insert(
        galleryUrls.map((url, index) => ({
          product_id: insertedProduct.id,
          asset_type: 'gallery_image',
          title: `Gallery Image ${index + 1}`,
          file_url: url,
          storage_path: null,
          is_downloadable: false,
          sort_order: index,
        })),
      );

      if (galleryInsertError) {
        setSaving(false);
        setError(galleryInsertError.message);
        return;
      }
    }

    if (insertedProduct?.id && (section.id === 'music' || section.id === 'books')) {
      const featureError = await saveReleaseFeatures({
        supabaseClient: supabase,
        productId: insertedProduct.id,
        sectionId: section.id,
        state: featureState,
      });

      if (featureError) {
        setSaving(false);
        setError(featureError);
        return;
      }
    }

    setSaving(false);
    router.push(section.href);
  }

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
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
            <section className="dashboard-form-step">
              <div className="dashboard-form-section-head">
                <div className="dashboard-form-section-copy">
                  <div className="dashboard-field-label">{isMerchProduct ? 'Item Information' : 'Release Information'}</div>
                  <p>Set the core title, type, pricing, artwork, and main details for this item.</p>
                </div>
              </div>

              <label className="dashboard-field">
                <div className="dashboard-field-label">{isMerchProduct ? 'Product Name' : 'Title'}</div>
                <input className="os-input-field" value={title} onChange={event => setTitle(event.target.value)} placeholder={isMerchProduct ? 'Example: 44 Studio Hoodie' : 'Example: Here Comes The Feeling'} />
              </label>

              <label className="dashboard-field">
                <div className="dashboard-field-label">{isMerchProduct ? 'Product Description' : 'Description'}</div>
                <textarea className="os-input-textarea" rows={6} value={description} onChange={event => setDescription(event.target.value)} />
              </label>

              <div className="dashboard-form-grid dashboard-form-grid-3">
              <label className="dashboard-field">
                <div className="dashboard-field-label">{section.typeLabel}</div>
                <select className="os-input-field" value={productType} onChange={event => setProductType(event.target.value)}>
                  {section.typeOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="dashboard-field">
                <div className="dashboard-field-label">{isMerchProduct ? 'Drop Year' : 'Release Year'}</div>
                <input className="os-input-field" value={year} onChange={event => setYear(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))} placeholder="2026" />
              </label>
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
                    <input className="os-input-field" value={price} onChange={event => setPrice(formatPriceInput(event.target.value))} />
                  </span>
                </label>
              ) : null}

              {(isMerchProduct ? merchUsesLocalOnlyPricing : marketMode !== 'global') && (
                <label className="dashboard-field">
                  <div className="dashboard-field-label">{merchUsesLocalOnlyPricing ? `Price (${localCurrency})` : `Local Price (${localCurrency})`}</div>
                  <span className="dashboard-price-input">
                    <span>{currencySymbol(localCurrency)}</span>
                    <input className="os-input-field" value={localPrice} onChange={event => setLocalPrice(formatPriceInput(event.target.value))} />
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
              <p className="dashboard-form-note">{isMerchProduct ? 'Merch is creator-fulfilled locally. Use local pricing when needed.' : 'Leave Local Price blank to use the global price everywhere.'}</p>
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
                label={section.id === 'books' ? 'Book File' : 'Asset File'}
                folder={section.id === 'books' ? 'products/books' : 'products/assets'}
                userId={user.id}
                value={itemFileUrl}
                accept={section.id === 'books' ? 'application/pdf,.pdf,.epub' : 'application/zip,.zip,audio/*'}
                buttonLabel={section.id === 'books' ? 'Upload book file' : 'Upload asset file'}
                onChange={setItemFileUrl}
                />
              ) : null}
            </section>

            {isMusicProduct ? (
              <div className="dashboard-form-section">
                <div className="dashboard-form-section-head">
                  <div className="dashboard-form-section-copy">
                    <div className="dashboard-field-label">Tracks</div>
                    <p>
                      Add up to 30 tracks for this release. Each track should have a title and an audio upload.
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
                    <GlassPanel key={`track-${index}`} style={{ padding: 18 }}>
                      <div style={{ display: 'grid', gap: 16 }}>
                        <div className="dashboard-field-label">{index + 1}. Track Title</div>

                        <div className="dashboard-form-grid">
                          <label className="dashboard-field">
                            <input
                              className="os-input-field"
                              value={track.title}
                              onChange={event => updateTrack(index, { title: event.target.value })}
                              placeholder={`Track ${index + 1} title`}
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
                          previewKind="none"
                          onChange={nextValue => updateTrack(index, { audioUrl: nextValue })}
                        />
                      </div>
                    </GlassPanel>
                  ))}
                </div>
              </div>
            ) : null}

            {(section.id === 'music' || section.id === 'books') ? (
              <DashboardReleaseFeatures
                sectionId={section.id}
                userId={user.id}
                state={featureState}
                onChange={setFeatureState}
              />
            ) : null}

            {error && <div className="dashboard-status dashboard-status-error">{error}</div>}

            {!isCreatorProfile(profile) && (
              <p className="dashboard-form-note">
                This account is not marked as a creator yet. You can still save drafts, but switch your profile role to creator before publishing publicly.
              </p>
            )}

            <div className="dashboard-form-actions">
              <div className="dashboard-form-actions-right">
                <Link className="os-button os-button-secondary" href={section.href}>
                  Cancel
                </Link>
                <button className="os-button os-button-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
