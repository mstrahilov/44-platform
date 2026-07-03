'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageShell, GlassPanel, HubHero } from '@/components/Ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTopbarBack } from '@/components/TopbarContext';
import { UploadField } from '@/components/UploadField';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category, Track } from '@/lib/platform';
import type { Product } from '@/lib/products';
import { currencyForCountry, normalizeMarketMode, type MarketMode } from '@/lib/marketPreferences';
import { isMissingColumnError } from '@/lib/schemaCompat';
import { getStudioDisplayName, loadStudioProfile } from '@/lib/studioProfiles';

function formatPriceInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (!digits) return '0.00';

  const cents = digits.padStart(3, '0');
  const whole = cents.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
  const decimals = cents.slice(-2);
  return `${whole}.${decimals}`;
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

export default function EditProductPage() {
  useTopbarBack({ href: '/dashboard/products', label: 'Products' });
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
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

      const [{ data: categoryRows }, profileResult] = await Promise.all([
        supabase.from('categories').select('*').eq('scope', 'products').order('sort_order'),
        loadStudioProfile(user.id),
      ]);

      setCategories((categoryRows as Category[] | null) ?? []);
      setCreatorName(getStudioDisplayName(profileResult.profile, user.email));
      const profileId = profileResult.profile?.id ?? user.id;
      const fallbackLocalCurrency = profileResult.profile?.home_currency || currencyForCountry(profileResult.profile?.home_country_code);
      setOwnerId(profileId);

      const { data: productRow } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('author_id', profileId)
        .maybeSingle();

      const product = (productRow as Product | null) ?? null;
      if (!product) {
        setError('Product not found.');
        setFetching(false);
        return;
      }

      const { data: trackRows } = await supabase.from('tracks').select('*').eq('product_id', id).order('number');

      setTitle(product.title ?? '');
      setCategoryId(product.category_id ?? '');
      setProductType(product.product_type ?? '');
      setShortDescription(product.short_description ?? '');
      setLongDescription(product.long_description ?? '');
      setPrice(((product.price_cents ?? 0) / 100).toFixed(2));
      setMarketMode(normalizeMarketMode(product.market_mode || profileResult.profile?.product_market_mode));
      setLocalPrice(((product.local_price_cents ?? 0) / 100).toFixed(2));
      setLocalCurrency(product.local_currency || fallbackLocalCurrency);
      setAvailableLocallyOnly(Boolean(product.available_locally_only));
      setCoverUrl(product.cover_url ?? '');
      setHeroUrl(product.hero_url ?? '');
      setYear(product.year ? String(product.year) : '');

      const resolvedTracks = ((trackRows as Track[] | null) ?? []).map(track => ({
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
    const profileResult = ownerId ? null : await loadStudioProfile(user.id);
    const profileId = ownerId || profileResult?.profile?.id || user.id;

    const cleanTitle = title.trim();
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
    setSuccess('');

    const priceNumber = Number(price || '0');
    const isFree = !Number.isFinite(priceNumber) || priceNumber <= 0;
    const priceCents = isFree ? 0 : Math.round(priceNumber * 100);
    const localPriceNumber = Number(localPrice || '0');
    const localPriceCents = Number.isFinite(localPriceNumber) ? Math.max(0, Math.round(localPriceNumber * 100)) : 0;

    const updatePayload = {
      title: title.trim(),
      category_id: categoryId,
      category: selectedCategory?.name ?? 'Products',
      product_type: productType.trim(),
      short_description: shortDescription.trim(),
      long_description: longDescription.trim(),
      price_cents: priceCents,
      market_mode: marketMode,
      local_price_cents: marketMode === 'global' ? null : localPriceCents,
      local_currency: marketMode === 'global' ? null : localCurrency,
      available_locally_only: availableLocallyOnly,
      is_free: isFree,
      cover_url: coverUrl.trim() || null,
      hero_url: heroUrl.trim() || null,
      year: year ? Number(year) : null,
      creator: creatorName,
    };

    let { error: updateError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .eq('author_id', profileId);

    if (isMissingColumnError(updateError)) {
      const {
        market_mode: _marketMode,
        local_price_cents: _localPriceCents,
        local_currency: _localCurrency,
        available_locally_only: _availableLocallyOnly,
        ...legacyPayload
      } = updatePayload;
      const retry = await supabase
        .from('products')
        .update(legacyPayload)
        .eq('id', id)
        .eq('author_id', profileId);
      updateError = retry.error;
    }

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    if (isMusicProduct) {
      const existingIds = tracks.map(track => track.id).filter(Boolean) as string[];
      const keptIds = visibleTracks.map(track => track.id).filter(Boolean) as string[];
      const idsToDelete = existingIds.filter(existingId => !keptIds.includes(existingId));

      for (const [index, track] of visibleTracks.entries()) {
        const payload = {
          product_id: id,
          number: index + 1,
          title: track.title.trim(),
          duration_seconds: track.durationSeconds ? Number(track.durationSeconds) : null,
          audio_url: track.audioUrl.trim(),
          download_url: null,
        };

        if (track.id) {
          const { error: trackUpdateError } = await supabase.from('tracks').update(payload).eq('id', track.id).eq('product_id', id);
          if (trackUpdateError) {
            setSaving(false);
            setError(trackUpdateError.message);
            return;
          }
        } else {
          const { error: trackInsertError } = await supabase.from('tracks').insert(payload);
          if (trackInsertError) {
            setSaving(false);
            setError(trackInsertError.message);
            return;
          }
        }
      }

      if (idsToDelete.length) {
        const { error: deleteError } = await supabase.from('tracks').delete().in('id', idsToDelete).eq('product_id', id);
        if (deleteError) {
          setSaving(false);
          setError(deleteError.message);
          return;
        }
      }
    }

    setSaving(false);
    setSuccess('Changes saved.');
    router.push('/dashboard/products');
  }

  if (loading || !user || fetching) return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;

  async function handleDelete() {
    if (!user) return;
    setDeleting(true);
    setError('');
    setSuccess('');

    const profileResult = ownerId ? null : await loadStudioProfile(user.id);
    const profileId = ownerId || profileResult?.profile?.id || user.id;

    const { data: ownedProduct, error: ownershipError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .eq('author_id', profileId)
      .maybeSingle();

    if (ownershipError || !ownedProduct) {
      setDeleting(false);
      setError(ownershipError?.message || 'Product not found.');
      return;
    }

    const { error: tracksError } = await supabase.from('tracks').delete().eq('product_id', id);
    if (tracksError) {
      setDeleting(false);
      setError(tracksError.message);
      return;
    }

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('author_id', profileId);

    if (deleteError) {
      setDeleting(false);
      setError(deleteError.message);
      return;
    }

    setDeleting(false);
    router.push('/dashboard/products');
  }

  const hasTracks = tracks.some(track => track.title.trim() || track.audioUrl.trim());
  const deleteDescription = hasTracks || isMusicProduct
    ? 'Delete this product? This will permanently remove the release and its tracklist from 44.'
    : 'Delete this product? This will permanently remove it from 44.';

  return (
    <PageShell>
      <div className="dashboard-editor">
        <HubHero title="Edit Product" copy="Update the product details stored in 44." />
        <div className="dashboard-flat">
          <form onSubmit={handleSubmit} className="dashboard-form">
            <label className="dashboard-field"><div className="dashboard-field-label">Product Title</div><input className="input" value={title} onChange={e => setTitle(e.target.value)} /></label>

            <div className="dashboard-form-grid dashboard-form-grid-2">
              <label className="dashboard-field"><div className="dashboard-field-label">Category</div><select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="dashboard-field"><div className="dashboard-field-label">Type</div><input className="input" value={productType} onChange={e => setProductType(e.target.value)} /></label>
            </div>

            <label className="dashboard-field"><div className="dashboard-field-label">Short Description</div><textarea className="input" rows={3} value={shortDescription} onChange={e => setShortDescription(e.target.value)} /></label>
            <label className="dashboard-field"><div className="dashboard-field-label">Long Description</div><textarea className="input" rows={5} value={longDescription} onChange={e => setLongDescription(e.target.value)} /></label>

            <div className="dashboard-form-grid dashboard-form-grid-3">
              <label className="dashboard-field"><div className="dashboard-field-label">Price (USD)</div><input className="input" value={price} onChange={e => setPrice(formatPriceInput(e.target.value))} /></label>
              {marketMode !== 'global' && (
                <label className="dashboard-field"><div className="dashboard-field-label">Local Price ({localCurrency})</div><input className="input" value={localPrice} onChange={e => setLocalPrice(formatPriceInput(e.target.value))} /></label>
              )}
              <label className="dashboard-field"><div className="dashboard-field-label">Release Year</div><input className="input" value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
              <label className="dashboard-field"><div className="dashboard-field-label">Creator</div><input className="input" value={creatorName} readOnly /></label>
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
                      Update the release tracklist here. Each visible row should have a title and an audio upload.
                    </p>
                  </div>

                  <label className="dashboard-field" style={{ minWidth: 140 }}>
                    <div className="dashboard-field-label">Track Count</div>
                    <select className="input" value={trackCount} onChange={event => setTrackCount(event.target.value)}>
                      {Array.from({ length: 30 }, (_, index) => index + 1).map(count => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={{ display: 'grid', gap: 16 }}>
                  {tracks.slice(0, Number(trackCount || '0')).map((track, index) => (
                    <GlassPanel key={track.id ?? `track-${index}`} style={{ padding: 18 }}>
                      <div style={{ display: 'grid', gap: 16 }}>
                        <div className="dashboard-field-label">Track {index + 1}</div>

                        <div className="dashboard-form-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 180px' }}>
                          <label className="dashboard-field">
                            <div className="dashboard-field-label">Track Title</div>
                            <input
                              className="input"
                              value={track.title}
                              onChange={event => updateTrack(index, { title: event.target.value })}
                              placeholder={`Track ${index + 1} title`}
                            />
                          </label>

                          <label className="dashboard-field">
                            <div className="dashboard-field-label">Duration (seconds)</div>
                            <input
                              className="input"
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
            {success && <div className="dashboard-status dashboard-status-success">{success}</div>}

            <div className="dashboard-form-actions">
              <div className="dashboard-form-actions-left">
                <button className="os-button os-button-danger" type="button" onClick={() => setShowDeleteConfirm(true)}>Delete Product</button>
              </div>
              <div className="dashboard-form-actions-right">
                <Link className="os-button os-button-secondary" href="/dashboard/products">Cancel</Link>
                <button className="os-button os-button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          </form>
        </div>
        <ConfirmDialog
          open={showDeleteConfirm}
          title="Delete Product"
          description={deleteDescription}
          confirmLabel="Delete Product"
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
