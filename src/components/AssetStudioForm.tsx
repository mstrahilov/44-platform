'use client';

import { useEffect, useId, useMemo, useState, type ChangeEvent, type FormEvent, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { CenteredMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { useTopbarBack, useTopbarMobileTrailingAction } from '@/components/TopbarContext';
import { StudioCreateCancel } from '@/components/StudioCreateCancel';
import { UploadField } from '@/components/UploadField';
import { getUploadErrorMessage, uploadPrivateItemFile } from '@/lib/uploads';
import { uploadProcessedAudio } from '@/lib/audioUploads';
import { StudioSamplePreviewFields, type DraftSamplePreview } from '@/components/StudioNativeContentFields';
import { Ui44CheckboxInput, Ui44FileInput, Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';
import { StudioDigitalPricingFields } from '@/components/StudioPricingFields';
import { StudioRightsPanel } from '@/components/StudioRightsPanel';
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
type BeatPricing = '' | 'free' | 'paid';
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
  beatPricing: BeatPricing;
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
  marketMode: 'global', localPrice: '', localCurrency: 'USD', packFile: '', samplePreviews: [], beatPricing: '', previewUrl: '',
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
  { code: 'basic', title: 'Basic License', copy: 'Non-exclusive license (MP3)', requiredFiles: ['mp3Path'] },
  { code: 'premium', title: 'Premium License', copy: 'Non-exclusive license (WAV)', requiredFiles: ['wavPath'] },
  { code: 'exclusive', title: 'Exclusive License', copy: 'Exclusive license (WAV + stems)', requiredFiles: ['stemsPath'] },
];

const BEAT_FILE_FIELDS: Array<{ key: 'mp3Path' | 'wavPath' | 'stemsPath'; label: string; folder: string; accept: string }> = [
  { key: 'mp3Path', label: 'MP3 file', folder: 'beats/mp3', accept: 'audio/mpeg,audio/mp3' },
  { key: 'wavPath', label: 'WAV file', folder: 'beats/wav', accept: 'audio/wav,audio/x-wav' },
  { key: 'stemsPath', label: 'WAV + Stems (ZIP)', folder: 'beats/stems', accept: 'application/zip,.zip' },
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

function FreeBeatAudioUpload({
  userId,
  value,
  onChange,
  onPreviewChange,
  onDurationChange,
  onUploadingChange,
}: {
  userId: string;
  value: string;
  onChange: (value: string) => void;
  onPreviewChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'status' | 'success' | 'error'>('status');

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    onUploadingChange(true);
    setMessage('');
    setMessageTone('status');
    try {
      const privateUpload = await uploadPrivateItemFile({ file, folder: 'beats/mp3', userId });
      const processed = await uploadProcessedAudio(file, status => {
        setMessageTone('status');
        setMessage(status);
      });
      onChange(privateUpload.path);
      onPreviewChange(processed.streamUrl);
      if (processed.durationSeconds) onDurationChange(Math.ceil(processed.durationSeconds).toString());
      setMessageTone('success');
      setMessage('Upload complete.');
    } catch (error) {
      setMessageTone('error');
      setMessage(getUploadErrorMessage(error));
    } finally {
      setUploading(false);
      onUploadingChange(false);
      event.target.value = '';
    }
  }

  function clearFile() {
    onChange('');
    onPreviewChange('');
    onDurationChange('');
    setMessage('');
  }

  return <div className="dashboard-field">
    <div className="dashboard-field-label">Audio File</div>
    {value ? <div className="upload-preview upload-preview-file ui44-media-preview ui44-media-preview-file">
      <span>{value.split('/').pop() || 'Uploaded MP3'}</span>
      <button type="button" className="upload-preview-remove" aria-label="Remove beat audio file" onClick={clearFile}>×</button>
    </div> : null}
    <div className="ui44-upload-actions">
      <label htmlFor={inputId} className={`os-button os-button-secondary os-button-compact${uploading ? ' ui44-upload-button-busy' : ''}`}>
        {uploading ? 'Uploading…' : 'Upload file'}
      </label>
      <Ui44FileInput id={inputId} accept="audio/mpeg,audio/mp3,.mp3" onChange={handleFileChange} disabled={uploading} className="ui44-file-input-hidden" />
      {value ? <span className="upload-state upload-state-complete">Uploaded</span> : null}
    </div>
    {message ? <div className={messageTone === 'error' ? 'dashboard-status dashboard-status-error ui44-status ui44-status-error' : messageTone === 'success' ? 'dashboard-status dashboard-status-success ui44-status ui44-status-success' : 'dashboard-status ui44-status'} role={messageTone === 'error' ? 'alert' : 'status'}>{message}</div> : null}
  </div>;
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
    (form.beatPricing === 'free'
      ? ['mp3Path']
      : BEAT_TIERS.filter(tier => form.enabledTiers.includes(tier.code)).flatMap(tier => tier.requiredFiles)
    ).concat(form.tierPrices.trackout.trim() ? ['mp3Path', 'wavPath', 'stemsPath'] : []),
  ), [form.beatPricing, form.enabledTiers, form.tierPrices.trackout]);

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
          const hasPaidOffers = ['basic', 'premium', 'trackout', 'exclusive'].some(tier => priceByTier.has(tier));
          nextForm = {
            ...nextForm,
            subtype: 'beat',
            beatPricing: hasPaidOffers ? 'paid' : priceByTier.has('free') ? 'free' : '',
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
            tierPrices: {
              ...Object.fromEntries(BEAT_TIERS.map(tier => [tier.code, tier.code === 'free' ? '0' : centsToPrice(priceByTier.get(tier.code))])),
              // Trackout remains supported by the existing RPC and stored offers, but is intentionally
              // hidden from the new UI. Carry its current price/files through edits so it is not archived
              // just because the user saved the redesigned form.
              trackout: centsToPrice(priceByTier.get('trackout')),
            } as AssetFormState['tierPrices'],
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
        if (recovered) nextForm = {
          ...nextForm,
          ...recovered,
          beatPricing: recovered.beatPricing ?? (recovered.enabledTiers?.length ? 'paid' : ''),
        };
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

  function toggleBeatTier(tier: BeatTier, checked: boolean) {
    setForm(current => {
      return {
        ...current,
        enabledTiers: checked
          ? Array.from(new Set([...current.enabledTiers, tier]))
          : current.enabledTiers.filter(code => code !== tier),
      };
    });
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
      if (!form.beatPricing) { setError('Select Free or Paid licenses under Beat Pricing.'); return; }
      const bpm = Number(form.bpm);
      if (!form.previewUrl.trim() || bpm < 40 || bpm > 240) { setError(form.beatPricing === 'free' ? 'Upload the Audio File and add a BPM from 40–240.' : 'Add an Audio Preview and a BPM from 40–240.'); return; }
      if (form.beatPricing === 'paid' && form.enabledTiers.length === 0) { setError('Select at least one paid license.'); return; }
      for (const tier of BEAT_TIERS.filter(row => form.beatPricing === 'paid' && form.enabledTiers.includes(row.code))) {
        const cents = priceToCents(form.tierPrices[tier.code]);
        if (cents === null) { setError(`Add a valid USD price for the ${tier.title}.`); return; }
        if (tier.requiredFiles.some(key => !form[key].trim())) { setError(`${tier.title} is missing a required private delivery file.`); return; }
      }
      if (form.beatPricing === 'free' && !form.mp3Path.trim()) { setError('Upload the Audio File before saving.'); return; }
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
          tierPrices: Object.fromEntries([
            ...(form.beatPricing === 'free' ? [['free', 0]] : form.enabledTiers.map(tier => [tier, priceToCents(form.tierPrices[tier])])),
            // Preserve legacy Trackout offers while keeping the option out of the visible selector.
            ...(form.beatPricing === 'paid' && form.tierPrices.trackout.trim() && priceToCents(form.tierPrices.trackout) !== null
              ? [['trackout', priceToCents(form.tierPrices.trackout)]]
              : []),
          ]) as Record<BeatTier, number>,
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
  const assetDirty = !itemId && Boolean(
    form.title.trim() || form.coverUrl || form.releaseDate || form.packFile || form.previewUrl ||
    form.mp3Path || form.wavPath || form.stemsPath || form.samplePreviews.length || form.youtubeUrl ||
    form.rightsConfirmed || form.paidDownload || form.price || form.localPrice || form.beatPricing || form.enabledTiers.length
  );

  return <PageShell>
    {!itemId ? <StudioCreateCancel dirty={assetDirty} recoveryKey={recoveryKey} href="/studio" /> : null}
    <main className="dashboard-page dashboard-editor">
      <HubHero title={itemId ? 'Edit Asset' : 'New Asset'} hideDivider actions={<button type="submit" form="studio-asset-form" className="ui44-symbol-button studio-music-publish-desktop" aria-label={itemId ? 'Save asset' : 'Publish asset'} title={itemId ? 'Save asset' : 'Publish asset'} disabled={saving || uploading}><CheckIcon /></button>} />
      {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
      <div className="dashboard-section">
        <form id="studio-asset-form" className="dashboard-form studio-artwork-create-form" onSubmit={handleSubmit}>
          <UploadField label="Artwork" folder="products/covers" userId={user.id} value={form.coverUrl} accept="image/*" previewKind="image" artworkSurface onChange={value => update('coverUrl', value)} onUploadingChange={setUploading} />

          <section className="dashboard-form-section">
            <SectionHeader title="Details" description="Add the item’s core details." showDescription />
            <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
              <label className="dashboard-field"><span className="dashboard-field-label">Title</span><Ui44TextInput required value={form.title} placeholder="Enter asset title" onChange={event => update('title', event.target.value)} /></label>
              <label className="dashboard-field"><span className="dashboard-field-label">Item Type</span><Ui44SelectInput required disabled={Boolean(itemId)} value={form.subtype} onChange={event => update('subtype', event.target.value as AssetSubtype)}><option value="">Select item type</option>{availableTypes.map(type => <option key={type} value={type}>{ASSET_TYPE_LABELS[type]}</option>)}</Ui44SelectInput></label>
              {beatLike ? <label className="dashboard-field"><span className="dashboard-field-label">BPM</span><Ui44TextInput required type="number" min={40} max={240} value={form.bpm} onChange={event => update('bpm', event.target.value)} /></label> : null}
              {beatLike ? <label className="dashboard-field"><span className="dashboard-field-label">Beat Pricing</span><Ui44SelectInput required value={form.beatPricing} onChange={event => {
                const pricing = event.target.value as BeatPricing;
                update('beatPricing', pricing);
                if (pricing === 'free') update('enabledTiers', []);
              }}>
                <option value="">Select beat pricing</option>
                <option value="free">Free</option>
                <option value="paid">Paid license</option>
              </Ui44SelectInput></label> : null}
              {beatLike && form.beatPricing === 'free' ? <FreeBeatAudioUpload
                userId={user.id}
                value={form.mp3Path}
                onChange={value => update('mp3Path', value)}
                onPreviewChange={value => update('previewUrl', value)}
                onDurationChange={value => update('previewDuration', value)}
                onUploadingChange={setUploading}
              /> : null}
              {beatLike && form.beatPricing === 'paid' ? <div className="asset-beat-preview-field">
                <UploadField label="Audio Preview" folder="products/beat-previews" userId={user.id} value={form.previewUrl} accept="audio/mpeg,audio/mp3,audio/wav" onChange={value => update('previewUrl', value)} onAudioMetadata={duration => update('previewDuration', duration.toString())} onUploadingChange={setUploading} />
              </div> : null}
            </div>
          </section>

          {form.subtype && !beatLike ? <section className="dashboard-form-section">
            <SectionHeader title="Paid Download" description="Choose whether this Sample Pack is free or paid." showDescription />
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

          {form.subtype && beatLike && form.beatPricing === 'paid' ? <section className="dashboard-form-section">
            <SectionHeader title="Licenses" description="Choose the license tiers and prices to offer." showDescription />
            <div className="dashboard-achievement-picker dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip asset-license-list">
              {BEAT_TIERS.map(tier => {
                const enabled = form.enabledTiers.includes(tier.code);
                const fields = tier.requiredFiles.map(key => BEAT_FILE_FIELDS.find(field => field.key === key)).filter((field): field is typeof BEAT_FILE_FIELDS[number] => Boolean(field));
                return <div className="dashboard-achievement-choice-row asset-license-choice-row" key={tier.code}>
                  <span className="dashboard-achievement-toggle asset-license-toggle">
                    <Ui44CheckboxInput id={`asset-license-${tier.code}`} aria-label={`Offer ${tier.title}`} checked={enabled} onChange={event => toggleBeatTier(tier.code, event.target.checked)} />
                  </span>
                  <div className="dashboard-achievement-copy asset-license-copy">
                    <label className="os-type-card-title asset-license-title" htmlFor={`asset-license-${tier.code}`}>{tier.title}</label>
                    <span className="os-type-body-small asset-license-description">{tier.copy}</span>
                    {enabled ? <>
                      <div className="dashboard-field beat-tier-price"><span className="dashboard-field-label">Price (USD)</span><Ui44TextInput inputMode="decimal" value={form.tierPrices[tier.code]} onChange={event => update('tierPrices', { ...form.tierPrices, [tier.code]: event.target.value.replace(/[^\d.]/g, '') })} placeholder="0.00" /></div>
                      {fields.map(field => <UploadField key={field.key} label={field.label} folder={field.folder} userId={user.id} value={form[field.key]} accept={field.accept} storage="private-item" onChange={value => update(field.key, value)} onUploadingChange={setUploading} />)}
                    </> : null}
                  </div>
                </div>;
              })}
            </div>
          </section> : null}

          {form.subtype && !beatLike ? <section className="dashboard-form-section">
            <SectionHeader title="Sample Pack File" description="Upload the protected ZIP file for this asset." showDescription />
            <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
              <UploadField label="Upload pack ZIP" folder="products/assets" userId={user.id} value={form.packFile} accept="application/zip,.zip" storage="private-item" onChange={value => update('packFile', value)} onUploadingChange={setUploading} />
            </div>
          </section> : null}
          {form.subtype && !beatLike ? <StudioSamplePreviewFields userId={user.id} samples={form.samplePreviews} onChange={updateSamplePreviews} onUploadingChange={setUploading} /> : null}
          {form.subtype ? <StudioRightsPanel checked={form.rightsConfirmed} onChange={checked => update('rightsConfirmed', checked)} /> : null}
        </form>
      </div>
    </main>
  </PageShell>;
}
