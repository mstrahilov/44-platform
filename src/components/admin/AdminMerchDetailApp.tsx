'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AdminAccessBoundary } from '@/components/admin/AdminPrimitives';
import { HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { supabase } from '@/lib/supabase';

type Product = { id: string; item_id: string; provider_name: string; status: string; retail_price_cents: number | null; maximum_provider_cost_cents: number };
type Variant = { id: string; product_mapping_id: string; provider_name: string; color_value: string | null; size_value: string | null; availability_status: string; retail_price_cents: number | null; provider_cost_cents: number | null; margin_cents: number | null; status: string };
type Image = { id: string; item_id: string; role: 'color' | 'bonus'; color_value: string | null; title: string; file_url: string; is_featured: boolean; sort_order: number };
type Payload = { products: Product[]; variants: Variant[]; images: Image[]; error?: string };

export default function AdminMerchDetailApp({ itemId }: { itemId: string }) {
  return <AdminAccessBoundary><MerchDetail itemId={itemId} /></AdminAccessBoundary>;
}

function MerchDetail({ itemId }: { itemId: string }) {
  const [data, setData] = useState<Payload | null>(null); const [error, setError] = useState('');
  const [colorFiles, setColorFiles] = useState<Record<string, File | null>>({});
  const [uploadingColor, setUploadingColor] = useState('');
  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.access_token) throw new Error('Administrator session is unavailable.');
    const response = await fetch('/api/admin/printful', { headers: { Authorization: `Bearer ${session.session.access_token}` }, cache: 'no-store' });
    const payload = await response.json() as Payload;
    if (!response.ok) throw new Error(payload.error || 'Could not load Merch Item.');
    setData(payload);
  }, []);
  useEffect(() => { void Promise.resolve().then(load).catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load Merch Item.')); }, [load]);
  const product = data?.products.find(row => row.item_id === itemId);
  const variants = product ? (data?.variants.filter(row => row.product_mapping_id === product.id) ?? []) : [];
  const images = data?.images.filter(row => row.item_id === itemId) ?? [];
  const colors = [...new Set(variants.map(variant => variant.color_value).filter((color): color is string => Boolean(color)))];
  async function uploadColor(color: string) {
    const file = colorFiles[color]; if (!file) return;
    setUploadingColor(color);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) throw new Error('Administrator session is unavailable.');
      const body = new FormData(); body.set('itemId', itemId); body.set('role', 'color'); body.set('colorValue', color); body.set('featured', 'false'); body.set('file', file);
      const response = await fetch('/api/admin/merch-images', { method: 'POST', headers: { Authorization: `Bearer ${session.session.access_token}` }, body, cache: 'no-store' });
      const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error || 'Could not assign this color image.');
      setColorFiles(current => ({ ...current, [color]: null })); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not assign this color image.'); }
    finally { setUploadingColor(''); }
  }
  async function updateImage(image: Image, featured: boolean, sortOrder: number) {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.access_token) throw new Error('Administrator session is unavailable.');
    const response = await fetch('/api/admin/merch-images', { method: 'PATCH', headers: { Authorization: `Bearer ${session.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ imageId: image.id, featured, sortOrder }), cache: 'no-store' });
    const payload = await response.json() as { error?: string };
    if (!response.ok) throw new Error(payload.error || 'Could not update the Merch image.');
    await load();
  }
  return <PageShell><main className="admin-page" aria-label="Merch Item detail">
    <HubHero title={product?.provider_name ?? 'Merch Item'} copy="44OS images and publication are curated here; Printful provider facts remain read-only." />
    <p><Link href="/admin/fulfillment">← All Merch products</Link></p>
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
    {!data ? <div className="dashboard-empty">Loading Merch Item…</div> : !product ? <div className="dashboard-empty">This Merch Item is not mapped to Printful.</div> : <>
      <section className="dashboard-section"><SectionHeader title="Printful facts" description="Read-only provider truth from the latest complete sync." />
        <div className="dashboard-list-surface ui44-list-surface ui44-panel"><div className="dashboard-list-row"><span>Retail price</span><strong>{money(product.retail_price_cents)}</strong></div><div className="dashboard-list-row"><span>Maximum production cost</span><strong>{money(product.maximum_provider_cost_cents)}</strong></div><div className="dashboard-list-row"><span>Mapping status</span><strong>{product.status}</strong></div></div>
      </section>
      <section className="dashboard-section"><SectionHeader title="Variants" description="Availability, provider cost, and margin are not editable in 44OS." />
        <div className="dashboard-list-surface ui44-list-surface ui44-panel">{variants.map(variant => <div key={variant.id} className="dashboard-list-row"><span>{variant.provider_name} · {variant.color_value ?? '—'} / {variant.size_value ?? '—'}</span><span>{variant.availability_status} · retail {money(variant.retail_price_cents)} · cost {money(variant.provider_cost_cents)} · margin {money(variant.margin_cents)} · {variant.status}</span></div>)}</div>
      </section>
      <section className="dashboard-section"><SectionHeader title="44OS gallery" description="One image per sellable color, unlimited bonus images, and exactly one featured image are enforced by the storage lifecycle." />
        <div className="dashboard-list-surface ui44-list-surface ui44-panel">{images.length ? images.map((image, index) => <div key={image.id} className="dashboard-list-row"><span>{image.is_featured ? 'Featured · ' : ''}{image.role === 'color' ? image.color_value : 'Bonus'} · {image.title}</span><span className="admin-dialog-actions"><button className="os-button os-button-secondary os-button-compact" type="button" disabled={image.is_featured} onClick={() => { void updateImage(image, true, image.sort_order).catch(reason => setError(reason instanceof Error ? reason.message : 'Could not set featured image.')); }}>Set featured</button><button className="os-button os-button-secondary os-button-compact" type="button" disabled={index === 0} onClick={() => { void updateImage(image, image.is_featured, Math.max(0, image.sort_order - 1)).catch(reason => setError(reason instanceof Error ? reason.message : 'Could not reorder image.')); }}>Move up</button><button className="os-button os-button-secondary os-button-compact" type="button" onClick={() => { void updateImage(image, image.is_featured, image.sort_order + 1).catch(reason => setError(reason instanceof Error ? reason.message : 'Could not reorder image.')); }}>Move down</button></span></div>) : <div className="dashboard-empty">No curated images yet.</div>}</div>
      </section>
      <section className="dashboard-section"><SectionHeader title="Current Printful colors" description="Each imported color has one 44OS upload slot. Uploading a new file replaces that color atomically; it never changes provider facts." />
        <div className="dashboard-list-surface ui44-list-surface ui44-panel">{colors.map(color => { const image = images.find(candidate => candidate.role === 'color' && candidate.color_value?.toLowerCase() === color.toLowerCase()); return <div key={color} className="dashboard-list-row"><span>{color} · {image ? `assigned: ${image.title}` : 'needs image'}</span><span className="admin-dialog-actions"><input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={event => setColorFiles(current => ({ ...current, [color]: event.target.files?.[0] ?? null }))} /><button className="os-button os-button-secondary os-button-compact" type="button" disabled={!colorFiles[color] || uploadingColor === color} onClick={() => { void uploadColor(color); }}>{image ? 'Replace' : 'Upload'}</button></span></div>; })}</div>
      </section>
    </>}
  </main></PageShell>;
}
function money(value: number | null) { return value === null ? '—' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value / 100); }
