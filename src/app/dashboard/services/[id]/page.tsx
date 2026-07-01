'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { UploadField } from '@/components/UploadField';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category } from '@/lib/platform';
import { getStudioDisplayName, loadStudioProfile } from '@/lib/studioProfiles';

function formatPriceInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, '');
  const [whole = '', decimals = ''] = normalized.split('.');
  return decimals ? `${whole}.${decimals.slice(0, 2)}` : whole;
}

export default function EditServicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [creatorName, setCreatorName] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('0.00');
  const [deliveryEstimate, setDeliveryEstimate] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [{ data: categoryRows }, profileResult, { data: serviceRow }] = await Promise.all([
        supabase.from('categories').select('*').eq('scope', 'services').order('sort_order'),
        loadStudioProfile(user.id),
        supabase.from('services').select('*').eq('id', id).or(`creator_id.eq.${user.id},author_id.eq.${user.id}`).maybeSingle(),
      ]);

      setCategories((categoryRows as Category[] | null) ?? []);
      setCreatorName(getStudioDisplayName(profileResult.profile, user.email));
      if (!serviceRow) {
        setError('Service not found.');
        setFetching(false);
        return;
      }

      setTitle(serviceRow.title ?? '');
      setCategoryId(serviceRow.category_id ?? '');
      setServiceType(serviceRow.service_type ?? '');
      setDescription(serviceRow.description ?? '');
      setStartingPrice(((serviceRow.starting_price_cents ?? 0) / 100).toFixed(2));
      setDeliveryEstimate(serviceRow.delivery_estimate ?? '');
      setCoverUrl(serviceRow.cover_url ?? '');
      setFetching(false);
    }

    loadData();
  }, [id, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    const priceNumber = Number(startingPrice || '0');
    const startingPriceCents = Number.isFinite(priceNumber) ? Math.max(0, Math.round(priceNumber * 100)) : 0;

    const { error: updateError } = await supabase
      .from('services')
      .update({
        title: title.trim(),
        category_id: categoryId,
        service_type: serviceType.trim(),
        description: description.trim(),
        starting_price_cents: startingPriceCents,
        delivery_estimate: deliveryEstimate.trim() || null,
        cover_url: coverUrl.trim() || null,
      })
      .eq('id', id)
      .or(`creator_id.eq.${user.id},author_id.eq.${user.id}`);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push('/dashboard/services');
  }

  if (loading || !user || fetching) return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;

  return (
    <PageShell>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '64px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 48, fontWeight: 780, letterSpacing: '-0.04em', marginBottom: 10 }}>Edit Service</h1>
            <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 18 }}>Update the service details stored in 44.</p>
          </div>
          <Link href="/dashboard/services" className="os-button os-button-ghost os-button-compact">Back to Services</Link>
        </div>
        <GlassPanel style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 22 }}>
            <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Service Title</div><input className="input" value={title} onChange={e => setTitle(e.target.value)} /></label>
            <div style={{ display: 'grid', gap: 22, gridTemplateColumns: '1fr 1fr' }}>
              <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Category</div><select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Type</div><input className="input" value={serviceType} onChange={e => setServiceType(e.target.value)} /></label>
            </div>
            <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Description</div><textarea className="input" rows={4} value={description} onChange={e => setDescription(e.target.value)} /></label>
            <div style={{ display: 'grid', gap: 22, gridTemplateColumns: '1fr 1fr 1fr' }}>
              <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Starting Price</div><input className="input" value={startingPrice} onChange={e => setStartingPrice(formatPriceInput(e.target.value))} /></label>
              <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Delivery Estimate</div><input className="input" value={deliveryEstimate} onChange={e => setDeliveryEstimate(e.target.value)} /></label>
              <label><div style={{ marginBottom: 8, fontWeight: 700 }}>Creator</div><input className="input" value={creatorName} readOnly /></label>
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
            {error && <p style={{ color: '#ff9b9b', fontSize: 14, fontWeight: 600 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 12, justifySelf: 'start' }}>
              <button className="os-button os-button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              <Link className="os-button os-button-ghost" href="/dashboard/services">Cancel</Link>
            </div>
          </form>
        </GlassPanel>
      </div>
    </PageShell>
  );
}
