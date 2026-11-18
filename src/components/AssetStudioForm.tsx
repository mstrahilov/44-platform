'use client';

import { useEffect, useMemo, useState, type FormEvent, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { CenteredMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { useTopbarBack, useTopbarMobileTrailingAction } from '@/components/TopbarContext';
import { UploadField } from '@/components/UploadField';
import { StudioSamplePreviewFields, type DraftSamplePreview } from '@/components/StudioNativeContentFields';
import { Ui44CheckboxInput, Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';
import { StudioDigitalPricingFields } from '@/components/StudioPricingFields';
import { useAuth } from '@/lib/useAuth';
import { currencyForCountry, type MarketMode } from '@/lib/marketPreferences';
import { getStudioDisplayName, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { loadCreatorPaidSalesState, type CreatorPaidSalesState } from '@/lib/domain/creatorCommerce';
import {
  attestStudioItemRights,
  createStudioItem,
  isPublishingReviewRequired,
  listCatalogTaxonomy,
  listItemCategories,
  loadStudioItemEditor,
  replaceStudioAsset,
  replaceStudioItemTaxonomy,
  setStudioPublicationStatus,
  submitStudioItemForReview,
  updateStudioItem,
} from '@/lib/domain/studioPublishing';
import {
  beatReviewSurfacesEnabled,
  isBeatDatabaseReviewEnabled,
  loadOwnedBeatEditor,
  saveOwnedBeatDraft,
} from '@/lib/domain/beats';
import { replaceStudioSampleFiles } from '@/lib/domain/nativeContent';
import { clearStudioFormRecovery, readStudioFormRecovery, writeStudioFormRecovery } from '@/lib/studioFormRecovery';
import { normalizeOptionalReleaseDate, releaseYear } from '@/lib/releaseDates';
import type { Database } from '@/lib/database.types';
import type { ProductCategory } from '@/lib/platform';

type AssetSubtype = 'beat' | 'sample-packs';
type BeatTier = 'basic' | 'premium' | 'trackout' | 'exclusive' | 'free';
type AssetFormState = {
  subtype: AssetSubtype | '';
  title: string;
  coverUrl: string;
  releaseDate: string;
  paidDownload: boolean;
  price: string;
  marketMode: MarketMode;
  localPrice: string;
  localCurrency: string;
  packFile: string;
  samplePreviews: DraftSamplePreview[];
  previewUrl: string;
  previewDuration: string;
  bpm: string;
  keyRoot: string;
  keyMode: string;
  keyNotApplicable: boolean;
  timeSignature: string;
  sampleStatus: string;
  sampleDisclosure: string;
  youtubeUrl: string;
  tagIds: string[];
  attributeTermIds: string[];
  mp3Path: string;
  wavPath: string;
  stemsPath: string;
  enabledTiers: BeatTier[];
  tierPrices: Record<BeatTier, string>;
  rightsConfirmed: boolean;
};

const EMPTY_FORM: AssetFormState = {
  subtype: '', title: '', coverUrl: '', releaseDate: '', paidDownload: false, price: '',
  marketMode: 'global', localPrice: '', localCurrency: 'USD', packFile: '', samplePreviews: [], previewUrl: '',
  previewDuration: '', bpm: '', keyRoot: 'C', keyMode: 'minor', keyNotApplicable: false,
  timeSignature: '4/4', sampleStatus: 'none', sampleDisclosure: '', youtubeUrl: '', tagIds: [],
  attributeTermIds: [], mp3Path: '', wavPath: '', stemsPath: '', enabledTiers: [],
  tierPrices: { basic: '', premium: '', trackout: '', exclusive: '', free: '0' }, rightsConfirmed: false,
};

const ASSET_TYPE_LABELS: Record<AssetSubtype, string> = {
  beat: 'Beat',
  'sample-packs': 'Sample Pack',
};

const BEAT_TIERS: Array<{ code: BeatTier; title: string; copy: string; requiredFiles: Array<'mp3Path' | 'wavPath' | 'stemsPath'> }> = [
  { code: 'basic', title: 'Basic License', copy: 'Non-exclusive license with an untagged MP3.', requiredFiles: ['mp3Path'] },
  { code: 'premium', title: 'Premium License', copy: 'Non-exclusive license with untagged MP3 and WAV files.', requiredFiles: ['mp3Path', 'wavPath'] },
  { code: 'trackout', title: 'Trackout License', copy: 'Non-exclusive license with MP3, WAV, and stems.', requiredFiles: ['mp3Path', 'wavPath', 'stemsPath'] },
  { code: 'exclusive', title: 'Exclusive License', copy: 'One exclusive sale with MP3, WAV, and stems.', requiredFiles: ['mp3Path', 'wavPath', 'stemsPath'] },
  { code: 'free', title: 'Free License', copy: 'Non-exclusive license with an untagged MP3, at no cost.', requiredFiles: ['mp3Path'] },
];

function isBeatSubtype(subtype: AssetSubtype | ''): subtype is 'beat' {
  return subtype === 'beat';
}

function slugFromItemType(value: string | null | undefined): AssetSubtype | '' {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized.includes('acapella') || normalized.includes('instrumental') || normalized === 'beat') return 'beat';
  if (normalized.includes('remix')) return 'sample-packs';
  if (normalized.includes('sample')) return 'sample-packs';
  return '';
}

function centsToPrice(value: number | null | undefined) {
  return typeof value === 'number' ? (value / 100).toFixed(2) : '';
}

function priceToCents(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null;
}

function localCalendarDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function CheckIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

export function AssetStudioForm({ itemId = null }: { itemId?: string | null }) {
  useTopbarBack({ href: '/studio', label: 'Studio' });
  const router = useRouter();
  const { user, loading } = useAuth();
  const userId = user?.id ?? '';
  const [form, setForm] = useState<AssetFormState>(EMPTY_FORM);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [creatorName, setCreatorName] = useState('');
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [taxonomyTypes, setTaxonomyTypes] = useState<Database['public']['Tables']['item_types']['Row'][]>([]);
  const [storedTaxonomyTypeId, setStoredTaxonomyTypeId] = useState<string | null>(null);
  const [storedBeatSubtype, setStoredBeatSubtype] = useState<'beat' | 'vocal-acapella'>('beat');
  const [paidSales, setPaidSales] = useState<CreatorPaidSalesState | null>(null);
  const [databaseEnabled, setDatabaseEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const recoveryKey = userId ? `asset:${itemId ?? 'new'}:${userId}` : '';

  const beatLike = isBeatSubtype(form.subtype);
  const paidUnavailable = !paidSales?.can_sell_paid;
  const selectedType = taxonomyTypes.find(type => type.slug === form.subtype);
  const requiredBeatFiles = useMemo(() => new Set(
    BEAT_TIERS.filter(tier => form.enabledTiers.includes(tier.code)).flatMap(tier => tier.requiredFiles),
  ), [form.enabledTiers]);

  useTopbarMobileTrailingAction(useMemo(() => (
    <button type="submit" form="studio-asset-form" className="ui44-symbol-button studio-music-publish-action" aria-label={itemId ? 'Save asset' : 'Publish asset'} title={itemId ? 'Save asset' : 'Publish asset'} disabled={!userId || !ready || saving || uploading}>
      <CheckIcon />
    </button>
  ), [itemId, ready, saving, uploading, userId]));

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void Promise.all([
      listItemCategories(), listCatalogTaxonomy(), isBeatDatabaseReviewEnabled(),
      loadStudioProfile(userId), loadCreatorPaidSalesState(userId),
      itemId ? loadStudioItemEditor(itemId, userId) : Promise.resolve(null),
    ]).then(async ([categoryRows, taxonomy, beatEnabled, profileResult, sales, editor]) => {
      if (!alive) return;
      setCategories(categoryRows);
      setTaxonomyTypes(taxonomy.types);
      setDatabaseEnabled(beatEnabled);
      setProfile(profileResult.profile);
      setCreatorName(getStudioDisplayName(profileResult.profile, user?.email));
      setPaidSales(sales);
      const initialCurrency = currencyForCountry(profileResult.profile?.country_code || profileResult.profile?.home_country_code);
      let nextForm: AssetFormState = { ...EMPTY_FORM, localCurrency: initialCurrency };

      if (editor) {
        const assignedType = taxonomy.types.find(type => type.id === editor.taxonomyTypeId);
        const subtype = slugFromItemType(assignedType?.slug ?? editor.item.item_type);
        setStoredTaxonomyTypeId(editor.taxonomyTypeId);
        setStoredBeatSubtype(assignedType?.slug === 'vocal-acapella' ? 'vocal-acapella' : 'beat');
        if (isBeatSubtype(subtype)) {
          const beatEditor = await loadOwnedBeatEditor(itemId!, userId);
          if (!alive) return;
          const offers = beatEditor?.beat?.licenseOffers ?? [];
          const priceByTier = new Map(offers.map(offer => [offer.tierCode, offer.priceCents]));
          nextForm = {
            ...nextForm,
            subtype: 'beat',
            title: beatEditor?.item.title ?? editor.item.title,
            coverUrl: beatEditor?.item.cover_url ?? editor.item.cover_url ?? '',
            releaseDate: beatEditor?.item.release_date ?? editor.item.release_date ?? '',
            previewUrl: beatEditor?.preview?.audio_url ?? '',
            previewDuration: beatEditor?.preview?.duration_seconds?.toString() ?? '',
            bpm: beatEditor?.beat?.bpm.toString() ?? '',
            keyRoot: beatEditor?.beat?.keyRoot ?? 'C',
            keyMode: beatEditor?.beat?.keyMode ?? 'minor',
            keyNotApplicable: beatEditor?.beat?.keyNotApplicable ?? false,
            timeSignature: beatEditor?.beat?.timeSignature ?? '4/4',
            sampleStatus: beatEditor?.beat?.sampleStatus ?? 'none',
            sampleDisclosure: beatEditor?.beat?.sampleDisclosure ?? '',
            youtubeUrl: beatEditor?.externalUrl ?? '',
            tagIds: beatEditor?.tagIds ?? [],
            attributeTermIds: beatEditor?.attributeTermIds ?? [],
            mp3Path: beatEditor?.privateFiles.untagged_mp3 ?? '',
            wavPath: beatEditor?.privateFiles.untagged_wav ?? '',
            stemsPath: beatEditor?.privateFiles.stems_zip ?? '',
            enabledTiers: BEAT_TIERS.filter(tier => priceByTier.has(tier.code)).map(tier => tier.code),
            tierPrices: Object.fromEntries(BEAT_TIERS.map(tier => [tier.code, tier.code === 'free' ? '0' : centsToPrice(priceByTier.get(tier.code))])) as AssetFormState['tierPrices'],
            rightsConfirmed: true,
          };
        } else {
          const primaryAsset = editor.assets.find(asset => asset.asset_type === 'sample_pack');
          nextForm = {
            ...nextForm,
            subtype: 'sample-packs',
            title: editor.item.title,
            coverUrl: editor.item.cover_url ?? '',
            releaseDate: editor.item.release_date ?? '',
            paidDownload: !editor.item.is_free,
            price: centsToPrice(editor.item.price_cents),
            marketMode: (editor.item.market_mode === 'global_plus_local' ? 'global_plus_local' : 'global') as MarketMode,
            localPrice: centsToPrice(editor.item.local_price_cents),
            localCurrency: editor.item.local_currency ?? initialCurrency,
            packFile: primaryAsset?.storage_path ?? '',
            samplePreviews: editor.sampleFiles.map(sample => ({
              title: sample.title,
              previewUrl: sample.preview_url ?? '',
              durationSeconds: sample.duration_seconds,
              waveformPeaks: Array.isArray(sample.waveform_peaks)
                ? sample.waveform_peaks.filter((peak): peak is number => typeof peak === 'number')
                : [],
              mimeType: sample.mime_type,
              fileSizeBytes: sample.file_size_bytes,
            })),
          };
        }
      } else {
        const recovered = readStudioFormRecovery<AssetFormState>(recoveryKey);
        if (recovered) nextForm = { ...nextForm, ...recovered };
      }
      setForm(nextForm);
      setReady(true);
    }).catch(loadError => {
      if (!alive) return;
      setError(loadError instanceof Error ? loadError.message : 'Could not load Asset Studio.');
      setReady(true);
    });
    return () => { alive = false; };
  }, [itemId, recoveryKey, user?.email, userId]);

  useEffect(() => {
    if (!ready || !recoveryKey) return;
    writeStudioFormRecovery(recoveryKey, form);
  }, [form, ready, recoveryKey]);

  function update<K extends keyof AssetFormState>(key: K, value: AssetFormState[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function updateSamplePreviews(action: SetStateAction<DraftSamplePreview[]>) {
    setForm(current => ({
      ...current,
      samplePreviews: typeof action === 'function' ? action(current.samplePreviews) : action,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;
    const cleanTitle = form.title.trim();
    const date = itemId
      ? (normalizeOptionalReleaseDate(form.releaseDate) ?? localCalendarDate())
      : localCalendarDate();
    if (!cleanTitle || !form.coverUrl.trim()) { setError('Add a title and artwork before saving.'); return; }
    if (!form.subtype || (!selectedType && !storedTaxonomyTypeId)) { setError('Choose an asset type.'); return; }
    if (!form.rightsConfirmed) { setError('Confirm that you own this work or have the necessary rights and permission to publish and distribute it through 44OS.'); return; }
    if (beatLike) {
      if (!beatReviewSurfacesEnabled || !databaseEnabled) { setError('Beat creation is currently unavailable because the Beat review control is off.'); return; }
      const bpm = Number(form.bpm);
      if (!form.previewUrl.trim() || bpm < 40 || bpm > 240) { setError('Add a tagged preview and a BPM from 40–240.'); return; }
      for (const tier of BEAT_TIERS.filter(row => form.enabledTiers.includes(row.code))) {
        const cents = tier.code === 'free' ? 0 : priceToCents(form.tierPrices[tier.code]);
        if (cents === null) { setError(`Add a valid USD price for the ${tier.title}.`); return; }
        if (tier.requiredFiles.some(key => !form[key].trim())) { setError(`${tier.title} is missing a required private delivery file.`); return; }
      }
    } else {
      if (!form.packFile.trim()) { setError('Upload the pack ZIP before saving.'); return; }
      if (form.samplePreviews.some(sample => !sample.title.trim() || !sample.previewUrl.trim())) { setError('Add a title and audio preview for each sample preview.'); return; }
      if (form.paidDownload && !paidSales?.can_sell_paid) { setError('Paid downloads are not available for this account. Turn off Paid Download to publish this asset for free.'); return; }
      if (form.paidDownload && priceToCents(form.price) === null) { setError('Enter a global price greater than zero.'); return; }
      if (form.paidDownload && form.marketMode === 'global_plus_local' && priceToCents(form.localPrice) === null) { setError(`Enter a ${form.localCurrency} local price greater than zero.`); return; }
    }
    if (uploading) { setError('Wait for the current upload to finish before saving.'); return; }

    setSaving(true);
    setError('');
    try {
      let savedId = itemId;
      if (beatLike) {
        savedId = await saveOwnedBeatDraft({
          itemId,
          assetSubtype: itemId ? storedBeatSubtype : 'beat',
          title: cleanTitle,
          description: '',
          coverUrl: form.coverUrl.trim(),
          releaseDate: date,
          previewUrl: form.previewUrl.trim(),
          previewDuration: Number(form.previewDuration || 0),
          bpm: Number(form.bpm),
          keyRoot: form.keyRoot,
          keyMode: form.keyMode,
          keyNotApplicable: false,
          timeSignature: form.timeSignature,
          sampleStatus: 'none',
          sampleDisclosure: '',
          externalUrl: '',
          tagIds: [],
          attributeTermIds: [],
          privateFiles: {
            untagged_mp3: requiredBeatFiles.has('mp3Path') ? form.mp3Path : '',
            untagged_wav: requiredBeatFiles.has('wavPath') ? form.wavPath : '',
            stems_zip: requiredBeatFiles.has('stemsPath') ? form.stemsPath : '',
          },
          tierPrices: Object.fromEntries(form.enabledTiers.map(tier => [tier, tier === 'free' ? 0 : priceToCents(form.tierPrices[tier])])) as Record<BeatTier, number>,
        });
        await attestStudioItemRights(savedId);
      } else {
        const profileResult = profile ?? (await loadStudioProfile(user.id)).profile;
        const ownerId = profileResult?.id ?? user.id;
        const category = categories.find(row => row.slug === 'sample-packs');
        if (!category) throw new Error('Asset catalog is not configured.');
        const priceCents = form.paidDownload ? priceToCents(form.price) ?? 0 : 0;
        const localPriceCents = form.paidDownload && form.marketMode === 'global_plus_local' ? priceToCents(form.localPrice) : null;
        const payload = {
          author_id: ownerId,
          item_category_id: category.id,
          title: cleanTitle,
          creator: creatorName || getStudioDisplayName(profileResult, user.email),
          item_type: selectedType?.label ?? ASSET_TYPE_LABELS[form.subtype as AssetSubtype],
          short_description: null,
          long_description: null,
          price_cents: priceCents,
          market_mode: form.paidDownload ? form.marketMode : 'global',
          local_price_cents: localPriceCents,
          local_currency: localPriceCents ? form.localCurrency : null,
          available_locally_only: false,
          is_free: !form.paidDownload,
          streaming_enabled: false,
          download_purchase_enabled: form.paidDownload,
          cover_url: form.coverUrl.trim(),
          hero_url: null,
          experience_type: 'asset',
          fulfillment_type: 'digital',
          merch_fulfillment_mode: null,
          merch_shipping_scope: null,
          read_url: null,
          download_url: null,
          featured: false,
          status: 'draft' as const,
          year: releaseYear(date, ''),
          release_date: date,
          sort_order: Date.now(),
        };
        if (itemId) {
          await updateStudioItem(itemId, ownerId, payload);
          savedId = itemId;
        } else {
          savedId = await createStudioItem({ ...payload, slug: `${cleanTitle.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'asset'}-${crypto.randomUUID().slice(0, 8)}` });
          await attestStudioItemRights(savedId);
        }
        const taxonomyTypeId = itemId ? (storedTaxonomyTypeId ?? selectedType?.id) : selectedType?.id;
        if (!taxonomyTypeId) throw new Error('Asset item type is not configured.');
        await replaceStudioItemTaxonomy(savedId!, taxonomyTypeId, []);
        const assetRow = {
          item_id: savedId!,
          asset_type: 'sample_pack',
          title: ASSET_TYPE_LABELS[form.subtype as AssetSubtype],
          file_url: null,
          storage_path: form.packFile.trim(),
          is_downloadable: true,
          sort_order: 0,
        };
        await replaceStudioAsset(savedId!, 'sample_pack', assetRow);
        await replaceStudioSampleFiles(savedId!, form.samplePreviews.map(sample => ({
          title: sample.title.trim(),
          previewUrl: sample.previewUrl.trim() || null,
          durationSeconds: sample.durationSeconds,
          waveformPeaks: sample.waveformPeaks,
          mimeType: sample.mimeType,
          fileSizeBytes: sample.fileSizeBytes,
        })));
      }

      if (!savedId) throw new Error('The Asset was saved without a returned ID.');
      if (itemId) {
        clearStudioFormRecovery(recoveryKey);
        router.push(`/studio/assets/${savedId}?saved=1`);
      } else {
        const reviewRequired = await isPublishingReviewRequired();
        if (reviewRequired) await submitStudioItemForReview(savedId, crypto.randomUUID(), beatLike ? '2026-07-29-beat-v1' : undefined);
        else await setStudioPublicationStatus(savedId, 'published');
        clearStudioFormRecovery(recoveryKey);
        const status = reviewRequired ? 'submitted' : 'published';
        router.push(`/studio?studioStatus=${status}#${beatLike ? 'beats' : 'sample-packs'}`);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this Asset.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !ready) return <PageShell><CenteredMessage status>Loading Asset Studio…</CenteredMessage></PageShell>;
  if (!user) return null;
  const availableTypes: AssetSubtype[] = ['beat', 'sample-packs'];

  return <PageShell>
    <main className="dashboard-page dashboard-editor">
      <HubHero title={itemId ? 'Edit Asset' : 'Add Asset'} hideDivider actions={<button type="submit" form="studio-asset-form" className="ui44-symbol-button studio-music-publish-desktop" aria-label={itemId ? 'Save asset' : 'Publish asset'} title={itemId ? 'Save asset' : 'Publish asset'} disabled={saving || uploading}><CheckIcon /></button>} />
      {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
      <div className="dashboard-section">
        <form id="studio-asset-form" className="dashboard-form studio-artwork-create-form" onSubmit={handleSubmit}>
          <UploadField label="Artwork" folder="products/covers" userId={user.id} value={form.coverUrl} accept="image/*" previewKind="image" artworkSurface onChange={value => update('coverUrl', value)} onUploadingChange={setUploading} />

          <section className="dashboard-form-section">
            <SectionHeader title="Details" description="Add the asset’s core details." showDescription />
            <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
              <label className="dashboard-field"><span className="dashboard-field-label">Title</span><Ui44TextInput required value={form.title} placeholder="Enter asset title" onChange={event => update('title', event.target.value)} /></label>
              <label className="dashboard-field"><span className="dashboard-field-label">Item Type</span><Ui44SelectInput required disabled={Boolean(itemId)} value={form.subtype} onChange={event => update('subtype', event.target.value as AssetSubtype)}><option value="">Select item type</option>{availableTypes.map(type => <option key={type} value={type}>{ASSET_TYPE_LABELS[type]}</option>)}</Ui44SelectInput></label>
            </div>
          </section>

          {form.subtype && !beatLike ? <section className="dashboard-form-section">
            <SectionHeader title="Pricing" description="Choose whether this Sample Pack is free or paid." showDescription />
            <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
              <StudioDigitalPricingFields
                availability={form.paidDownload ? 'paid' : 'free'}
                marketMode={form.marketMode}
                globalPrice={form.price}
                localPrice={form.localPrice}
                localCurrency={form.localCurrency}
                disabled={paidUnavailable}
                availabilityDisabled={false}
                noticeId="asset-paid-download-notice"
                onAvailabilityChange={availability => update('paidDownload', availability === 'paid')}
                onMarketModeChange={value => update('marketMode', value)}
                onGlobalPriceChange={value => update('price', value)}
                onLocalPriceChange={value => update('localPrice', value)}
              />
            </div>
          </section> : null}

          {form.subtype && beatLike ? <>
            <section className="dashboard-form-section">
              <SectionHeader title="Beat" description="Add the beat’s tempo, key, and time signature." showDescription />
              <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
                <div className="dashboard-form-grid dashboard-form-grid-2 ui44-form-grid">
                  <label className="dashboard-field"><span className="dashboard-field-label">BPM</span><Ui44TextInput required type="number" min={40} max={240} value={form.bpm} onChange={event => update('bpm', event.target.value)} /></label>
                  <label className="dashboard-field"><span className="dashboard-field-label">Time Signature</span><Ui44SelectInput value={form.timeSignature} onChange={event => update('timeSignature', event.target.value)}>{['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '12/8'].map(value => <option key={value}>{value}</option>)}</Ui44SelectInput></label>
                  <label className="dashboard-field"><span className="dashboard-field-label">Key</span><Ui44SelectInput value={form.keyRoot} onChange={event => { update('keyNotApplicable', false); update('keyRoot', event.target.value); }}>{['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(value => <option key={value}>{value}</option>)}</Ui44SelectInput></label>
                  <label className="dashboard-field"><span className="dashboard-field-label">Mode</span><Ui44SelectInput value={form.keyMode} onChange={event => { update('keyNotApplicable', false); update('keyMode', event.target.value); }}><option value="major">Major</option><option value="minor">Minor</option></Ui44SelectInput></label>
                </div>
              </div>
            </section>

            <section className="dashboard-form-section">
              <SectionHeader title="Licenses" description="Choose the license tiers and prices to offer." showDescription />
              <div className="dashboard-achievement-picker dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip asset-license-list">
                {BEAT_TIERS.map(tier => {
                  const enabled = form.enabledTiers.includes(tier.code);
                  return <div className="dashboard-achievement-choice-row asset-license-choice-row" key={tier.code}>
                    <span className="dashboard-achievement-toggle asset-license-toggle">
                      <Ui44CheckboxInput id={`asset-license-${tier.code}`} aria-label={`Offer ${tier.title}`} checked={enabled} onChange={event => update('enabledTiers', event.target.checked ? [...form.enabledTiers, tier.code] : form.enabledTiers.filter(code => code !== tier.code))} />
                    </span>
                    <div className="dashboard-achievement-copy asset-license-copy">
                      <label className="os-type-card-title asset-license-title" htmlFor={`asset-license-${tier.code}`}>{tier.title}</label>
                      <span className="os-type-body-small asset-license-description">{tier.copy}</span>
                      {enabled ? tier.code === 'free' ? <div className="dashboard-field beat-tier-price"><span className="dashboard-field-label">Price (USD)</span><div className="dashboard-form-note">Free</div></div> : <label className="dashboard-field beat-tier-price"><span className="dashboard-field-label">Price (USD)</span><Ui44TextInput inputMode="decimal" value={form.tierPrices[tier.code]} onChange={event => update('tierPrices', { ...form.tierPrices, [tier.code]: event.target.value.replace(/[^\d.]/g, '') })} placeholder="0.00" /></label> : null}
                    </div>
                  </div>;
                })}
              </div>
            </section>

            <section className="dashboard-form-section">
              <SectionHeader title="Uploads" description="Add a tagged preview and files needed for the selected licenses." showDescription />
              <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
                <UploadField label="Tagged Preview" folder="products/beat-previews" userId={user.id} value={form.previewUrl} accept="audio/mpeg,audio/mp3,audio/wav" onChange={value => update('previewUrl', value)} onAudioMetadata={duration => update('previewDuration', duration.toString())} onUploadingChange={setUploading} />
                {requiredBeatFiles.has('mp3Path') ? <UploadField label="Untagged MP3" folder="beats/mp3" userId={user.id} value={form.mp3Path} accept="audio/mpeg,audio/mp3" storage="private-item" onChange={value => update('mp3Path', value)} onUploadingChange={setUploading} /> : null}
                {requiredBeatFiles.has('wavPath') ? <UploadField label="Untagged WAV" folder="beats/wav" userId={user.id} value={form.wavPath} accept="audio/wav,audio/x-wav" storage="private-item" onChange={value => update('wavPath', value)} onUploadingChange={setUploading} /> : null}
                {requiredBeatFiles.has('stemsPath') ? <UploadField label="Stems / Trackouts ZIP" folder="beats/stems" userId={user.id} value={form.stemsPath} accept="application/zip,.zip" storage="private-item" onChange={value => update('stemsPath', value)} onUploadingChange={setUploading} /> : null}
              </div>
            </section>
          </> : null}

          {form.subtype && !beatLike ? <section className="dashboard-form-section">
            <SectionHeader title="Sample Pack File" description="Upload the protected ZIP file for this asset." showDescription />
            <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
              <UploadField label="Upload pack ZIP" folder="products/assets" userId={user.id} value={form.packFile} accept="application/zip,.zip" storage="private-item" onChange={value => update('packFile', value)} onUploadingChange={setUploading} />
            </div>
          </section> : null}
          {form.subtype && !beatLike ? <StudioSamplePreviewFields userId={user.id} samples={form.samplePreviews} onChange={updateSamplePreviews} onUploadingChange={setUploading} /> : null}
          {form.subtype ? <label className="dashboard-field">
            <span className="settings-checkbox-row studio-rights-checkbox">
              <Ui44CheckboxInput checked={form.rightsConfirmed} onChange={event => update('rightsConfirmed', event.target.checked)} />
              <span>I confirm that I own this work or have the necessary rights and permission to publish and distribute it through 44OS.</span>
            </span>
          </label> : null}
        </form>
      </div>
    </main>
  </PageShell>;
}
