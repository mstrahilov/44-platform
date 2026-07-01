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
  const base = normalizeTaxonomyValue(title) || 'service';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function formatPriceInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, '');
  const [whole = '', decimals = ''] = normalized.split('.');
  return decimals ? `${whole}.${decimals.slice(0, 2)}` : whole;
}

export default function NewServicePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [creatorName, setCreatorName] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('0.00');
  const [deliveryEstimate, setDeliveryEstimate] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
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
        supabase.from('categories').select('*').eq('scope', 'services').order('sort_order'),
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const cleanTitle = title.trim();
    const cleanShortDescription = shortDescription.trim();
    const cleanLongDescription = longDescription.trim();
    const cleanType = serviceType.trim();

    if (!cleanTitle || !categoryId || !cleanType || !cleanShortDescription || !cleanLongDescription) {
      setError('Please fill out the title, category, type, and both descriptions.');
      return;
    }

    setSaving(true);
    setError('');

    const priceNumber = Number(startingPrice || '0');
    const startingPriceCents = Number.isFinite(priceNumber) ? Math.max(0, Math.round(priceNumber * 100)) : 0;

    const { error: insertError } = await supabase.from('services').insert({
      creator_id: profile?.id ?? user.id,
      author_id: profile?.id ?? user.id,
      category_id: categoryId,
      slug: buildSlug(cleanTitle),
      title: cleanTitle,
      short_description: cleanShortDescription,
      long_description: cleanLongDescription,
      service_type: cleanType,
      starting_price_cents: startingPriceCents,
      delivery_estimate: deliveryEstimate.trim() || null,
      cover_url: coverUrl.trim() || null,
      featured: false,
      status: 'draft',
      feature_description: selectedCategory?.name
        ? `Professional ${cleanType.toLowerCase()} under ${selectedCategory.name}.`
        : null,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push('/dashboard/services');
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
              New Service
            </h1>

            <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 18 }}>
              Create a service offering directly from inside the app.
            </p>
          </div>

          <Link href="/dashboard/services" className="os-button os-button-ghost os-button-compact">
            Back to Services
          </Link>
        </div>

        <GlassPanel style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 22 }}>
            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Service Title</div>
              <input className="input" value={title} onChange={event => setTitle(event.target.value)} placeholder="Example: Bass Guitar Recording" />
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
                <input className="input" value={serviceType} onChange={event => setServiceType(event.target.value)} placeholder="Mixing, Web Design, Strategy…" />
              </label>
            </div>

            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Short Description</div>
              <textarea className="input" rows={3} value={shortDescription} onChange={event => setShortDescription(event.target.value)} placeholder="Short card copy for this service." />
            </label>

            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Long Description</div>
              <textarea className="input" rows={5} value={longDescription} onChange={event => setLongDescription(event.target.value)} placeholder="Full service description used on detail pages." />
            </label>

            <div style={{ display: 'grid', gap: 22, gridTemplateColumns: '1fr 1fr 1fr' }}>
              <label>
                <div style={{ marginBottom: 8, fontWeight: 700 }}>Starting Price</div>
                <input className="input" value={startingPrice} onChange={event => setStartingPrice(formatPriceInput(event.target.value))} placeholder="299.00" />
              </label>

              <label>
                <div style={{ marginBottom: 8, fontWeight: 700 }}>Delivery Estimate</div>
                <input className="input" value={deliveryEstimate} onChange={event => setDeliveryEstimate(event.target.value)} placeholder="3–5 days" />
              </label>

              <label>
                <div style={{ marginBottom: 8, fontWeight: 700 }}>Creator</div>
                <input className="input" value={creatorName} readOnly />
              </label>
            </div>

            <UploadField
              label="Cover Image"
              folder="services/covers"
              userId={user.id}
              value={coverUrl}
              accept="image/*"
              buttonLabel="Upload cover"
              onChange={setCoverUrl}
            />

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
              <Link className="os-button os-button-ghost" href="/dashboard/services">
                Cancel
              </Link>
            </div>
          </form>
        </GlassPanel>
      </div>
    </PageShell>
  );
}
