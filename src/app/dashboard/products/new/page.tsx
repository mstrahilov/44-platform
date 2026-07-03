'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel, HubHero } from '@/components/Ui';
import { useTopbarBack } from '@/components/TopbarContext';
import { UploadField } from '@/components/UploadField';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category } from '@/lib/platform';
import { currencyForCountry, normalizeMarketMode, type MarketMode } from '@/lib/marketPreferences';
import { isMissingColumnError } from '@/lib/schemaCompat';
import { getStudioDisplayName, isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { normalizeTaxonomyValue } from '@/lib/taxonomy';

function buildSlug(title: string) {
  const base = normalizeTaxonomyValue(title) || 'product';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function formatPriceInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (!digits) return '0.00';

  const cents = digits.padStart(3, '0');
  const whole = cents.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
  const decimals = cents.slice(-2);
  return `${whole}.${decimals}`;
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

function isMusicDraft(category: Category | null, productType: string) {
  const categoryName = category?.name?.toLowerCase() ?? '';
  const categorySlug = category?.slug?.toLowerCase() ?? '';
  const type = productType.toLowerCase();

  return categoryName.includes('music')
    || categorySlug.includes('music')
    || type.includes('album')
    || type.includes('single')
    || type.includes('ep')
    || type.includes('track')
    || type.includes('song');
}

export default function NewProductPage() {
  useTopbarBack({ href: '/dashboard/products', label: 'Products' });
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [creatorName, setCreatorName] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productType, setProductType] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [price, setPrice] = useState('0.00');
  const [marketMode, setMarketMode] = useState<MarketMode>('global');
  const [localPrice, setLocalPrice] = useState('0.00');
  const [localCurrency, setLocalCurrency] = useState('USD');
  const [availableLocallyOnly, setAvailableLocallyOnly] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [heroUrl, setHeroUrl] = useState('');
  const [year, setYear] = useState('');
  const [trackCount, setTrackCount] = useState('1');
  const [tracks, setTracks] = useState<DraftTrack[]>([createDraftTrack()]);
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
      setCategoryId(resolvedCategories[0]?.id ?? '');

      setProfile(profileResult.profile);
      setCreatorName(getStudioDisplayName(profileResult.profile, user.email));
      const nextMode = normalizeMarketMode(profileResult.profile?.product_market_mode);
      const nextCurrency = profileResult.profile?.home_currency || currencyForCountry(profileResult.profile?.home_country_code);
      setMarketMode(nextMode);
      setLocalCurrency(nextCurrency);
    }

    loadFormData();
  }, [user]);

  const selectedCategory = useMemo(
    () => categories.find(category => category.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const isMusicProduct = isMusicDraft(selectedCategory, productType);

  useEffect(() => {
    if (!isMusicProduct) return;
    setTracks(current => ensureTrackCount(current, Number(trackCount || '0')));
  }, [isMusicProduct, trackCount]);

  function updateTrack(index: number, patch: Partial<DraftTrack>) {
    setTracks(current => current.map((track, trackIndex) => (trackIndex === index ? { ...track, ...patch } : track)));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const cleanTitle = title.trim();
    const cleanShortDescription = shortDescription.trim();
    const cleanLongDescription = longDescription.trim();
    const cleanType = productType.trim();

    if (!cleanTitle || !categoryId || !cleanType || !cleanShortDescription || !cleanLongDescription) {
      setError('Please fill out the title, category, type, and both descriptions.');
      return;
    }

    const visibleTracks = tracks.slice(0, Number(trackCount || '0')).map((track, index, list) => ({
      ...track,
      title: track.title.trim() || (list.length === 1 ? cleanTitle : ''),
    }));
    if (isMusicProduct) {
      const hasInvalidTrack = visibleTracks.some(track => !track.title.trim() || !track.audioUrl.trim());
      if (!visibleTracks.length || hasInvalidTrack) {
        setError('Music products need track titles and uploaded audio for each track.');
        return;
      }
    }

    setSaving(true);
    setError('');

    const priceNumber = Number(price || '0');
    const isFree = !Number.isFinite(priceNumber) || priceNumber <= 0;
    const priceCents = isFree ? 0 : Math.round(priceNumber * 100);
    const localPriceNumber = Number(localPrice || '0');
    const localPriceCents = Number.isFinite(localPriceNumber) ? Math.max(0, Math.round(localPriceNumber * 100)) : 0;
    const slug = buildSlug(cleanTitle);

    const insertPayload = {
      author_id: profile?.id ?? user.id,
      category_id: categoryId,
      slug,
      title: cleanTitle,
      creator: creatorName,
      product_type: cleanType,
      category: selectedCategory?.name ?? 'Products',
      short_description: cleanShortDescription,
      long_description: cleanLongDescription,
      price_cents: priceCents,
      market_mode: marketMode,
      local_price_cents: marketMode === 'global' ? null : localPriceCents,
      local_currency: marketMode === 'global' ? null : localCurrency,
      available_locally_only: availableLocallyOnly,
      is_free: isFree,
      cover_url: coverUrl.trim() || null,
      hero_url: heroUrl.trim() || null,
      featured: false,
      status: 'draft',
      is_published: false,
      year: year ? Number(year) : null,
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
        duration_seconds: track.durationSeconds ? Number(track.durationSeconds) : null,
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

    setSaving(false);
    router.push('/dashboard/products');
  }

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  return (
    <PageShell>
      <div className="dashboard-editor">
        <HubHero
          title="New Product"
          copy="Create a release, game, book, apparel item, or asset directly from inside the app."
        />

        <div className="dashboard-section">
          <form onSubmit={handleSubmit} className="dashboard-form">
            <label className="dashboard-field">
              <div className="dashboard-field-label">Product Title</div>
              <input className="os-input-field" value={title} onChange={event => setTitle(event.target.value)} placeholder="Example: Here Comes The Feeling" />
            </label>

            <div className="dashboard-form-grid dashboard-form-grid-2">
              <label className="dashboard-field">
                <div className="dashboard-field-label">Category</div>
                <select className="os-input-field" value={categoryId} onChange={event => setCategoryId(event.target.value)}>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>

              <label className="dashboard-field">
                <div className="dashboard-field-label">Type</div>
                <input className="os-input-field" value={productType} onChange={event => setProductType(event.target.value)} placeholder="Album, Book, Patch, Unity WebGL…" />
              </label>
            </div>

            <label className="dashboard-field">
              <div className="dashboard-field-label">Short Description</div>
              <textarea className="os-input-textarea" rows={3} value={shortDescription} onChange={event => setShortDescription(event.target.value)} placeholder="Short card copy." />
            </label>

            <label className="dashboard-field">
              <div className="dashboard-field-label">Long Description</div>
              <textarea className="os-input-textarea" rows={5} value={longDescription} onChange={event => setLongDescription(event.target.value)} placeholder="Full item description used across detail and library views." />
            </label>

            <div className="dashboard-form-grid dashboard-form-grid-3">
              <label className="dashboard-field">
                <div className="dashboard-field-label">Price (USD)</div>
                <input className="os-input-field" value={price} onChange={event => setPrice(formatPriceInput(event.target.value))} placeholder="0.00" />
              </label>

              {marketMode !== 'global' && (
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Local Price ({localCurrency})</div>
                  <input className="os-input-field" value={localPrice} onChange={event => setLocalPrice(formatPriceInput(event.target.value))} placeholder="0.00" />
                </label>
              )}

              <label className="dashboard-field">
                <div className="dashboard-field-label">Release Year</div>
                <input className="os-input-field" value={year} onChange={event => setYear(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))} placeholder="2026" />
              </label>

              <label className="dashboard-field">
                <div className="dashboard-field-label">Creator</div>
                <input className="os-input-field" value={creatorName} readOnly />
              </label>
            </div>

            <div className="settings-field">
              <div className="settings-field-head">
                <div className="os-type-card-title">Market</div>
                <p className="os-type-body-small">Choose whether this product uses one global USD price or adds a local market price.</p>
              </div>
              <div className="settings-segment" role="group" aria-label="Product market">
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
              <label className="dashboard-field" style={{ marginTop: 14 }}>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={availableLocallyOnly}
                    onChange={event => setAvailableLocallyOnly(event.target.checked)}
                  />
                  <span className="dashboard-field-label">Item available locally only</span>
                </span>
                <p className="dashboard-form-note">You can change your local market in Preferences.</p>
              </label>
            </div>

            <div className="dashboard-form-grid dashboard-form-grid-2">
              <UploadField
                label="Cover Image"
                folder="products/covers"
                userId={user.id}
                value={coverUrl}
                accept="image/*"
                buttonLabel="Upload cover"
                onChange={setCoverUrl}
              />

              <UploadField
                label="Hero Image"
                folder="products/heroes"
                userId={user.id}
                value={heroUrl}
                accept="image/*"
                buttonLabel="Upload hero"
                onChange={setHeroUrl}
              />
            </div>

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

            {error && <div className="dashboard-status dashboard-status-error">{error}</div>}

            {!isCreatorProfile(profile) && (
              <p className="dashboard-form-note">
                This account is not marked as a creator yet. You can still save drafts, but switch your profile role to creator before publishing publicly.
              </p>
            )}

            <div className="dashboard-form-actions">
              <div className="dashboard-form-actions-left" />
              <div className="dashboard-form-actions-right">
                <Link className="os-button os-button-secondary" href="/dashboard/products">
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
