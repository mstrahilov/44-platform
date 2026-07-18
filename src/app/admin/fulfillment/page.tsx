'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminAccessBoundary } from '@/components/admin/AdminPrimitives';
import { HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { supabase } from '@/lib/supabase';

type FulfillmentData = {
  environment: Record<string, boolean>;
  controls: {
    provider_connected: boolean;
    catalog_import_enabled: boolean;
    shipping_quotes_enabled: boolean;
    draft_orders_enabled: boolean;
    confirmation_enabled: boolean;
    store_id: number | null;
    minimum_margin_cents: number;
  };
  products: Array<{
    id: string;
    item_id: string;
    sync_product_id: number;
    provider_name: string;
    status: string;
    item_status: string;
    last_synced_at: string;
    retail_price_cents: number | null;
    maximum_provider_cost_cents: number;
  }>;
  variants: Array<{ id: string; product_mapping_id: string; provider_name: string; size_value: string | null; color_value: string | null; availability_status: string; provider_cost_cents: number | null; provider_currency: string | null; retail_price_cents: number | null; margin_cents: number | null; status: string }>;
  images: Array<{ id: string; item_id: string; role: 'color' | 'bonus'; color_value: string | null; title: string; file_url: string; sort_order: number; created_at: string; is_featured: boolean }>;
  drafts: Array<{ id: string; commerce_order_id: string; provider_order_id: number | null; provider_status: string; provider_dashboard_url: string | null; charged_cents: number; created_at: string }>;
  paidOrders: Array<{
    id: string;
    status: string;
    currency: string;
    total_cents: number;
    tax_cents: number;
    shipping_cents: number;
    paid_at: string | null;
    address: { recipient_name: string; address_line_1: string; address_line_2: string | null; city: string; region: string; postal_code: string; country_code: string } | null;
    lines: Array<{ id: string; item_title: string; quantity: number; merch_variant_id: string | null; fulfillment_status: string }>;
    fulfillment: { provider_order_id?: number | null; provider_status?: string; provider_dashboard_url?: string | null } | null;
  }>;
  merchItems: Array<{ id: string; title: string; status: string; price_cents: number }>;
  providerCatalog: Array<{ syncProductId: number; name: string; variantCount: number; syncedVariantCount: number; ignored: boolean }>;
  providerCatalogError: string | null;
};

type ShippingQuote = {
  quoteId: string;
  expiresAt: string;
  rates: Array<{ id: string; name: string; rateCents: number; currency: string; minDeliveryDays: number | null; maxDeliveryDays: number | null }>;
};

export default function AdminFulfillmentPage() {
  return <AdminAccessBoundary><AdminFulfillment /></AdminAccessBoundary>;
}

function AdminFulfillment() {
  const [data, setData] = useState<FulfillmentData | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [working, setWorking] = useState(false);
  const [productFilter, setProductFilter] = useState<'active' | 'archived'>('active');
  const [imageRoles, setImageRoles] = useState<Record<string, 'color' | 'bonus'>>({});
  const [imageFeatured, setImageFeatured] = useState<Record<string, boolean>>({});
  const [imageColors, setImageColors] = useState<Record<string, string>>({});
  const [imageTitles, setImageTitles] = useState<Record<string, string>>({});
  const [imageFiles, setImageFiles] = useState<Record<string, File | null>>({});
  const [imageInputVersions, setImageInputVersions] = useState<Record<string, number>>({});
  const [quotes, setQuotes] = useState<Record<string, ShippingQuote>>({});
  const [selectedRates, setSelectedRates] = useState<Record<string, string>>({});

  const request = useCallback(async (method: 'GET' | 'POST', body?: Record<string, unknown>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('Administrator session is unavailable.');
    const response = await fetch('/api/admin/printful', {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
    });
    const payload = await response.json() as FulfillmentData & { error?: string };
    if (!response.ok) throw new Error(payload.error || 'Printful operation failed.');
    return payload;
  }, []);

  const load = useCallback(async () => {
    const payload = await request('GET');
    setData(payload);
  }, [request]);

  useEffect(() => {
    void Promise.resolve().then(load).catch(loadError => setError(loadError instanceof Error ? loadError.message : 'Could not load Printful status.'));
  }, [load]);

  async function act(body: Record<string, unknown>, success: string) {
    setWorking(true);
    setError('');
    setStatus('');
    try {
      const result = await request('POST', body) as FulfillmentData & Partial<{
        created: number; updated: number; staged: number; blocked: number; archived: number;
      }>;
      if (body.action === 'sync_catalog' && typeof result.created === 'number') {
        setStatus(`Printful sync complete: ${result.created} created, ${result.updated ?? 0} updated, ${result.staged ?? 0} staged, ${result.blocked ?? 0} blocked, ${result.archived ?? 0} archived.`);
      } else {
        setStatus(success);
      }
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Printful operation failed.');
    } finally { setWorking(false); }
  }

  async function fulfillmentPost(path: string, body: Record<string, unknown>) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('Administrator session is unavailable.');
    const response = await fetch(path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const payload = await response.json() as ShippingQuote & { error?: string };
    if (!response.ok) throw new Error(payload.error || 'Printful operation failed.');
    return payload;
  }

  async function uploadMerchImage(itemId: string) {
    const file = imageFiles[itemId];
    const role = imageRoles[itemId] ?? 'bonus';
    const colorValue = imageColors[itemId] ?? '';
    if (!file || (role === 'color' && !colorValue)) return;
    setWorking(true);
    setError('');
    setStatus('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Administrator session is unavailable.');
      const form = new FormData();
      form.set('itemId', itemId);
      form.set('role', role);
      form.set('colorValue', colorValue);
      form.set('title', imageTitles[itemId] ?? '');
      form.set('featured', String(imageFeatured[itemId] ?? false));
      form.set('file', file);
      const response = await fetch('/api/admin/merch-images', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        cache: 'no-store',
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Merch image upload failed.');
      setImageFiles(current => ({ ...current, [itemId]: null }));
      setImageTitles(current => ({ ...current, [itemId]: '' }));
      setImageInputVersions(current => ({ ...current, [itemId]: (current[itemId] ?? 0) + 1 }));
      setStatus(role === 'color'
          ? `${colorValue} image assigned to every size in that color.`
          : imageFeatured[itemId] ? 'Featured image selected from the 44OS gallery.' : 'Bonus gallery image added.');
      await load();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Merch image upload failed.');
    } finally { setWorking(false); }
  }

  async function deleteMerchImage(imageId: string) {
    setWorking(true);
    setError('');
    setStatus('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Administrator session is unavailable.');
      const response = await fetch('/api/admin/merch-images', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
        cache: 'no-store',
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Merch image removal failed.');
      setStatus('Merch image removed from 44OS.');
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Merch image removal failed.');
    } finally { setWorking(false); }
  }

  async function quoteOrder(orderId: string) {
    setWorking(true);
    setError('');
    setStatus('');
    try {
      const quote = await fulfillmentPost('/api/admin/printful/estimate', { commerceOrderId: orderId });
      setQuotes(current => ({ ...current, [orderId]: quote }));
      setSelectedRates(current => ({ ...current, [orderId]: quote.rates[0]?.id ?? '' }));
      setStatus('Current Printful shipping options retrieved. Review one before creating the draft.');
    } catch (quoteError) {
      setError(quoteError instanceof Error ? quoteError.message : 'Could not quote this order.');
    } finally { setWorking(false); }
  }

  async function createDraft(orderId: string) {
    const quote = quotes[orderId];
    const selectedRateId = selectedRates[orderId];
    if (!quote || !selectedRateId) return;
    setWorking(true);
    setError('');
    setStatus('');
    try {
      await fulfillmentPost('/api/admin/printful/draft-order', {
        commerceOrderId: orderId,
        shippingQuoteId: quote.quoteId,
        selectedRateId,
      });
      setStatus('Printful draft created or reused. Review and confirm it only in the Printful interface.');
      await load();
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : 'Could not create the Printful draft.');
    } finally { setWorking(false); }
  }

  const missingEnvironment = data ? Object.entries(data.environment).filter(([, ready]) => !ready).map(([name]) => name) : [];
  return <PageShell><main className="admin-page" aria-label="Printful fulfillment operations">
    <HubHero title="Printful Fulfillment" copy="44-owned Merch mappings, live provider estimates, and non-charging draft orders." />
    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
    {status ? <div className="dashboard-status ui44-status" role="status">{status}</div> : null}

    <section className="dashboard-section">
      <SectionHeader title="Connection guard" description="The server verifies the exact API store. Order confirmation and charging are structurally unavailable in this phase." action={<button type="button" className="os-button os-button-secondary os-button-compact" disabled={working} onClick={() => { void act({ action: 'verify_connection' }, 'Printful API store verified. Draft-only controls are ready.'); }}>Verify safe connection</button>} />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        <StatusRow label="Server configuration" value={data ? (missingEnvironment.length ? `Missing: ${missingEnvironment.join(', ')}` : 'Present') : 'Loading…'} />
        <StatusRow label="API store" value={data?.controls.provider_connected ? `Verified · ${data.controls.store_id}` : 'Not verified'} />
        <StatusRow label="Catalog import" value={data?.controls.catalog_import_enabled ? 'Enabled' : 'Disabled'} />
        <StatusRow label="Shipping quotes" value={data?.controls.shipping_quotes_enabled ? 'Enabled' : 'Disabled'} />
        <StatusRow label="Draft orders" value={data?.controls.draft_orders_enabled ? 'Enabled' : 'Disabled'} />
        <StatusRow label="Confirmation / charging" value={data?.controls.confirmation_enabled ? 'UNSAFE' : 'Hard-locked off'} />
      </div>
    </section>

    <section className="dashboard-section">
      <SectionHeader
        title="Sync with Printful"
        description="Reconcile the complete verified store. New products become permanent drafts; provider names, retail prices, variants, costs, SKUs, and availability update automatically. Nothing publishes automatically."
        action={<button type="button" className="os-button os-button-primary os-button-compact" disabled={working || !data?.controls.catalog_import_enabled} onClick={() => { void act({ action: 'sync_catalog' }, 'Printful catalog sync completed. Review staged colors and draft products before publication.'); }}>Sync with Printful</button>}
      />
      {data?.providerCatalogError ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{data.providerCatalogError}</div> : null}
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        {data?.providerCatalog.length ? data.providerCatalog.map(providerProduct => {
          const mapping = data.products.find(product => product.sync_product_id === providerProduct.syncProductId);
          return <div className="dashboard-list-row ui44-list-row ui44-list-row-dashboard" key={providerProduct.syncProductId}>
            <span className="dashboard-row-copy">
              <strong className="dashboard-row-title">{providerProduct.name}</strong>
              <span className="dashboard-row-subtitle">{providerProduct.syncedVariantCount}/{providerProduct.variantCount} variants synced{providerProduct.ignored ? ' · ignored in Printful' : ''}</span>
            </span>
            <span className="dashboard-row-meta">{mapping ? `44OS Item ${mapping.item_id} · ${mapping.status}` : 'Awaiting complete-store sync'}</span>
          </div>;
        }) : <div className="dashboard-empty">{data?.controls.provider_connected ? 'No Printful products are available in this API store.' : 'Verify the Printful API store to pull its products.'}</div>}
      </div>
    </section>

    <section className="dashboard-section">
      <SectionHeader title="Provider products" description="Provider facts are read-only in 44OS. Review and publish remain separate owner actions." action={<div className="admin-dialog-actions"><button type="button" className="os-button os-button-secondary os-button-compact" aria-pressed={productFilter === 'active'} onClick={() => setProductFilter('active')}>Active</button><button type="button" className="os-button os-button-secondary os-button-compact" aria-pressed={productFilter === 'archived'} onClick={() => setProductFilter('archived')}>Archived</button></div>} />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        {data?.products.filter(product => productFilter === 'archived' ? product.item_status === 'archived' : product.item_status !== 'archived').length ? data.products.filter(product => productFilter === 'archived' ? product.item_status === 'archived' : product.item_status !== 'archived').map(product => <div className="dashboard-list-row ui44-list-row ui44-list-row-dashboard" key={product.id}>
          <span className="dashboard-row-copy"><strong className="dashboard-row-title">{product.provider_name}</strong><span className="dashboard-row-subtitle">44 Item {product.item_id} · Sync Product {product.sync_product_id}</span></span>
          <span className="dashboard-row-meta">
            Printful retail from {product.retail_price_cents === null ? 'unset' : formatMoney(product.retail_price_cents, 'USD')} · production-cost ceiling {formatMoney(product.maximum_provider_cost_cents, 'USD')} · {product.status}
          </span>
          <button type="button" className="os-button os-button-secondary os-button-compact" disabled={working} onClick={() => { void act({ action: 'review_product', itemId: product.item_id }, 'Printful name, retail prices, costs, availability, and variants pulled and reviewed.'); }}>
            Pull and review
          </button>
          <button type="button" className="os-button os-button-primary os-button-compact" disabled={working || product.status !== 'reviewed'} onClick={() => { void act({ action: 'publish_product', itemId: product.item_id }, 'Product published with reviewed Printful variants and 44OS-owned images.'); }}>
            Publish to 44OS
          </button>
          <Link className="os-button os-button-secondary os-button-compact" href={`/admin/fulfillment/${product.item_id}`}>Open product</Link>
        </div>) : <div className="dashboard-empty">No {productFilter} Printful product mapping has been imported.</div>}
      </div>
    </section>

    <section className="dashboard-section">
      <SectionHeader
        title="44OS product images"
        description="Printful imagery is ignored. Add one image for each imported color and any number of bonus gallery images; select any of them as the featured image. Sizes reuse their color image."
      />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        {data?.products.length ? data.products.map(product => {
          const role = imageRoles[product.item_id] ?? 'bonus';
          const productColors = [...new Set(data.variants
            .filter(variant => variant.product_mapping_id === product.id && variant.color_value)
            .map(variant => variant.color_value as string))];
          const productImages = data.images.filter(image => image.item_id === product.item_id);
          return <div className="dashboard-list-row ui44-list-row ui44-list-row-dashboard merch-image-admin-row" key={product.id}>
            <span className="dashboard-row-copy">
              <strong className="dashboard-row-title">{product.provider_name}</strong>
              <span className="dashboard-row-subtitle">{productColors.length ? `${productColors.length} imported colors` : 'No color options imported'}</span>
            </span>
            <div className="merch-image-admin-existing" aria-label={`${product.provider_name} images`}>
              {productImages.length ? productImages.map(image => <div className="merch-image-admin-card" key={image.id}>
                <span className="merch-image-admin-preview" style={{ backgroundImage: `url(${image.file_url})` }} role="img" aria-label={image.title} />
                <span><strong>{image.is_featured ? 'featured · ' : ''}{image.role === 'color' ? image.color_value : image.role}</strong><small>{image.title}</small></span>
                <button type="button" className="os-button os-button-secondary os-button-compact" disabled={working} onClick={() => { void deleteMerchImage(image.id); }}>Remove</button>
              </div>) : <span className="dashboard-row-meta">No 44OS images uploaded yet.</span>}
            </div>
            <div className="merch-image-admin-form">
              <label className="admin-dialog-field">
                <span>Image use</span>
                  <select value={role} onChange={event => setImageRoles(current => ({ ...current, [product.item_id]: event.target.value as 'color' | 'bonus' }))}>
                  <option value="color" disabled={!productColors.length}>Color image</option>
                  <option value="bonus">Bonus gallery image</option>
                </select>
              </label>
              <label className="admin-dialog-field"><span>Featured image</span><input type="checkbox" checked={imageFeatured[product.item_id] ?? false} onChange={event => setImageFeatured(current => ({ ...current, [product.item_id]: event.target.checked }))} /></label>
              {role === 'color' ? <label className="admin-dialog-field">
                <span>Imported color</span>
                <select value={imageColors[product.item_id] ?? ''} onChange={event => setImageColors(current => ({ ...current, [product.item_id]: event.target.value }))}>
                  <option value="">Choose color</option>
                  {productColors.map(color => <option value={color} key={color}>{color}</option>)}
                </select>
              </label> : null}
              <label className="admin-dialog-field">
                <span>Optional gallery label</span>
                <input value={imageTitles[product.item_id] ?? ''} maxLength={160} onChange={event => setImageTitles(current => ({ ...current, [product.item_id]: event.target.value }))} placeholder={role === 'bonus' ? 'Detail view' : ''} />
              </label>
              <label className="admin-dialog-field">
                <span>PNG, JPEG, WebP, or AVIF · maximum 12 MB</span>
                <input
                  key={imageInputVersions[product.item_id] ?? 0}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  onChange={event => setImageFiles(current => ({ ...current, [product.item_id]: event.target.files?.[0] ?? null }))}
                />
              </label>
              <button
                type="button"
                className="os-button os-button-primary os-button-compact"
                disabled={working || !imageFiles[product.item_id] || (role === 'color' && !imageColors[product.item_id])}
                onClick={() => { void uploadMerchImage(product.item_id); }}
              >
                {role === 'color' ? 'Assign color image' : 'Add bonus image'}
              </button>
            </div>
          </div>;
        }) : <div className="dashboard-empty">Import a Printful product before assigning 44OS images.</div>}
      </div>
    </section>

    <section className="dashboard-section">
      <SectionHeader title="Paid physical orders" description="Quote and create one non-charging draft. Manufacturing confirmation remains available only in Printful." />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        {data?.paidOrders.length ? data.paidOrders.map(order => {
          const quote = quotes[order.id];
          return <div className="dashboard-list-row ui44-list-row ui44-list-row-dashboard" key={order.id}>
            <span className="dashboard-row-copy">
              <strong className="dashboard-row-title">{order.lines.map(line => `${line.quantity}× ${line.item_title}`).join(', ')}</strong>
              <span className="dashboard-row-subtitle">
                {order.address
                  ? `${order.address.recipient_name} · ${order.address.city}, ${order.address.region} ${order.address.postal_code} · ${order.address.country_code}`
                  : 'Verified delivery address unavailable'}
                {' · '}{formatMoney(order.total_cents, order.currency)}
              </span>
            </span>
            {order.fulfillment?.provider_order_id ? (
              <span className="dashboard-row-meta">
                {order.fulfillment.provider_status}
                {order.fulfillment.provider_dashboard_url
                  ? <> · <a href={order.fulfillment.provider_dashboard_url} target="_blank" rel="noreferrer">Open in Printful</a></>
                  : null}
                {' · '}<a href="https://dashboard.stripe.com/payments" target="_blank" rel="noreferrer">Refund in Stripe</a>
              </span>
            ) : (
              <div className="admin-dialog-actions">
                <button type="button" className="os-button os-button-secondary os-button-compact" disabled={working} onClick={() => { void quoteOrder(order.id); }}>
                  Get current quote
                </button>
                {quote ? <>
                  <select value={selectedRates[order.id] ?? ''} onChange={event => setSelectedRates(current => ({ ...current, [order.id]: event.target.value }))}>
                    {quote.rates.map(rate => <option key={rate.id} value={rate.id}>{rate.name} · {formatMoney(rate.rateCents, rate.currency)}</option>)}
                  </select>
                  <button type="button" className="os-button os-button-primary os-button-compact" disabled={working || !selectedRates[order.id]} onClick={() => { void createDraft(order.id); }}>
                    Create Printful draft
                  </button>
                </> : null}
                <a className="os-button os-button-secondary os-button-compact" href="https://dashboard.stripe.com/payments" target="_blank" rel="noreferrer">
                  Refund in Stripe
                </a>
              </div>
            )}
          </div>;
        }) : <div className="dashboard-empty">No verified paid physical orders require fulfillment.</div>}
      </div>
    </section>

    <section className="dashboard-section">
      <SectionHeader title="Imported variants" description="Color, size, live provider availability, production cost, and review state. Only reviewed active variants can reach customer checkout." />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        {data?.variants.length ? data.variants.map(variant => <div className="dashboard-list-row ui44-list-row ui44-list-row-dashboard" key={variant.id}>
          <span className="dashboard-row-copy">
            <strong className="dashboard-row-title">{variant.color_value || 'Default'}{variant.size_value ? ` · ${variant.size_value}` : ''}</strong>
            <span className="dashboard-row-subtitle">{variant.provider_name} · {variant.availability_status.replaceAll('_', ' ')}</span>
          </span>
          <span className="dashboard-row-meta">
            Retail {variant.retail_price_cents === null ? 'unavailable' : formatMoney(variant.retail_price_cents, variant.provider_currency || 'USD')}
            {' · '}cost {variant.provider_cost_cents === null ? 'unavailable' : formatMoney(variant.provider_cost_cents, variant.provider_currency || 'USD')}
            {' · '}margin {variant.margin_cents === null ? 'unavailable' : formatMoney(variant.margin_cents, variant.provider_currency || 'USD')}
            {' · '}{variant.status}
          </span>
        </div>) : <div className="dashboard-empty">No Printful variants have been imported.</div>}
      </div>
    </section>

    <section className="dashboard-section">
      <SectionHeader title="Draft-order evidence" description="Any provider order shown here must remain uncharged and outside production." />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        {data?.drafts.length ? data.drafts.map(draft => <div className="dashboard-list-row ui44-list-row ui44-list-row-dashboard" key={draft.id}>
          <span className="dashboard-row-copy"><strong className="dashboard-row-title">{draft.provider_status}</strong><span className="dashboard-row-subtitle">44 order {draft.commerce_order_id}</span></span>
          <span className="dashboard-row-meta">{draft.charged_cents}¢ charged</span>
        </div>) : <div className="dashboard-empty">No Printful draft order has been created.</div>}
      </div>
    </section>
  </main></PageShell>;
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return <div className="dashboard-list-row ui44-list-row ui44-list-row-dashboard"><span className="dashboard-row-title">{label}</span><span className="dashboard-row-meta">{value}</span></div>;
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}
