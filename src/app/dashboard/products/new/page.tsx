'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { UploadField } from '@/components/UploadField';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category } from '@/lib/platform';
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

export default function NewProductPage() {
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
    }

    loadFormData();
  }, [user]);

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

    const cleanTitle = title.trim();
    const cleanShortDescription = shortDescription.trim();
    const cleanLongDescription = longDescription.trim();
    const cleanType = productType.trim();

    if (!cleanTitle || !categoryId || !cleanType || !cleanShortDescription || !cleanLongDescription) {
      setError('Please fill out the title, category, type, and both descriptions.');
      return;
    }

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
    const slug = buildSlug(cleanTitle);

    const { data: insertedProduct, error: insertError } = await supabase
      .from('products')
      .insert({
        creator_id: profile?.id ?? user.id,
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
        is_free: isFree,
        cover_url: coverUrl.trim() || null,
        hero_url: heroUrl.trim() || null,
        featured: false,
        status: 'draft',
        is_published: false,
        year: year ? Number(year) : null,
      })
      .select('id')
      .single();

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
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '64px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 48, fontWeight: 780, letterSpacing: '-0.04em', marginBottom: 10 }}>
              New Product
            </h1>

            <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 18 }}>
              Create a release, game, book, apparel item, or asset directly from inside the app.
            </p>
          </div>

          <Link href="/dashboard/products" className="os-button os-button-ghost os-button-compact">
            Back to Products
          </Link>
        </div>

        <GlassPanel style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 22 }}>
            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Product Title</div>
              <input className="input" value={title} onChange={event => setTitle(event.target.value)} placeholder="Example: Here Comes The Feeling" />
            </label>

            <div style={{ display: 'grid', gap: 22, gridTemplateColumns: '1fr 1fr' }}>
              <label>
                <div style={{ marginBottom: 8, fontWeight: 700 }}>Category</div>
                <select className="input" value={categoryId} onChange={event => setCategoryId(event.target.value)}>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>

              <label>
                <div style={{ marginBottom: 8, fontWeight: 700 }}>Type</div>
                <input className="input" value={productType} onChange={event => setProductType(event.target.value)} placeholder="Album, Book, Patch, Unity WebGL…" />
              </label>
            </div>

            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Short Description</div>
              <textarea className="input" rows={3} value={shortDescription} onChange={event => setShortDescription(event.target.value)} placeholder="Short card copy." />
            </label>

            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Long Description</div>
              <textarea className="input" rows={5} value={longDescription} onChange={event => setLongDescription(event.target.value)} placeholder="Full item description used across detail and collection views." />
            </label>

            <div style={{ display: 'grid', gap: 22, gridTemplateColumns: '1fr 1fr 1fr' }}>
              <label>
                <div style={{ marginBottom: 8, fontWeight: 700 }}>Price</div>
                <input className="input" value={price} onChange={event => setPrice(formatPriceInput(event.target.value))} placeholder="0.00" />
              </label>

              <label>
                <div style={{ marginBottom: 8, fontWeight: 700 }}>Release Year</div>
                <input className="input" value={year} onChange={event => setYear(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))} placeholder="2026" />
              </label>

              <label>
                <div style={{ marginBottom: 8, fontWeight: 700 }}>Creator</div>
                <input className="input" value={creatorName} readOnly />
              </label>
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
                      Add up to 30 tracks for this release. Each track should have a title and an audio upload.
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
                    <GlassPanel key={`track-${index}`} style={{ padding: 18 }}>
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

            {error && (
              <p style={{ color: '#ff9b9b', fontSize: 14, fontWeight: 600 }}>
                {error}
              </p>
            )}

            {!isCreatorProfile(profile) && (
              <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 14 }}>
                This account is not marked as a creator yet. You can still save drafts, but switch your profile role to creator before publishing publicly.
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, justifySelf: 'start' }}>
              <button className="os-button os-button-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
              <Link className="os-button os-button-ghost" href="/dashboard/products">
                Cancel
              </Link>
            </div>
          </form>
        </GlassPanel>
      </div>
    </PageShell>
  );
}
