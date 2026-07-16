'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, HubHero, CenteredMessage, SectionHeader } from '@/components/Ui';
import { useTopbarBack } from '@/components/TopbarContext';
import { UploadField } from '@/components/UploadField';
import { TagMultiSelect } from '@/components/TagMultiSelect';
import { Ui44CheckboxInput, Ui44SelectInput, Ui44TextInput, Ui44Textarea } from '@/components/ui44/Inputs';
import { useAuth } from '@/lib/useAuth';
import { listCatalogTaxonomy } from '@/lib/domain/studioPublishing';
import {
  beatReviewSurfacesEnabled,
  isBeatDatabaseReviewEnabled,
  listBeatAttributeTerms,
  loadOwnedBeatEditor,
  saveOwnedBeatDraft,
  type BeatAttributeTerm,
} from '@/lib/domain/beats';
import { clearStudioFormRecovery, readStudioFormRecovery, writeStudioFormRecovery } from '@/lib/studioFormRecovery';
import type { Database } from '@/lib/database.types';

type TierCode = 'basic' | 'premium' | 'trackout' | 'exclusive';
type BeatFormState = {
  title: string; description: string; coverUrl: string; releaseDate: string; previewUrl: string; previewDuration: string;
  bpm: string; keyRoot: string; keyMode: string; keyNotApplicable: boolean; timeSignature: string;
  sampleStatus: string; sampleDisclosure: string; externalUrl: string; tagIds: string[]; attributeTermIds: string[];
  mp3Path: string; wavPath: string; stemsPath: string; enabledTiers: TierCode[]; tierPrices: Record<TierCode, string>;
  rightsConfirmed: boolean;
};

const TIER_DEFINITIONS: Array<{ code: TierCode; title: string; files: string }> = [
  { code: 'basic', title: 'Basic', files: 'Untagged MP3' },
  { code: 'premium', title: 'Premium', files: 'MP3 + WAV' },
  { code: 'trackout', title: 'Trackout', files: 'MP3 + WAV + stems' },
  { code: 'exclusive', title: 'Exclusive', files: 'One sale · MP3 + WAV + stems' },
];

const EMPTY_FORM: BeatFormState = {
  title: '', description: '', coverUrl: '', releaseDate: '', previewUrl: '', previewDuration: '', bpm: '',
  keyRoot: 'C', keyMode: 'minor', keyNotApplicable: false, timeSignature: '4/4', sampleStatus: 'none',
  sampleDisclosure: '', externalUrl: '', tagIds: [], attributeTermIds: [], mp3Path: '', wavPath: '', stemsPath: '',
  enabledTiers: [], tierPrices: { basic: '', premium: '', trackout: '', exclusive: '' }, rightsConfirmed: false,
};

function dollarsToCents(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

function centsToDollars(value: number) {
  return (value / 100).toFixed(2);
}

export function BeatStudioForm({ itemId = null }: { itemId?: string | null }) {
  useTopbarBack({ href: '/studio#beats', label: 'Beats' });
  const router = useRouter();
  const { user, loading } = useAuth();
  const [form, setForm] = useState<BeatFormState>(EMPTY_FORM);
  const [tags, setTags] = useState<Database['public']['Tables']['item_tags']['Row'][]>([]);
  const [attributeTerms, setAttributeTerms] = useState<BeatAttributeTerm[]>([]);
  const [databaseEnabled, setDatabaseEnabled] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const recoveryKey = user?.id ? `beat:${itemId ?? 'new'}:${user.id}` : '';

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    if (!user || !beatReviewSurfacesEnabled) return;
    let alive = true;
    void Promise.all([listCatalogTaxonomy(), listBeatAttributeTerms(), isBeatDatabaseReviewEnabled(), itemId ? loadOwnedBeatEditor(itemId, user.id) : Promise.resolve(null)])
      .then(([taxonomy, terms, enabled, editor]) => {
        if (!alive) return;
        const beatType = taxonomy.types.find(type => type.slug === 'beat');
        setTags(taxonomy.tags.filter(tag => tag.category_id === beatType?.category_id));
        setAttributeTerms(terms);
        setDatabaseEnabled(enabled);
        if (editor?.beat) {
          const offersByTier = new Map(editor.beat.licenseOffers.map(offer => [offer.tierCode, offer]));
          setForm({
            title: editor.item.title,
            description: editor.item.long_description ?? '',
            coverUrl: editor.item.cover_url ?? '',
            releaseDate: editor.item.release_date ?? '',
            previewUrl: editor.preview?.audio_url ?? '',
            previewDuration: editor.preview?.duration_seconds?.toString() ?? '',
            bpm: editor.beat.bpm.toString(),
            keyRoot: editor.beat.keyRoot ?? 'C',
            keyMode: editor.beat.keyMode ?? 'minor',
            keyNotApplicable: editor.beat.keyNotApplicable,
            timeSignature: editor.beat.timeSignature,
            sampleStatus: editor.beat.sampleStatus,
            sampleDisclosure: editor.beat.sampleDisclosure ?? '',
            externalUrl: editor.externalUrl,
            tagIds: editor.tagIds,
            attributeTermIds: editor.attributeTermIds,
            mp3Path: editor.privateFiles.untagged_mp3 ?? '',
            wavPath: editor.privateFiles.untagged_wav ?? '',
            stemsPath: editor.privateFiles.stems_zip ?? '',
            enabledTiers: TIER_DEFINITIONS.map(tier => tier.code).filter(tier => offersByTier.has(tier)),
            tierPrices: Object.fromEntries(TIER_DEFINITIONS.map(tier => [tier.code, offersByTier.has(tier.code) ? centsToDollars(offersByTier.get(tier.code)?.priceCents ?? 0) : ''])) as Record<TierCode, string>,
            rightsConfirmed: true,
          });
        } else {
          const recovered = readStudioFormRecovery<BeatFormState>(recoveryKey);
          if (recovered) setForm(recovered);
        }
        setReady(true);
      })
      .catch(loadError => {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load Beat Studio.');
        setReady(true);
      });
    return () => { alive = false; };
  }, [itemId, recoveryKey, user]);

  useEffect(() => {
    if (!ready || !recoveryKey) return;
    writeStudioFormRecovery(recoveryKey, form);
  }, [form, ready, recoveryKey]);

  const moods = useMemo(() => attributeTerms.filter(term => term.attribute_kind === 'mood'), [attributeTerms]);
  const instruments = useMemo(() => attributeTerms.filter(term => term.attribute_kind === 'instrument'), [attributeTerms]);
  const selectedMoods = form.attributeTermIds.filter(id => moods.some(term => term.id === id));
  const selectedInstruments = form.attributeTermIds.filter(id => instruments.some(term => term.id === id));
  const update = <K extends keyof BeatFormState>(key: K, value: BeatFormState[K]) => setForm(current => ({ ...current, [key]: value }));

  if (loading || !ready) return <PageShell><CenteredMessage status>Loading Beat Studio…</CenteredMessage></PageShell>;
  if (!beatReviewSurfacesEnabled) return <PageShell><CenteredMessage>This review-only surface is disabled in this build.</CenteredMessage></PageShell>;
  if (!user) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;
    const bpm = Number(form.bpm);
    if (!databaseEnabled) { setError('The database Beat review control is off. An administrator must enable the review environment before drafts can be saved.'); return; }
    if (!form.title.trim() || !form.coverUrl || !form.releaseDate || !form.previewUrl || bpm < 40 || bpm > 240) { setError('Add title, square artwork, release date, tagged preview, and a BPM from 40–240.'); return; }
    if (!form.rightsConfirmed) { setError('Confirm that you own or control the Beat, uploads, samples, and licensing rights.'); return; }
    if (form.sampleStatus !== 'none' && !form.sampleDisclosure.trim()) { setError('Describe required credit or clearance for declared samples and loops.'); return; }
    const prices: Partial<Record<TierCode, number>> = {};
    for (const tier of form.enabledTiers) {
      const cents = dollarsToCents(form.tierPrices[tier]);
      if (cents === null) { setError(`Add a valid USD price for the ${tier} license.`); return; }
      prices[tier] = cents;
      if (!form.mp3Path || ((tier === 'premium' || tier === 'trackout' || tier === 'exclusive') && !form.wavPath) || ((tier === 'trackout' || tier === 'exclusive') && !form.stemsPath)) {
        setError(`${tier[0].toUpperCase() + tier.slice(1)} is missing a required private delivery file.`); return;
      }
    }
    setSaving(true); setError('');
    try {
      const savedId = await saveOwnedBeatDraft({
        itemId, title: form.title.trim(), description: form.description.trim(), coverUrl: form.coverUrl,
        releaseDate: form.releaseDate, previewUrl: form.previewUrl, previewDuration: Number(form.previewDuration || 0), bpm,
        keyRoot: form.keyRoot, keyMode: form.keyMode, keyNotApplicable: form.keyNotApplicable, timeSignature: form.timeSignature,
        sampleStatus: form.sampleStatus, sampleDisclosure: form.sampleDisclosure.trim(), externalUrl: form.externalUrl.trim(),
        tagIds: form.tagIds, attributeTermIds: form.attributeTermIds,
        privateFiles: { untagged_mp3: form.mp3Path, untagged_wav: form.wavPath, stems_zip: form.stemsPath }, tierPrices: prices,
      });
      clearStudioFormRecovery(recoveryKey);
      router.push(`/studio/beats/${savedId}?saved=1`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this Beat draft.');
    } finally {
      setSaving(false);
    }
  }

  return <PageShell>
    <main className="dashboard-page beat-studio-page">
      <HubHero title={itemId ? 'Edit Beat' : 'Add Beat'} copy="Create one canonical, shareable Beat Item with a tagged preview and standardized license offers." />
      {!databaseEnabled && <div className="dashboard-status dashboard-status-warning ui44-status ui44-status-warning" role="status">Review UI is visible, but database Beat review writes remain fail-closed.</div>}
      {error && <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div>}
      <form className="dashboard-form" onSubmit={handleSubmit}>
        <section className="dashboard-section"><SectionHeader title="Beat" /><div className="dashboard-form-grid">
          <label className="dashboard-field"><span className="dashboard-field-label">Title</span><Ui44TextInput value={form.title} onChange={event => update('title', event.target.value)} required /></label>
          <label className="dashboard-field"><span className="dashboard-field-label">Release date</span><Ui44TextInput type="date" value={form.releaseDate} onChange={event => update('releaseDate', event.target.value)} required /></label>
          <div className="dashboard-field dashboard-field-wide"><UploadField label="Square artwork" folder="products/covers" userId={user.id} value={form.coverUrl} accept="image/*" previewKind="image" onChange={value => update('coverUrl', value)} /></div>
          <label className="dashboard-field dashboard-field-wide"><span className="dashboard-field-label">Description</span><Ui44Textarea value={form.description} onChange={event => update('description', event.target.value)} rows={5} /></label>
          <div className="dashboard-field dashboard-field-wide"><UploadField label="Tagged MP3 preview" folder="products/beat-previews" userId={user.id} value={form.previewUrl} accept="audio/mpeg,audio/mp3" onChange={value => update('previewUrl', value)} onAudioMetadata={duration => update('previewDuration', duration.toString())} /></div>
          <label className="dashboard-field"><span className="dashboard-field-label">YouTube link</span><Ui44TextInput type="url" value={form.externalUrl} onChange={event => update('externalUrl', event.target.value)} placeholder="https://youtube.com/…" /></label>
        </div></section>

        <section className="dashboard-section"><SectionHeader title="Sound" /><div className="dashboard-form-grid">
          <label className="dashboard-field"><span className="dashboard-field-label">BPM</span><Ui44TextInput type="number" min={40} max={240} value={form.bpm} onChange={event => update('bpm', event.target.value)} required /></label>
          <label className="dashboard-field"><span className="dashboard-field-label">Time signature</span><Ui44SelectInput value={form.timeSignature} onChange={event => update('timeSignature', event.target.value)}>{['2/4','3/4','4/4','5/4','6/8','7/8','12/8'].map(value => <option key={value}>{value}</option>)}</Ui44SelectInput></label>
          <label className="dashboard-field"><span className="dashboard-field-label">Key</span><Ui44SelectInput disabled={form.keyNotApplicable} value={form.keyRoot} onChange={event => update('keyRoot', event.target.value)}>{['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map(value => <option key={value}>{value}</option>)}</Ui44SelectInput></label>
          <label className="dashboard-field"><span className="dashboard-field-label">Mode</span><Ui44SelectInput disabled={form.keyNotApplicable} value={form.keyMode} onChange={event => update('keyMode', event.target.value)}><option value="major">Major</option><option value="minor">Minor</option></Ui44SelectInput></label>
          <label className="dashboard-check-row dashboard-field-wide"><Ui44CheckboxInput checked={form.keyNotApplicable} onChange={event => update('keyNotApplicable', event.target.checked)} /><span>Atonal / key not applicable</span></label>
          <div className="dashboard-field dashboard-field-wide"><span className="dashboard-field-label">Genre / style</span><TagMultiSelect options={tags.map(tag => ({ id: tag.id, label: tag.label }))} value={form.tagIds} onChange={value => update('tagIds', value)} /></div>
          <div className="dashboard-field"><span className="dashboard-field-label">Moods</span><TagMultiSelect options={moods.map(term => ({ id: term.id, label: term.label }))} value={selectedMoods} onChange={value => update('attributeTermIds', [...selectedInstruments, ...value])} /></div>
          <div className="dashboard-field"><span className="dashboard-field-label">Instruments</span><TagMultiSelect options={instruments.map(term => ({ id: term.id, label: term.label }))} value={selectedInstruments} onChange={value => update('attributeTermIds', [...selectedMoods, ...value])} /></div>
          <label className="dashboard-field"><span className="dashboard-field-label">Third-party samples / loops</span><Ui44SelectInput value={form.sampleStatus} onChange={event => update('sampleStatus', event.target.value)}><option value="none">None</option><option value="royalty_free">Royalty-free</option><option value="separately_cleared">Separately cleared</option></Ui44SelectInput></label>
          {form.sampleStatus !== 'none' && <label className="dashboard-field dashboard-field-wide"><span className="dashboard-field-label">Disclosure and required credit</span><Ui44Textarea value={form.sampleDisclosure} onChange={event => update('sampleDisclosure', event.target.value)} rows={4} required /></label>}
        </div></section>

        <section className="dashboard-section"><SectionHeader title="Private delivery files" /><div className="dashboard-form-grid">
          <UploadField label="Untagged MP3" folder="beats/mp3" userId={user.id} value={form.mp3Path} accept="audio/mpeg,audio/mp3" storage="private-item" onChange={value => update('mp3Path', value)} />
          <UploadField label="Untagged WAV" folder="beats/wav" userId={user.id} value={form.wavPath} accept="audio/wav,audio/x-wav" storage="private-item" onChange={value => update('wavPath', value)} />
          <UploadField label="Stems / trackouts ZIP" folder="beats/stems" userId={user.id} value={form.stemsPath} accept="application/zip,application/x-zip-compressed" storage="private-item" onChange={value => update('stemsPath', value)} />
        </div></section>

        <section className="dashboard-section"><SectionHeader title="License offers" /><p className="os-type-body">Draft standard terms are shown for review only. Offers cannot become purchasable until counsel approves a new template version and commerce is activated.</p><div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass">
          {TIER_DEFINITIONS.map(tier => {
            const enabled = form.enabledTiers.includes(tier.code);
            return <div className="dashboard-list-row beat-tier-row" key={tier.code}>
              <label className="dashboard-check-row"><Ui44CheckboxInput checked={enabled} onChange={event => update('enabledTiers', event.target.checked ? [...form.enabledTiers, tier.code] : form.enabledTiers.filter(code => code !== tier.code))} /><span><strong>{tier.title}</strong><small>{tier.files}</small></span></label>
              <label className="dashboard-field beat-tier-price"><span className="dashboard-field-label">USD price</span><Ui44TextInput inputMode="decimal" disabled={!enabled} value={form.tierPrices[tier.code]} onChange={event => update('tierPrices', { ...form.tierPrices, [tier.code]: event.target.value.replace(/[^\d.]/g, '') })} placeholder="0.00" /></label>
            </div>;
          })}
        </div></section>

        <label className="dashboard-check-row"><Ui44CheckboxInput checked={form.rightsConfirmed} onChange={event => update('rightsConfirmed', event.target.checked)} /><span>I own or control this Beat, every upload, all samples and loops, and the rights needed to offer these licenses.</span></label>
        <div className="dashboard-form-actions"><button type="submit" className="os-button os-button-primary" disabled={saving || !databaseEnabled}>{saving ? 'Saving…' : 'Save Beat Draft'}</button><Link href="/studio" className="os-button os-button-ghost">Cancel</Link></div>
      </form>
    </main>
  </PageShell>;
}
