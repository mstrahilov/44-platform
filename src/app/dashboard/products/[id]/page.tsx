'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { UploadField } from '@/components/UploadField';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category, Track } from '@/lib/platform';
import type { Product } from '@/lib/products';
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

export default function EditProductPage() {
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
  const [coverUrl, setCoverUrl] = useState('');
  const [heroUrl, setHeroUrl] = useState('');
  const [year, setYear] = useState('');
  const [trackCount, setTrackCount] = useState('1');
  const [tracks, setTracks] = useState<DraftTrack[]>([createDraftTrack()]);
  const [ownerId, setOwnerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

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

  const isMusicProduct = selectedCategory?.name?.toLowerCase() === 'music';

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

    const visibleTracks = tracks.slice(0, Number(trackCount || '0'));
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

    const { error: updateError } = await supabase
      .from('products')
      .update({
        title: title.trim(),
        category_id: categoryId,
        product_type: productType.trim(),
        short_description: shortDescription.trim(),
        long_description: longDescription.trim(),
        price_cents: priceCents,
        is_free: isFree,
        cover_url: coverUrl.trim() || null,
        hero_url: heroUrl.trim() || null,
        year: year ? Number(year) : null,
        creator: creatorName,
      })
      .eq('id', id)
      .eq('author_id', profileId);

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
    router.push('/dashboard/products');
  }

  if (loading || !user || fetching) return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;

  async function handleDelete() {
    if (!user) return;
    const confirmed = window.confirm('Delete this product? This will also remove its tracks.');
    if (!confirmed) return;

    const profileResult = ownerId ? null : await loadStudioProfile(user.id);
    const profileId = ownerId || profileResult?.profile?.id || user.id;

    const { data: ownedProduct, error: ownershipError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .eq('author_id', profileId)
      .maybeSingle();

    if (ownershipError || !ownedProduct) {
      setError(ownershipError?.message || 'Product not found.');
      return;
    }

    const { error: tracksError } = await supabase.from('tracks').delete().eq('product_id', id);
    if (tracksError) {
      setError(tracksError.message);
      return;
    }

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('author_id', profileId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    router.push('/dashboard/products');
  }

  return (
    <PageShell>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '64px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 48, fontWeight: 780, letterSpacing: '-0.04em', marginBottom: 10 }}>Edit Product</h1>
            <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 18 }}>Update the product details stored in 44.</p>
          </div>
          <Link href="/dashboard/products" className="os-button os-button-ghost os-button-compact">Back to Products</Link>
        </div>

        <GlassPanel style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 22 }}>
            <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Product Title</div><input className="input" value={title} onChange={e => setTitle(e.target.value)} /></label>

            <div style={{ display: 'grid', gap: 22, gridTemplateColumns: '1fr 1fr' }}>
              <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Category</div><select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Type</div><input className="input" value={productType} onChange={e => setProductType(e.target.value)} /></label>
            </div>

            <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Short Description</div><textarea className="input" rows={3} value={shortDescription} onChange={e => setShortDescription(e.target.value)} /></label>
            <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Long Description</div><textarea className="input" rows={5} value={longDescription} onChange={e => setLongDescription(e.target.value)} /></label>

            <div style={{ display: 'grid', gap: 22, gridTemplateColumns: '1fr 1fr 1fr' }}>
              <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Price</div><input className="input" value={price} onChange={e => setPrice(formatPriceInput(e.target.value))} /></label>
              <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Release Year</div><input className="input" value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
              <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Creator</div><input className="input" value={creatorName} readOnly /></label>
            </div>

            <div style={{ display: 'grid', gap: 22, gridTemplateColumns: '1fr 1fr' }}>
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
              <div style={{ display: 'grid', gap: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Tracks</div>
                    <div style={{ color: 'var(--os-color-ink-secondary)', fontSize: 14 }}>
                      Update the release tracklist here. Each visible row should have a title and an audio upload.
                    </div>
                  </div>

                  <label style={{ minWidth: 140 }}>
                    <div style={{ marginBottom: 8, fontWeight: 700 }}>Track Count</div>
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
                        <div style={{ fontWeight: 700 }}>Track {index + 1}</div>

                        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr) 180px' }}>
                          <label>
                            <div style={{ marginBottom: 8, fontWeight: 700 }}>Track Title</div>
                            <input
                              className="input"
                              value={track.title}
                              onChange={event => updateTrack(index, { title: event.target.value })}
                              placeholder={`Track ${index + 1} title`}
                            />
                          </label>

                          <label>
                            <div style={{ marginBottom: 8, fontWeight: 700 }}>Duration (seconds)</div>
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

            {error && <p style={{ color: '#ff9b9b', fontSize: 14, fontWeight: 600 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 12, justifySelf: 'start' }}>
              <button className="os-button os-button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              <Link className="os-button os-button-ghost" href="/dashboard/products">Cancel</Link>
              <button className="os-button os-button-ghost" type="button" onClick={handleDelete}>Delete Product</button>
            </div>
          </form>
        </GlassPanel>
      </div>
    </PageShell>
  );
}
