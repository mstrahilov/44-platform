import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { commerceAdminClient } from '@/lib/server/commerce';

const PRINTFUL_API_ORIGIN = 'https://api.printful.com';
const SAFE_DRAFT_STATUSES = new Set(['draft', 'failed', 'canceled']);
const LAUNCH_SHIPPING_COUNTRY = 'US';

type JsonRecord = Record<string, unknown>;
type PrintfulAvailability = 'active' | 'discontinued' | 'out_of_stock' | 'temporary_out_of_stock' | 'unknown';

type PrintfulEnvelope<T> = {
  code?: number;
  result?: T;
  paging?: { total?: number; offset?: number; limit?: number };
  error?: { reason?: string; message?: string };
};

type SyncVariant = {
  id: number;
  external_id?: string | null;
  name?: string;
  synced?: boolean;
  variant_id?: number;
  retail_price?: string;
  currency?: string;
  sku?: string | null;
  availability_status?: string;
  product?: { variant_id?: number; product_id?: number; name?: string; image?: string; price?: string };
};

type SyncProductDetail = {
  sync_product?: { id: number; external_id?: string | null; name?: string; thumbnail_url?: string | null; is_ignored?: boolean };
  sync_variants?: SyncVariant[];
};

type SyncProductSummary = {
  id: number;
  name?: string;
  variants?: number;
  synced?: number;
  is_ignored?: boolean;
};

type CatalogVariantDetail = {
  variant?: {
    id?: number;
    product_id?: number;
    name?: string;
    size?: string;
    color?: string;
    price?: string;
    in_stock?: boolean;
  };
};

type ShippingRate = {
  id: string;
  name?: string;
  rate: string;
  currency: string;
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
  minDeliveryDate?: string;
  maxDeliveryDate?: string;
};

export class PrintfulConfigurationError extends Error {
  status = 503;
  code = 'printful_not_configured';
}

export class PrintfulBoundaryError extends Error {
  status = 409;
  code = 'printful_boundary_rejected';
}

export class PrintfulProviderError extends Error {
  status: number;
  providerStatus: number;
  code = 'printful_provider_error';
  constructor(message: string, providerStatus: number) {
    super(message);
    this.status = providerStatus === 404 ? 404 : 502;
    this.providerStatus = providerStatus;
  }
}

function printfulToken() {
  const token = process.env.PRINTFUL_PRIVATE_TOKEN?.trim();
  if (!token) throw new PrintfulConfigurationError('Printful private-token access is not configured.');
  return token;
}

export function printfulStoreId() {
  const value = process.env.PRINTFUL_STORE_ID?.trim();
  if (!value || !/^\d+$/.test(value)) throw new PrintfulConfigurationError('Printful API store is not configured.');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new PrintfulConfigurationError('Printful API store is invalid.');
  return parsed;
}

function printfulStoreCurrency() {
  const value = process.env.PRINTFUL_STORE_CURRENCY?.trim().toUpperCase();
  if (!value || !/^[A-Z]{3}$/.test(value)) throw new PrintfulConfigurationError('Printful store currency is not configured.');
  return value;
}

function printfulWebhookSecret() {
  const value = process.env.PRINTFUL_WEBHOOK_SECRET?.trim();
  if (!value || value.length < 24) throw new PrintfulConfigurationError('Printful signed-webhook access is not configured.');
  return value.length % 2 === 0 && /^[a-f0-9]+$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'utf8');
}

export function printfulConfigurationPresence() {
  return {
    privateToken: Boolean(process.env.PRINTFUL_PRIVATE_TOKEN?.trim()),
    storeId: /^\d+$/.test(process.env.PRINTFUL_STORE_ID?.trim() ?? ''),
    storeCurrency: /^[A-Z]{3}$/.test(process.env.PRINTFUL_STORE_CURRENCY?.trim().toUpperCase() ?? ''),
    webhookSecret: Boolean(process.env.PRINTFUL_WEBHOOK_SECRET?.trim()),
    publicPurchasesDisabled: process.env.NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE !== 'true',
  };
}

async function printfulRequestEnvelope<T>(path: string, init: RequestInit = {}): Promise<PrintfulEnvelope<T>> {
  if (!path.startsWith('/')) throw new PrintfulBoundaryError('Printful API path is invalid.');
  const response = await fetch(`${PRINTFUL_API_ORIGIN}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${printfulToken()}`,
      'X-PF-Store-Id': String(printfulStoreId()),
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    cache: 'no-store',
  });
  let payload: PrintfulEnvelope<T> | null = null;
  try { payload = await response.json() as PrintfulEnvelope<T>; }
  catch { /* Provider failures remain sanitized below. */ }
  if (!response.ok || payload?.result === undefined) {
    throw new PrintfulProviderError(payload?.error?.reason || `Printful request failed (${response.status}).`, response.status);
  }
  return payload;
}

async function printfulRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const payload = await printfulRequestEnvelope<T>(path, init);
  return payload.result!;
}

export async function verifyPrintfulConnection() {
  const expectedStoreId = printfulStoreId();
  const stores = await printfulRequest<Array<{ id?: number; name?: string; type?: string }>>('/stores');
  const store = stores.find(candidate => candidate.id === expectedStoreId);
  if (!store) throw new PrintfulBoundaryError('The configured private token cannot access the configured API store.');
  return { storeId: expectedStoreId, name: store.name ?? 'Printful API store', type: store.type ?? null };
}

export async function listPrintfulCatalogProducts() {
  const pageSize = 100;
  const products = new Map<number, SyncProductSummary>();
  let offset = 0;
  let expectedTotal: number | null = null;

  for (let page = 0; page < 500; page += 1) {
    const envelope = await printfulRequestEnvelope<SyncProductSummary[]>(`/store/products?status=all&limit=${pageSize}&offset=${offset}`);
    const pageProducts = envelope.result ?? [];
    const providerTotal = envelope.paging?.total;
    if (Number.isSafeInteger(providerTotal) && (providerTotal as number) >= 0) expectedTotal = providerTotal as number;
    if (!Array.isArray(pageProducts)) throw new PrintfulBoundaryError('Printful returned an invalid product page.');
    if (expectedTotal !== null && pageProducts.length === 0 && offset < expectedTotal) {
      throw new PrintfulBoundaryError('Printful returned an incomplete product snapshot.');
    }
    for (const product of pageProducts) {
      if (!Number.isSafeInteger(product.id) || product.id <= 0) {
        throw new PrintfulBoundaryError('Printful returned an invalid Sync Product identity.');
      }
      if (products.has(product.id)) throw new PrintfulBoundaryError('Printful returned a duplicate Sync Product identity.');
      products.set(product.id, product);
    }
    offset += pageProducts.length;
    if (expectedTotal !== null && offset >= expectedTotal) break;
    if (expectedTotal === null && pageProducts.length < pageSize) break;
  }
  if (expectedTotal !== null && products.size !== expectedTotal) {
    throw new PrintfulBoundaryError('Printful product pagination did not produce a complete snapshot.');
  }
  if (products.size === 0 && expectedTotal !== 0) throw new PrintfulBoundaryError('Printful product snapshot is empty or incomplete.');

  return [...products.values()]
    .filter(product => Number.isSafeInteger(product.id) && product.id > 0)
    .map(product => ({
      syncProductId: product.id,
      name: product.name?.trim() || `Printful product ${product.id}`,
      variantCount: Math.max(0, Number(product.variants ?? 0)),
      syncedVariantCount: Math.max(0, Number(product.synced ?? 0)),
      ignored: Boolean(product.is_ignored),
    }));
}

function cents(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

function variantOptions(name: string) {
  const match = name.match(/\(([^)]+)\)\s*$/);
  const slashParts = name.split('/').map(part => part.trim()).filter(Boolean);
  const parts = match?.[1]?.split('/').map(part => part.trim()).filter(Boolean)
    ?? (slashParts.length >= 3 ? slashParts.slice(-2) : slashParts.length === 2 ? slashParts.slice(-1) : []);
  return {
    ...(parts.length > 1 && parts[0] ? { color: parts[0] } : {}),
    ...(parts.at(-1) ? { size: parts.at(-1) } : {}),
  };
}

function safeAvailability(value: unknown, synced: boolean | undefined, inStock?: boolean): PrintfulAvailability {
  if (synced === false) return 'unknown';
  const normalized = typeof value === 'string' ? value : 'unknown';
  if (normalized === 'discontinued' || normalized === 'out_of_stock' || normalized === 'temporary_out_of_stock') return normalized;
  if (inStock === false) return 'out_of_stock';
  if (normalized === 'active' || inStock === true) return 'active';
  return 'unknown';
}

export async function fetchPrintfulSyncProduct(syncProductId: number) {
  if (!Number.isSafeInteger(syncProductId) || syncProductId <= 0) throw new PrintfulBoundaryError('Printful Sync Product ID is invalid.');
  const detail = await printfulRequest<SyncProductDetail>(`/store/products/${syncProductId}`);
  if (!detail.sync_product || detail.sync_product.id !== syncProductId) throw new PrintfulBoundaryError('Printful returned a different Sync Product.');
  return detail;
}

async function fetchPrintfulCatalogVariant(catalogVariantId: number) {
  const detail = await printfulRequest<CatalogVariantDetail>(`/products/variant/${catalogVariantId}`);
  if (!detail.variant || detail.variant.id !== catalogVariantId) throw new PrintfulBoundaryError('Printful returned a different Catalog Variant.');
  return detail.variant;
}

export type PrintfulStorefrontPreviewVariant = {
  id: string;
  code: string;
  displayName: string;
  optionValues: Record<string, string>;
  imageUrl: string | null;
  availabilityStatus: PrintfulAvailability;
  selectable: boolean;
  sortOrder: number;
};

const storefrontPreviewCache = new Map<string, { expiresAt: number; variants: PrintfulStorefrontPreviewVariant[] }>();

/** Development-only sanitized provider preview. Provider IDs, costs, and imagery never leave the server. */
export async function previewPrintfulStorefrontVariants(productTitle: string) {
  const cached = storefrontPreviewCache.get(productTitle);
  if (cached && cached.expiresAt > Date.now()) return cached.variants;
  const products = await printfulRequest<SyncProductSummary[]>('/store/products?limit=100');
  const product = products.find(candidate => candidate.name?.trim().toLowerCase() === productTitle.trim().toLowerCase());
  if (!product) return [];
  const detail = await fetchPrintfulSyncProduct(product.id);
  const variants = await Promise.all((detail.sync_variants ?? []).map(async (variant, sortOrder) => {
    const catalogVariantId = variant.variant_id ?? variant.product?.variant_id;
    if (!Number.isSafeInteger(catalogVariantId)) return null;
    const catalogVariant = await fetchPrintfulCatalogVariant(catalogVariantId as number);
    const displayName = variant.name || catalogVariant.name || variant.product?.name || 'Printful option';
    const parsedOptions = variantOptions(displayName);
    const optionValues = {
      ...(catalogVariant.color ? { color: catalogVariant.color } : parsedOptions.color ? { color: parsedOptions.color } : {}),
      ...(catalogVariant.size ? { size: catalogVariant.size } : parsedOptions.size ? { size: parsedOptions.size } : {}),
    };
    const availabilityStatus = safeAvailability(variant.availability_status, variant.synced, catalogVariant.in_stock);
    const previewKey = createHash('sha256')
      .update(`storefront-preview:${printfulStoreId()}:${variant.id}`)
      .digest('hex')
      .slice(0, 24);
    return {
      id: `preview-${previewKey}`,
      code: `preview-${previewKey}`,
      displayName,
      optionValues,
      imageUrl: null,
      availabilityStatus,
      selectable: availabilityStatus === 'active',
      sortOrder,
    } satisfies PrintfulStorefrontPreviewVariant;
  }));
  const sanitized = variants.filter((variant): variant is NonNullable<typeof variant> => Boolean(variant));
  storefrontPreviewCache.set(productTitle, { expiresAt: Date.now() + 5 * 60_000, variants: sanitized });
  return sanitized;
}

async function assertCurrentProviderVariants(mappings: Array<{ catalog_variant_id: number; provider_cost_cents: number | null }>) {
  const current = await Promise.all(mappings.map(async mapping => ({
    mapping,
    variant: await fetchPrintfulCatalogVariant(mapping.catalog_variant_id),
  })));
  if (current.some(({ mapping, variant }) => variant.in_stock !== true
    || cents(variant.price) === null || cents(variant.price) !== mapping.provider_cost_cents)) {
    throw new PrintfulBoundaryError('Printful availability or base cost changed. Re-import and review the product before continuing.');
  }
}

export async function importPrintfulProduct(itemId: string, syncProductId: number, catalogSyncId?: string) {
  const admin = commerceAdminClient();
  const controlsResult = await admin.from('printful_runtime_controls' as never).select('*').eq('singleton', true).single();
  const controls = controlsResult.data as unknown as { provider_connected: boolean; catalog_import_enabled: boolean; store_id: number | null } | null;
  if (controlsResult.error || !controls?.provider_connected || !controls.catalog_import_enabled || controls.store_id !== printfulStoreId()) {
    throw new PrintfulBoundaryError('Printful catalog import is disabled.');
  }
  const itemResult = await admin.from('catalog_items').select('id,title,price_cents,status,experience_type,fulfillment_type').eq('id', itemId).single();
  if (itemResult.error || itemResult.data?.experience_type !== 'merch' || !['physical', 'hybrid'].includes(itemResult.data.fulfillment_type)) {
    throw new PrintfulBoundaryError('Only a 44-owned physical Merch Item can be mapped.');
  }
  const existingMappingResult = await admin.from('printful_product_mappings' as never)
    .select('id,status,reviewed_at,reviewed_by').eq('store_id', printfulStoreId()).eq('sync_product_id', syncProductId).maybeSingle();
  if (existingMappingResult.error) throw existingMappingResult.error;
  const existingMapping = existingMappingResult.data as unknown as {
    id: string; status: string; reviewed_at: string | null; reviewed_by: string | null;
  } | null;
  const detail = await fetchPrintfulSyncProduct(syncProductId);
  const product = detail.sync_product!;
  const variants = detail.sync_variants ?? [];
  if (!variants.length) throw new PrintfulBoundaryError('Printful Sync Product has no variants.');
  const productUpsert = await admin.from('printful_product_mappings' as never).upsert({
    item_id: itemId,
    store_id: printfulStoreId(),
    sync_product_id: product.id,
    external_id: product.external_id ?? null,
    provider_name: product.name || itemResult.data.title,
    thumbnail_url: null,
    status: product.is_ignored ? 'archived' : existingMapping?.status === 'archived' ? 'draft' : existingMapping?.status ?? 'draft',
    provider_snapshot: { id: product.id, externalId: product.external_id ?? null, ignored: Boolean(product.is_ignored), variantCount: variants.length },
    last_synced_at: new Date().toISOString(),
    reviewed_at: existingMapping?.status === 'reviewed' ? existingMapping.reviewed_at : null,
    reviewed_by: existingMapping?.status === 'reviewed' ? existingMapping.reviewed_by : null,
    ...(catalogSyncId ? { last_catalog_sync_id: catalogSyncId } : {}),
  } as never, { onConflict: 'item_id' }).select('id').single();
  if (productUpsert.error) throw productUpsert.error;
  const productMappingId = (productUpsert.data as unknown as { id: string }).id;
  const retailPrices: number[] = [];
  for (const [variantIndex, variant] of variants.entries()) {
    const providerCatalogVariantId = variant.variant_id ?? variant.product?.variant_id;
    if (!Number.isSafeInteger(variant.id) || !Number.isSafeInteger(providerCatalogVariantId)) continue;
    const catalogVariantId = providerCatalogVariantId as number;
    const catalogVariant = await fetchPrintfulCatalogVariant(catalogVariantId);
    const displayName = variant.name || catalogVariant.name || variant.product?.name || `Printful variant ${variant.id}`;
    const codeSource = variant.external_id || variant.sku || `pf-${variant.id}`;
    const code = codeSource.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || `pf-${variant.id}`;
    const parsedOptions = variantOptions(displayName);
    const options = {
      ...(catalogVariant.color ? { color: catalogVariant.color } : parsedOptions.color ? { color: parsedOptions.color } : {}),
      ...(catalogVariant.size ? { size: catalogVariant.size } : parsedOptions.size ? { size: parsedOptions.size } : {}),
    };
    const retailPrice = cents(variant.retail_price);
    const retailCurrency = variant.currency?.trim().toUpperCase() || printfulStoreCurrency();
    if (retailPrice !== null && retailCurrency === printfulStoreCurrency()) retailPrices.push(retailPrice);
    const merchVariant = await admin.from('merch_variants' as never).upsert({
      item_id: itemId,
      code,
      display_name: displayName,
      sku: variant.sku ?? null,
      option_values: options,
      price_cents: retailCurrency === printfulStoreCurrency() ? retailPrice : null,
      sort_order: variantIndex,
      status: 'draft',
    } as never, { onConflict: 'item_id,code' }).select('id').single();
    if (merchVariant.error) throw merchVariant.error;
    const availability = safeAvailability(variant.availability_status, variant.synced, catalogVariant.in_stock);
    const providerCost = cents(catalogVariant.price ?? variant.product?.price);
    const mapping = await admin.from('printful_variant_mappings' as never).upsert({
      product_mapping_id: productMappingId,
      merch_variant_id: (merchVariant.data as unknown as { id: string }).id,
      sync_variant_id: variant.id,
      catalog_variant_id: catalogVariantId,
      sku: variant.sku ?? null,
      provider_name: displayName,
      size_value: typeof options.size === 'string' ? options.size : null,
      color_value: typeof options.color === 'string' ? options.color : null,
      availability_status: availability,
      provider_cost_cents: providerCost,
      provider_currency: providerCost === null ? null : printfulStoreCurrency(),
      status: availability === 'active' && !product.is_ignored ? 'draft' : 'blocked',
      provider_snapshot: {
        syncVariantId: variant.id,
        catalogVariantId,
        synced: variant.synced !== false,
        availability,
        retailPriceCents: retailCurrency === printfulStoreCurrency() ? retailPrice : null,
        retailCurrency,
      },
      last_synced_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
      ...(catalogSyncId ? { last_catalog_sync_id: catalogSyncId } : {}),
    } as never, { onConflict: 'product_mapping_id,sync_variant_id' });
    if (mapping.error) throw mapping.error;
  }
  if (!retailPrices.length) throw new PrintfulBoundaryError('Printful product has no valid store-currency retail price.');
  const baseRetailPrice = Math.min(...retailPrices);
  const [itemSync, offerSync] = await Promise.all([
    admin.from('catalog_items').update({
      title: product.name?.trim() || itemResult.data.title,
      price_cents: baseRetailPrice,
      status: existingMapping?.status === 'archived' ? 'draft' : itemResult.data.status,
    }).eq('id', itemId),
    admin.from('catalog_offers').update({
      price_cents: baseRetailPrice,
      ...(existingMapping?.status === 'archived' ? { status: 'draft' } : {}),
    })
      .eq('item_id', itemId).eq('offer_type', 'physical_purchase'),
  ]);
  if (itemSync.error) throw itemSync.error;
  if (offerSync.error) throw offerSync.error;
  return { itemId, syncProductId, variantCount: variants.length, status: product.is_ignored ? 'archived' : existingMapping?.status === 'archived' ? 'draft' : existingMapping?.status ?? 'draft' };
}

export async function createPendingPrintfulProduct(syncProductId: number) {
  const admin = commerceAdminClient();
  const [controlsResult, categoryResult] = await Promise.all([
    admin.from('commerce_runtime_controls').select('platform_seller_id').eq('singleton', true).single(),
    admin.from('item_categories').select('id').eq('slug', 'merch').single(),
  ]);
  if (controlsResult.error || !controlsResult.data?.platform_seller_id || categoryResult.error) {
    throw new PrintfulBoundaryError('The forty four Merch owner boundary is not configured.');
  }
  const detail = await fetchPrintfulSyncProduct(syncProductId);
  const name = detail.sync_product?.name?.trim();
  const retailPrices = (detail.sync_variants ?? [])
    .map(variant => variant.currency?.trim().toUpperCase() === printfulStoreCurrency() || !variant.currency
      ? cents(variant.retail_price)
      : null)
    .filter((value): value is number => value !== null && value > 0);
  if (!name || !retailPrices.length) throw new PrintfulBoundaryError('Printful pending product name or retail price is incomplete.');
  const slugBase = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'merch';
  const itemId = randomUUID();
  const inserted = await admin.from('catalog_items').insert({
    id: itemId,
    author_id: controlsResult.data.platform_seller_id,
    item_category_id: categoryResult.data.id,
    slug: `${slugBase}-${itemId.slice(0, 8)}`,
    title: name,
    creator: '44OS',
    item_type: 'Merch',
    price_cents: Math.min(...retailPrices),
    is_free: false,
    status: 'draft',
    experience_type: 'merch',
    fulfillment_type: 'physical',
  }).select('id').single();
  if (inserted.error) throw inserted.error;
  try {
    await importPrintfulProduct(itemId, syncProductId);
    return { itemId, syncProductId, status: 'pending' };
  } catch (error) {
    await admin.from('catalog_items').delete().eq('id', itemId).eq('status', 'draft');
    throw error;
  }
}

type PrintfulSyncSummary = {
  runId: string;
  providerProductCount: number;
  created: number;
  updated: number;
  staged: number;
  blocked: number;
  archived: number;
};

/**
 * Reconciles only after the complete paginated provider snapshot is available.
 * A service-only database lease serializes concurrent operators; failed runs
 * are recorded but are intentionally unable to archive any current history.
 */
export async function syncPrintfulCatalog(adminId: string): Promise<PrintfulSyncSummary> {
  const admin = commerceAdminClient();
  const controlsResult = await admin.from('printful_runtime_controls' as never)
    .select('provider_connected,catalog_import_enabled,store_id,minimum_margin_cents').eq('singleton', true).single();
  const controls = controlsResult.data as unknown as {
    provider_connected: boolean; catalog_import_enabled: boolean; store_id: number | null; minimum_margin_cents: number;
  } | null;
  if (controlsResult.error || !controls?.provider_connected || !controls.catalog_import_enabled || controls.store_id !== printfulStoreId()) {
    throw new PrintfulBoundaryError('Printful catalog synchronization is disabled.');
  }
  const started = await admin.rpc('begin_printful_catalog_sync' as never, {
    target_store_id: printfulStoreId(), target_started_by: adminId,
  } as never) as unknown as { data: string | null; error: Error | null };
  if (started.error || typeof started.data !== 'string') throw started.error ?? new PrintfulBoundaryError('Printful catalog synchronization could not start.');
  const runId: string = started.data;
  const summary: PrintfulSyncSummary = { runId, providerProductCount: 0, created: 0, updated: 0, staged: 0, blocked: 0, archived: 0 };

  try {
    const providerProducts = await listPrintfulCatalogProducts();
    summary.providerProductCount = providerProducts.length;
    const existingResult = await admin.from('printful_product_mappings' as never)
      .select('id,item_id,sync_product_id,status').eq('store_id', printfulStoreId());
    if (existingResult.error) throw existingResult.error;
    const existingBySyncId = new Map(((existingResult.data ?? []) as unknown as Array<{
      id: string; item_id: string; sync_product_id: number; status: string;
    }>).map(mapping => [mapping.sync_product_id, mapping]));

    for (const providerProduct of providerProducts) {
      const existing = existingBySyncId.get(providerProduct.syncProductId);
      let itemId = existing?.item_id;
      const priorVariantsResult = existing
        ? await admin.from('printful_variant_mappings' as never)
          .select('sync_variant_id,status,color_value').eq('product_mapping_id', existing.id)
        : { data: [], error: null };
      if (priorVariantsResult.error) throw priorVariantsResult.error;
      const priorVariants = (priorVariantsResult.data ?? []) as unknown as Array<{
        sync_variant_id: number; status: string; color_value: string | null;
      }>;
      const reviewedSyncVariantIds = new Set(priorVariants.filter(variant => variant.status === 'reviewed')
        .map(variant => variant.sync_variant_id));
      const reviewedColorsBeforeSync = new Set(priorVariants.filter(variant => variant.status === 'reviewed' && variant.color_value)
        .map(variant => variant.color_value!.trim().toLowerCase()));
      if (!itemId) {
        const created = await createPendingPrintfulProduct(providerProduct.syncProductId);
        itemId = created.itemId;
        summary.created += 1;
      } else {
        summary.updated += 1;
      }
      await importPrintfulProduct(itemId, providerProduct.syncProductId, runId);

      if (providerProduct.ignored) {
        const [mappingArchive, itemArchive, offerArchive] = await Promise.all([
          admin.from('printful_product_mappings' as never).update({ status: 'archived', reviewed_at: null, reviewed_by: null } as never)
            .eq('item_id', itemId),
          admin.from('catalog_items').update({ status: 'archived' }).eq('id', itemId),
          admin.from('catalog_offers').update({ status: 'archived' }).eq('item_id', itemId).eq('offer_type', 'physical_purchase'),
        ]);
        if (mappingArchive.error || itemArchive.error || offerArchive.error) throw mappingArchive.error || itemArchive.error || offerArchive.error;
        summary.archived += 1;
        continue;
      }

      const mappingResult = await admin.from('printful_product_mappings' as never)
        .select('id,status').eq('item_id', itemId).single();
      if (mappingResult.error) throw mappingResult.error;
      const mapping = mappingResult.data as unknown as { id: string; status: string };
      const variantsResult = await admin.from('printful_variant_mappings' as never)
        .select('id,merch_variant_id,sync_variant_id,status,availability_status,color_value,provider_cost_cents,last_catalog_sync_id')
        .eq('product_mapping_id', mapping.id);
      if (variantsResult.error) throw variantsResult.error;
      const variants = (variantsResult.data ?? []) as unknown as Array<{
        id: string; merch_variant_id: string; sync_variant_id: number; status: string; availability_status: string;
        color_value: string | null; provider_cost_cents: number | null; last_catalog_sync_id: string | null;
      }>;
      const staleVariants = variants.filter(variant => variant.last_catalog_sync_id !== runId);
      if (staleVariants.length) {
        const [providerArchive, variantArchive] = await Promise.all([
          admin.from('printful_variant_mappings' as never).update({ status: 'archived', reviewed_at: null, reviewed_by: null } as never)
            .in('id', staleVariants.map(variant => variant.id)),
          admin.from('merch_variants' as never).update({ status: 'archived', is_default: false } as never)
            .in('id', staleVariants.map(variant => variant.merch_variant_id)),
        ]);
        if (providerArchive.error || variantArchive.error) throw providerArchive.error || variantArchive.error;
        summary.archived += staleVariants.length;
      }
      const currentVariants = variants.filter(variant => variant.last_catalog_sync_id === runId);
      const [merchVariantsResult, imagesResult] = await Promise.all([
        admin.from('merch_variants' as never).select('id,price_cents,status').in('id', currentVariants.map(variant => variant.merch_variant_id)),
        admin.from('merch_product_images' as never).select('color_value').eq('item_id', itemId).eq('role', 'color'),
      ]);
      if (merchVariantsResult.error || imagesResult.error) throw merchVariantsResult.error || imagesResult.error;
      const priceByVariant = new Map(((merchVariantsResult.data ?? []) as unknown as Array<{ id: string; price_cents: number | null }>)
        .map(variant => [variant.id, variant.price_cents]));
      const imagedColors = new Set(((imagesResult.data ?? []) as Array<{ color_value: string | null }>)
        .map(image => image.color_value?.trim().toLowerCase()).filter((color): color is string => Boolean(color)));
      const activeIds: string[] = [];
      const stagedIds: string[] = [];
      const blockedIds: string[] = [];
      for (const variant of currentVariants) {
        const color = variant.color_value?.trim().toLowerCase() ?? null;
        const marginSafe = variant.provider_cost_cents !== null
          && (priceByVariant.get(variant.merch_variant_id) ?? 0) - variant.provider_cost_cents >= controls.minimum_margin_cents;
        const canActivate = mapping.status !== 'archived' && variant.availability_status === 'active' && marginSafe
          && (reviewedSyncVariantIds.has(variant.sync_variant_id)
            || (!color ? false : imagedColors.has(color) && reviewedColorsBeforeSync.has(color)));
        if (canActivate) activeIds.push(variant.id);
        else if (variant.availability_status === 'active' && marginSafe) stagedIds.push(variant.id);
        else blockedIds.push(variant.id);
      }
      if (activeIds.length) {
        const activeVariantIds = currentVariants.filter(variant => activeIds.includes(variant.id)).map(variant => variant.merch_variant_id);
        const [providerUpdate, variantUpdate] = await Promise.all([
          admin.from('printful_variant_mappings' as never).update({ status: 'reviewed', reviewed_at: new Date().toISOString(), reviewed_by: adminId } as never).in('id', activeIds),
          admin.from('merch_variants' as never).update({ status: 'active' } as never).in('id', activeVariantIds),
        ]);
        if (providerUpdate.error || variantUpdate.error) throw providerUpdate.error || variantUpdate.error;
      }
      if (stagedIds.length) {
        const stagedVariantIds = currentVariants.filter(variant => stagedIds.includes(variant.id)).map(variant => variant.merch_variant_id);
        const [providerUpdate, variantUpdate] = await Promise.all([
          admin.from('printful_variant_mappings' as never).update({ status: 'draft', reviewed_at: null, reviewed_by: null } as never).in('id', stagedIds),
          admin.from('merch_variants' as never).update({ status: 'draft' } as never).in('id', stagedVariantIds),
        ]);
        if (providerUpdate.error || variantUpdate.error) throw providerUpdate.error || variantUpdate.error;
        summary.staged += stagedIds.length;
      }
      if (blockedIds.length) {
        const blockedVariantIds = currentVariants.filter(variant => blockedIds.includes(variant.id)).map(variant => variant.merch_variant_id);
        const [providerUpdate, variantUpdate] = await Promise.all([
          admin.from('printful_variant_mappings' as never).update({ status: 'blocked', reviewed_at: null, reviewed_by: null } as never).in('id', blockedIds),
          admin.from('merch_variants' as never).update({ status: 'unavailable' } as never).in('id', blockedVariantIds),
        ]);
        if (providerUpdate.error || variantUpdate.error) throw providerUpdate.error || variantUpdate.error;
        summary.blocked += blockedIds.length;
      }
    }

    const staleProductsResult = await admin.from('printful_product_mappings' as never)
      .select('id,item_id,last_catalog_sync_id').eq('store_id', printfulStoreId());
    if (staleProductsResult.error) throw staleProductsResult.error;
    const staleProducts = ((staleProductsResult.data ?? []) as unknown as Array<{
      id: string; item_id: string; last_catalog_sync_id: string | null;
    }>).filter(product => product.last_catalog_sync_id !== runId);
    for (const product of staleProducts) {
      const staleVariantsResult = await admin.from('printful_variant_mappings' as never)
        .select('merch_variant_id,last_catalog_sync_id').eq('product_mapping_id', product.id);
      if (staleVariantsResult.error) throw staleVariantsResult.error;
      const staleVariantIds = ((staleVariantsResult.data ?? []) as Array<{
        merch_variant_id: string; last_catalog_sync_id: string | null;
      }>).filter(variant => variant.last_catalog_sync_id !== runId).map(variant => variant.merch_variant_id);
      const operations = [
        admin.from('printful_product_mappings' as never).update({ status: 'archived', reviewed_at: null, reviewed_by: null } as never).eq('id', product.id),
        admin.from('catalog_items').update({ status: 'archived' }).eq('id', product.item_id),
        admin.from('catalog_offers').update({ status: 'archived' }).eq('item_id', product.item_id).eq('offer_type', 'physical_purchase'),
      ];
      if (staleVariantIds.length) operations.push(
        admin.from('printful_variant_mappings' as never).update({ status: 'archived', reviewed_at: null, reviewed_by: null } as never).eq('product_mapping_id', product.id),
        admin.from('merch_variants' as never).update({ status: 'archived', is_default: false } as never).in('id', staleVariantIds),
      );
      const results = await Promise.all(operations);
      const failed = results.find(result => result.error);
      if (failed?.error) throw failed.error;
      summary.archived += 1;
    }
    const finished = await admin.rpc('finish_printful_catalog_sync' as never, {
      target_run_id: runId, target_status: 'completed', target_product_count: summary.providerProductCount,
      target_summary: summary, target_error_message: null,
    } as never);
    if (finished.error) throw finished.error;
    return summary;
  } catch (error) {
    await admin.rpc('finish_printful_catalog_sync' as never, {
      target_run_id: runId, target_status: 'failed', target_product_count: summary.providerProductCount,
      target_summary: summary, target_error_message: error instanceof Error ? error.message : 'Catalog synchronization failed.',
    } as never);
    throw error;
  }
}

export async function reviewPrintfulProduct(itemId: string, adminId: string) {
  const admin = commerceAdminClient();
  const mappingResult = await admin.from('printful_product_mappings' as never).select('id,sync_product_id').eq('item_id', itemId).single();
  if (mappingResult.error) throw new PrintfulBoundaryError('Import the Printful product before review.');
  const mapping = mappingResult.data as unknown as { id: string; sync_product_id: number };
  await importPrintfulProduct(itemId, mapping.sync_product_id);
  const [itemResult, controlsResult, variantsResult] = await Promise.all([
    admin.from('catalog_items').select('price_cents').eq('id', itemId).single(),
    admin.from('printful_runtime_controls' as never).select('minimum_margin_cents').eq('singleton', true).single(),
    admin.from('printful_variant_mappings' as never).select('id,merch_variant_id,availability_status,provider_cost_cents,status').eq('product_mapping_id', mapping.id),
  ]);
  const minimumMargin = Number((controlsResult.data as unknown as { minimum_margin_cents?: number } | null)?.minimum_margin_cents ?? 0);
  const retail = itemResult.data?.price_cents ?? 0;
  const variants = (variantsResult.data ?? []) as unknown as Array<{ id: string; merch_variant_id: string; availability_status: string; provider_cost_cents: number | null; status: string }>;
  if (itemResult.error || controlsResult.error || variantsResult.error || !variants.length) throw new PrintfulBoundaryError('Printful review evidence is incomplete.');
  const merchVariantResult = await admin.from('merch_variants' as never)
    .select('id,price_cents,sort_order')
    .in('id', variants.map(variant => variant.merch_variant_id));
  if (merchVariantResult.error) throw merchVariantResult.error;
  const merchVariantById = new Map(((merchVariantResult.data ?? []) as unknown as Array<{ id: string; price_cents: number | null; sort_order: number }>)
    .map(variant => [variant.id, variant]));
  const now = new Date().toISOString();
  const marginSafe = (variant: typeof variants[number]) => variant.provider_cost_cents !== null
    && (merchVariantById.get(variant.merch_variant_id)?.price_cents ?? retail) - variant.provider_cost_cents >= minimumMargin;
  const eligible = variants.filter(variant => variant.availability_status === 'active' && marginSafe(variant));
  const unavailable = variants.filter(variant => variant.availability_status !== 'active' && marginSafe(variant));
  const blocked = variants.filter(variant => !eligible.some(candidate => candidate.id === variant.id));
  const pricingBlocked = blocked.filter(variant => !unavailable.some(candidate => candidate.id === variant.id));
  const clearDefault = await admin.from('merch_variants' as never).update({ is_default: false } as never).eq('item_id', itemId);
  if (clearDefault.error) throw clearDefault.error;
  const operations = [];
  if (eligible.length) {
    const defaultVariant = eligible
      .map(variant => ({ ...variant, sort_order: merchVariantById.get(variant.merch_variant_id)?.sort_order ?? Number.MAX_SAFE_INTEGER }))
      .sort((left, right) => left.sort_order - right.sort_order)[0];
    operations.push(
      admin.from('printful_variant_mappings' as never).update({ status: 'reviewed', reviewed_at: now, reviewed_by: adminId } as never).in('id', eligible.map(variant => variant.id)),
      admin.from('merch_variants' as never).update({ status: 'active' } as never).in('id', eligible.map(variant => variant.merch_variant_id)),
      admin.from('merch_variants' as never).update({ is_default: true } as never).eq('id', defaultVariant.merch_variant_id),
    );
  }
  if (blocked.length) {
    operations.push(
      admin.from('printful_variant_mappings' as never).update({ status: 'blocked', reviewed_at: null, reviewed_by: null } as never).in('id', blocked.map(variant => variant.id)),
    );
  }
  if (unavailable.length) operations.push(
    admin.from('merch_variants' as never).update({ status: 'unavailable' } as never).in('id', unavailable.map(variant => variant.merch_variant_id)),
  );
  if (pricingBlocked.length) operations.push(
    admin.from('merch_variants' as never).update({ status: 'draft' } as never).in('id', pricingBlocked.map(variant => variant.merch_variant_id)),
  );
  operations.push(admin.from('printful_product_mappings' as never).update(eligible.length ? {
    status: 'reviewed', reviewed_at: now, reviewed_by: adminId,
  } as never : {
    status: 'blocked', reviewed_at: null, reviewed_by: null,
  } as never).eq('id', mapping.id));
  const results = await Promise.all(operations);
  const failed = results.find(result => result.error);
  if (failed?.error) throw failed.error;
  if (eligible.length) {
    const retailPrices = eligible
      .map(variant => merchVariantById.get(variant.merch_variant_id)?.price_cents)
      .filter((value): value is number => value !== null && value !== undefined && value > 0);
    const providerCosts = variants
      .map(variant => variant.provider_cost_cents)
      .filter((value): value is number => value !== null);
    if (!retailPrices.length) throw new PrintfulBoundaryError('Printful retail-price evidence is incomplete.');
    const approval = await admin.from('printful_pricing_approvals' as never).insert({
      item_id: itemId,
      retail_price_cents: Math.min(...retailPrices),
      maximum_provider_cost_cents: Math.max(0, ...providerCosts),
      minimum_margin_cents: minimumMargin,
      eligible_variant_count: eligible.length,
      blocked_variant_count: blocked.length,
      approved_by: adminId,
    } as never);
    if (approval.error) throw approval.error;
  }
  return {
    itemId,
    productStatus: eligible.length ? 'reviewed' : 'blocked',
    reviewedVariantCount: eligible.length,
    blockedVariantCount: blocked.length,
  };
}

/** Publish only reviewed, margin-safe Printful merchandise with 44OS-owned imagery. */
export async function publishPrintfulProduct(itemId: string, adminId: string) {
  const admin = commerceAdminClient();
  const mappingResult = await admin.from('printful_product_mappings' as never)
    .select('id,status').eq('item_id', itemId).single();
  if (mappingResult.error) throw new PrintfulBoundaryError('Import the Printful product before publishing.');
  const mapping = mappingResult.data as unknown as { id: string; status: string };
  const [itemResult, variantsResult, imagesResult] = await Promise.all([
    admin.from('catalog_items').select('id,author_id,experience_type,fulfillment_type').eq('id', itemId).single(),
    admin.from('printful_variant_mappings' as never)
      .select('id,catalog_variant_id,provider_cost_cents,availability_status,status,color_value')
      .eq('product_mapping_id', mapping.id),
    admin.from('merch_product_images' as never).select('role,color_value,is_featured').eq('item_id', itemId),
  ]);
  if (itemResult.error || variantsResult.error || imagesResult.error) {
    throw new PrintfulBoundaryError('Printful publication evidence is incomplete.');
  }
  const item = itemResult.data as { id: string; author_id: string; experience_type: string; fulfillment_type: string };
  const variants = variantsResult.data as unknown as Array<{
    id: string; catalog_variant_id: number; provider_cost_cents: number | null; availability_status: string; status: string; color_value: string | null;
  }>;
  const images = imagesResult.data as unknown as Array<{ role: 'color' | 'bonus'; color_value: string | null; is_featured: boolean }>;
  const controlsResult = await admin.from('commerce_runtime_controls').select('platform_seller_id').eq('singleton', true).single();
  if (controlsResult.error || item.experience_type !== 'merch' || item.fulfillment_type !== 'physical'
    || item.author_id !== controlsResult.data?.platform_seller_id) {
    throw new PrintfulBoundaryError('Only forty four-owned physical Merch can be published.');
  }
  const eligible = variants.filter(variant => variant.availability_status === 'active' && variant.status === 'reviewed');
  if (mapping.status !== 'reviewed' || !eligible.length) {
    throw new PrintfulBoundaryError('Review the current Printful product and at least one available variant before publishing.');
  }
  if (!images.some(image => image.is_featured)) {
    throw new PrintfulBoundaryError('Choose one featured 44OS product image before publishing.');
  }
  const imageColors = new Set(images.filter(image => image.role === 'color' && image.color_value)
    .map(image => image.color_value!.trim().toLowerCase()));
  const missingColors = [...new Set(eligible.map(variant => variant.color_value?.trim()).filter((color): color is string => Boolean(color)))]
    .filter(color => !imageColors.has(color.toLowerCase()));
  if (missingColors.length) {
    throw new PrintfulBoundaryError(`Upload a 44OS color image for: ${missingColors.join(', ')}.`);
  }
  await assertCurrentProviderVariants(eligible.map(variant => ({
    catalog_variant_id: variant.catalog_variant_id,
    provider_cost_cents: variant.provider_cost_cents,
  })));
  const [itemUpdate, offerUpdate] = await Promise.all([
    admin.from('catalog_items').update({ status: 'published' }).eq('id', itemId),
    admin.from('catalog_offers').update({ status: 'active' }).eq('item_id', itemId).eq('offer_type', 'physical_purchase'),
  ]);
  if (itemUpdate.error || offerUpdate.error) throw itemUpdate.error || offerUpdate.error;
  return { itemId, publishedBy: adminId, eligibleVariantCount: eligible.length };
}

export async function approvePrintfulRetailPrice(itemId: string, retailPriceCents: number, adminId: string) {
  if (!Number.isSafeInteger(retailPriceCents) || retailPriceCents <= 0) {
    throw new PrintfulBoundaryError('Enter a valid retail price.');
  }
  const admin = commerceAdminClient();
  const mappingResult = await admin.from('printful_product_mappings' as never)
    .select('id').eq('item_id', itemId).single();
  if (mappingResult.error) throw new PrintfulBoundaryError('Import the Printful product before approving its price.');
  const mappingId = (mappingResult.data as unknown as { id: string }).id;
  const [controlsResult, providerVariantsResult] = await Promise.all([
    admin.from('printful_runtime_controls' as never).select('minimum_margin_cents').eq('singleton', true).single(),
    admin.from('printful_variant_mappings' as never)
      .select('merch_variant_id,provider_cost_cents').eq('product_mapping_id', mappingId),
  ]);
  if (controlsResult.error || providerVariantsResult.error || !providerVariantsResult.data?.length) {
    throw new PrintfulBoundaryError('Printful pricing evidence is incomplete.');
  }
  const minimumMargin = Number((controlsResult.data as unknown as { minimum_margin_cents: number }).minimum_margin_cents);
  const providerVariants = providerVariantsResult.data as unknown as Array<{ merch_variant_id: string; provider_cost_cents: number | null }>;
  const costedVariants = providerVariants.filter(variant => variant.provider_cost_cents !== null);
  const eligibleVariants = costedVariants.filter(variant => retailPriceCents - variant.provider_cost_cents! >= minimumMargin);
  if (!eligibleVariants.length) {
    throw new PrintfulBoundaryError(`Retail price must preserve at least ${minimumMargin} cents above at least one current provider variant.`);
  }
  const maximumProviderCost = Math.max(0, ...costedVariants.map(variant => variant.provider_cost_cents!));
  const [itemUpdate, offerUpdate, variantUpdate] = await Promise.all([
    admin.from('catalog_items').update({ price_cents: retailPriceCents }).eq('id', itemId),
    admin.from('catalog_offers').update({ price_cents: retailPriceCents })
      .eq('item_id', itemId).eq('offer_type', 'physical_purchase'),
    admin.from('merch_variants' as never).update({ price_cents: retailPriceCents } as never)
      .in('id', providerVariants.map(variant => variant.merch_variant_id)),
  ]);
  if (itemUpdate.error) throw itemUpdate.error;
  if (offerUpdate.error) throw offerUpdate.error;
  if (variantUpdate.error) throw variantUpdate.error;
  const review = await reviewPrintfulProduct(itemId, adminId);
  const approval = await admin.from('printful_pricing_approvals' as never).insert({
    item_id: itemId,
    retail_price_cents: retailPriceCents,
    maximum_provider_cost_cents: maximumProviderCost,
    minimum_margin_cents: minimumMargin,
    eligible_variant_count: eligibleVariants.length,
    blocked_variant_count: providerVariants.length - eligibleVariants.length,
    approved_by: adminId,
  } as never);
  if (approval.error) throw approval.error;
  return {
    ...review,
    retailPriceCents,
    maximumProviderCostCents: maximumProviderCost,
    minimumMarginCents: minimumMargin,
    eligibleVariantCount: eligibleVariants.length,
    blockedVariantCount: providerVariants.length - eligibleVariants.length,
  };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as JsonRecord).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function estimatePrintfulShipping(input: {
  recipient: { countryCode: string; stateCode?: string; postalCode?: string };
  currency: string;
  items: Array<{ merchVariantId: string; quantity: number }>;
}) {
  const admin = commerceAdminClient();
  const controlsResult = await admin.from('printful_runtime_controls' as never).select('*').eq('singleton', true).single();
  const controls = controlsResult.data as unknown as { shipping_quotes_enabled: boolean; store_id: number; quote_ttl_minutes: number; minimum_margin_cents: number } | null;
  if (controlsResult.error || !controls?.shipping_quotes_enabled || controls.store_id !== printfulStoreId()) {
    throw new PrintfulBoundaryError('Printful shipping quotes are disabled.');
  }
  const countryCode = input.recipient.countryCode.toUpperCase();
  const stateCode = input.recipient.stateCode?.toUpperCase();
  const currency = input.currency.toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode) || !/^[A-Z]{3}$/.test(currency) || !input.items.length
    || input.items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
    throw new PrintfulBoundaryError('Printful quote details are invalid.');
  }
  if (countryCode !== LAUNCH_SHIPPING_COUNTRY) {
    throw new PrintfulBoundaryError('Initial 44OS Merch fulfillment is limited to United States addresses.');
  }
  if (['US', 'CA', 'AU'].includes(countryCode) && !stateCode) throw new PrintfulBoundaryError('State is required for this Printful destination.');
  const variantIds = [...new Set(input.items.map(item => item.merchVariantId))];
  const mappingsResult = await admin.from('printful_variant_mappings' as never)
    .select('merch_variant_id,catalog_variant_id,status,availability_status,product_mapping_id,provider_cost_cents')
    .in('merch_variant_id', variantIds);
  const mappings = (mappingsResult.data ?? []) as unknown as Array<{ merch_variant_id: string; catalog_variant_id: number; status: string; availability_status: string; product_mapping_id: string; provider_cost_cents: number | null }>;
  if (mappingsResult.error || mappings.length !== variantIds.length
    || mappings.some(mapping => mapping.status !== 'reviewed' || mapping.availability_status !== 'active')) {
    throw new PrintfulBoundaryError('One or more Merch variants are unmapped, unavailable, or unreviewed.');
  }
  const productMappingsResult = await admin.from('printful_product_mappings' as never)
    .select('id,item_id').in('id', [...new Set(mappings.map(mapping => mapping.product_mapping_id))]);
  const productMappings = (productMappingsResult.data ?? []) as unknown as Array<{ id: string; item_id: string }>;
  const itemsResult = await admin.from('catalog_items').select('id,price_cents').in('id', productMappings.map(mapping => mapping.item_id));
  const prices = new Map((itemsResult.data ?? []).map(item => [item.id, item.price_cents]));
  const itemByMapping = new Map(productMappings.map(mapping => [mapping.id, mapping.item_id]));
  if (productMappingsResult.error || itemsResult.error || productMappings.length !== new Set(mappings.map(mapping => mapping.product_mapping_id)).size
    || mappings.some(mapping => mapping.provider_cost_cents === null
      || (prices.get(itemByMapping.get(mapping.product_mapping_id) ?? '') ?? 0) - mapping.provider_cost_cents < controls.minimum_margin_cents)) {
    throw new PrintfulBoundaryError('One or more Merch variants no longer meet the approved base-cost margin.');
  }
  await assertCurrentProviderVariants(mappings);
  const mappingByVariant = new Map(mappings.map(mapping => [mapping.merch_variant_id, mapping]));
  const providerItems = input.items.map(item => ({ variant_id: mappingByVariant.get(item.merchVariantId)!.catalog_variant_id, quantity: item.quantity }));
  const recipient = {
    country_code: countryCode,
    ...(stateCode ? { state_code: stateCode } : {}),
    ...(input.recipient.postalCode ? { zip: input.recipient.postalCode.trim() } : {}),
  };
  const rates = await printfulRequest<ShippingRate[]>('/shipping/rates', {
    method: 'POST', body: JSON.stringify({ recipient, items: providerItems, currency, locale: 'en_US' }),
  });
  const safeRates = rates.map(rate => ({
    id: rate.id,
    name: rate.name ?? rate.id,
    rateCents: cents(rate.rate),
    currency: rate.currency.toUpperCase(),
    minDeliveryDays: rate.minDeliveryDays ?? null,
    maxDeliveryDays: rate.maxDeliveryDays ?? null,
    minDeliveryDate: rate.minDeliveryDate ?? null,
    maxDeliveryDate: rate.maxDeliveryDate ?? null,
  })).filter(rate => rate.rateCents !== null && rate.currency === currency);
  if (!safeRates.length) throw new PrintfulBoundaryError('Printful returned no usable shipping rates.');
  const recipientFingerprint = createHash('sha256').update(stableJson(recipient)).digest('hex');
  const quoteKey = createHash('sha256').update(stableJson({ storeId: controls.store_id, recipientFingerprint, currency, providerItems, safeRates })).digest('hex');
  const quotedAt = new Date();
  const expiresAt = new Date(quotedAt.getTime() + controls.quote_ttl_minutes * 60_000);
  const quote = await admin.from('printful_shipping_quotes' as never).upsert({
    quote_key: quoteKey,
    store_id: controls.store_id,
    recipient_fingerprint: recipientFingerprint,
    country_code: countryCode,
    state_code: stateCode ?? null,
    currency,
    items_snapshot: input.items,
    rates_snapshot: safeRates,
    quoted_at: quotedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  } as never, { onConflict: 'quote_key' }).select('id,expires_at').single();
  if (quote.error) throw quote.error;
  return { quoteId: (quote.data as unknown as { id: string }).id, expiresAt: (quote.data as unknown as { expires_at: string }).expires_at, rates: safeRates };
}

export async function estimatePrintfulShippingForOrder(commerceOrderId: string) {
  const admin = commerceAdminClient();
  const [orderResult, addressResult, linesResult] = await Promise.all([
    admin.from('commerce_orders').select('id,status,currency').eq('id', commerceOrderId).single(),
    admin.from('commerce_order_addresses').select('country_code,region,postal_code').eq('order_id', commerceOrderId).single(),
    admin.from('commerce_order_items').select('merch_variant_id,quantity,offer_type').eq('order_id', commerceOrderId),
  ]);
  if (orderResult.error || !['paid', 'partially_refunded'].includes(orderResult.data?.status ?? '')) {
    throw new PrintfulBoundaryError('Only a verified paid physical order can be quoted.');
  }
  if (addressResult.error || addressResult.data?.country_code !== LAUNCH_SHIPPING_COUNTRY) {
    throw new PrintfulBoundaryError('The paid order does not have an approved United States delivery address.');
  }
  if (linesResult.error || !linesResult.data?.length
    || linesResult.data.some(line => line.offer_type !== 'physical_purchase' || !line.merch_variant_id)) {
    throw new PrintfulBoundaryError('The paid order does not contain an exact physical Merch variant.');
  }
  return estimatePrintfulShipping({
    recipient: {
      countryCode: addressResult.data.country_code,
      stateCode: addressResult.data.region,
      postalCode: addressResult.data.postal_code,
    },
    currency: orderResult.data.currency,
    items: linesResult.data.map(line => ({ merchVariantId: line.merch_variant_id!, quantity: line.quantity })),
  });
}

function draftExternalId(orderId: string) {
  return `44_${createHash('sha256').update(orderId).digest('hex').slice(0, 24)}`;
}

export async function createPrintfulDraftOrder(commerceOrderId: string, shippingQuoteId: string, selectedRateId: string) {
  const admin = commerceAdminClient();
  const controlsResult = await admin.from('printful_runtime_controls' as never).select('*').eq('singleton', true).single();
  const controls = controlsResult.data as unknown as { draft_orders_enabled: boolean; confirmation_enabled: boolean; store_id: number; minimum_margin_cents: number } | null;
  if (controlsResult.error || !controls?.draft_orders_enabled || controls.confirmation_enabled || controls.store_id !== printfulStoreId()) {
    throw new PrintfulBoundaryError('Printful draft-order creation is disabled.');
  }
  const existingResult = await admin.from('printful_fulfillment_orders' as never).select('*').eq('commerce_order_id', commerceOrderId).maybeSingle();
  const existing = existingResult.data as unknown as {
    provider_order_id?: number | null;
    provider_status?: string;
    provider_dashboard_url?: string | null;
  } | null;
  if (existingResult.error) throw existingResult.error;
  if (existing?.provider_order_id) return {
    providerOrderId: existing.provider_order_id,
    status: existing.provider_status,
    dashboardUrl: existing.provider_dashboard_url ?? null,
    reused: true,
  };
  const [orderResult, linesResult, addressResult, quoteResult] = await Promise.all([
    admin.from('commerce_orders').select('id,status,currency,total_cents').eq('id', commerceOrderId).single(),
    admin.from('commerce_order_items').select('id,item_id,offer_type,quantity,unit_price_cents,merch_variant_id').eq('order_id', commerceOrderId),
    admin.from('commerce_order_addresses').select('*').eq('order_id', commerceOrderId).single(),
    admin.from('printful_shipping_quotes' as never).select('*').eq('id', shippingQuoteId).single(),
  ]);
  if (orderResult.error || !['paid', 'partially_refunded'].includes(orderResult.data?.status ?? '')) throw new PrintfulBoundaryError('Only a paid physical order can create a Printful draft.');
  if (linesResult.error || !linesResult.data?.length || linesResult.data.some(line => line.offer_type !== 'physical_purchase' || !line.merch_variant_id)) {
    throw new PrintfulBoundaryError('Every physical order line requires an exact reviewed Merch variant.');
  }
  if (addressResult.error || addressResult.data?.country_code !== LAUNCH_SHIPPING_COUNTRY) {
    throw new PrintfulBoundaryError('The paid order has no approved United States delivery address.');
  }
  const quote = quoteResult.data as unknown as {
    id: string;
    store_id: number;
    expires_at: string;
    country_code: string;
    state_code: string | null;
    currency: string;
    recipient_fingerprint: string;
    items_snapshot: Array<{ merchVariantId: string; quantity: number }>;
    rates_snapshot: Array<{ id: string; rateCents: number; currency: string }>;
  } | null;
  const selectedRate = quote?.rates_snapshot?.find(rate => rate.id === selectedRateId);
  if (quoteResult.error || !quote || quote.store_id !== controls.store_id || new Date(quote.expires_at) <= new Date() || !selectedRate) {
    throw new PrintfulBoundaryError('Select a current provider shipping quote before creating a draft.');
  }
  const quoteRecipient = {
    country_code: addressResult.data.country_code,
    ...(addressResult.data.region ? { state_code: addressResult.data.region.toUpperCase() } : {}),
    ...(addressResult.data.postal_code ? { zip: addressResult.data.postal_code.trim() } : {}),
  };
  const expectedRecipientFingerprint = createHash('sha256').update(stableJson(quoteRecipient)).digest('hex');
  const expectedQuoteItems = linesResult.data.map(line => ({ merchVariantId: line.merch_variant_id!, quantity: line.quantity }));
  if (quote.country_code !== addressResult.data.country_code
    || quote.currency !== orderResult.data.currency
    || quote.recipient_fingerprint !== expectedRecipientFingerprint
    || stableJson(quote.items_snapshot) !== stableJson(expectedQuoteItems)) {
    throw new PrintfulBoundaryError('The shipping quote does not belong to this exact paid order.');
  }
  const merchVariantIds = linesResult.data.map(line => line.merch_variant_id!);
  const mappingsResult = await admin.from('printful_variant_mappings' as never)
    .select('id,merch_variant_id,sync_variant_id,catalog_variant_id,status,availability_status,provider_cost_cents')
    .in('merch_variant_id', merchVariantIds);
  const mappings = (mappingsResult.data ?? []) as unknown as Array<{ id: string; merch_variant_id: string; sync_variant_id: number; catalog_variant_id: number; status: string; availability_status: string; provider_cost_cents: number | null }>;
  if (mappingsResult.error || mappings.length !== merchVariantIds.length
    || mappings.some(mapping => mapping.status !== 'reviewed' || mapping.availability_status !== 'active')) {
    throw new PrintfulBoundaryError('A physical order line is unmapped or unavailable at Printful.');
  }
  const mappingByVariant = new Map(mappings.map(mapping => [mapping.merch_variant_id, mapping]));
  if (linesResult.data.some(line => {
    const providerCost = mappingByVariant.get(line.merch_variant_id!)?.provider_cost_cents;
    return providerCost === null || providerCost === undefined || line.unit_price_cents - providerCost < controls.minimum_margin_cents;
  })) throw new PrintfulBoundaryError('A physical order line no longer meets the approved base-cost margin.');
  await assertCurrentProviderVariants(mappings);
  const providerItems = linesResult.data.map(line => ({
    external_id: draftExternalId(line.id),
    sync_variant_id: mappingByVariant.get(line.merch_variant_id!)!.sync_variant_id,
    quantity: line.quantity,
    retail_price: (line.unit_price_cents / 100).toFixed(2),
  }));
  const address = addressResult.data!;
  const recipient = {
    name: address.recipient_name,
    address1: address.address_line_1,
    ...(address.address_line_2 ? { address2: address.address_line_2 } : {}),
    city: address.city,
    state_code: address.region,
    country_code: address.country_code,
    zip: address.postal_code,
  };
  const externalId = draftExternalId(commerceOrderId);
  const requestSnapshot = {
    externalId,
    shippingQuoteId,
    selectedRateId,
    recipientFingerprint: createHash('sha256').update(stableJson(recipient)).digest('hex'),
    items: linesResult.data.map(line => ({ orderItemId: line.id, merchVariantId: line.merch_variant_id, quantity: line.quantity })),
  };
  const localDraft = await admin.from('printful_fulfillment_orders' as never).upsert({
    commerce_order_id: commerceOrderId,
    shipping_quote_id: shippingQuoteId,
    store_id: controls.store_id,
    external_id: externalId,
    provider_status: 'draft',
    charged_cents: 0,
    confirmation_requested_at: null,
    request_snapshot: requestSnapshot,
  } as never, { onConflict: 'commerce_order_id' }).select('id').single();
  if (localDraft.error) throw localDraft.error;
  let providerOrder: JsonRecord;
  try {
    providerOrder = await printfulRequest<JsonRecord>(`/orders/@${externalId}`);
  } catch (error) {
    if (!(error instanceof PrintfulProviderError) || error.providerStatus !== 404) throw error;
    providerOrder = await printfulRequest<JsonRecord>('/orders?confirm=false&update_existing=false', {
      method: 'POST', body: JSON.stringify({ external_id: externalId, shipping: selectedRateId, recipient, items: providerItems }),
    });
  }
  const providerStatus = typeof providerOrder.status === 'string' ? providerOrder.status : 'unknown';
  if (!SAFE_DRAFT_STATUSES.has(providerStatus)) throw new PrintfulBoundaryError('Printful returned a status outside the draft-only phase.');
  const providerOrderId = Number(providerOrder.id);
  if (!Number.isSafeInteger(providerOrderId) || providerOrderId <= 0) throw new PrintfulProviderError('Printful draft response had no order ID.', 502);
  const costs = providerOrder.costs && typeof providerOrder.costs === 'object' ? providerOrder.costs as JsonRecord : {};
  const dashboardUrl = typeof providerOrder.dashboard_url === 'string' && providerOrder.dashboard_url.startsWith('https://')
    ? providerOrder.dashboard_url
    : null;
  const update = await admin.from('printful_fulfillment_orders' as never).update({
    provider_order_id: providerOrderId,
    provider_status: providerStatus,
    provider_currency: typeof costs.currency === 'string' ? costs.currency.toUpperCase() : orderResult.data.currency,
    provider_subtotal_cents: cents(costs.subtotal),
    provider_shipping_cents: cents(costs.shipping),
    provider_tax_cents: cents(costs.tax),
    provider_total_cents: cents(costs.total),
    charged_cents: 0,
    confirmation_requested_at: null,
    provider_dashboard_url: dashboardUrl,
    response_snapshot: { id: providerOrderId, externalId, status: providerStatus },
  } as never).eq('id', (localDraft.data as unknown as { id: string }).id);
  if (update.error) throw update.error;
  for (const line of linesResult.data) {
    const mapping = mappingByVariant.get(line.merch_variant_id!)!;
    const linked = await admin.from('printful_fulfillment_order_items' as never).upsert({
      fulfillment_order_id: (localDraft.data as unknown as { id: string }).id,
      commerce_order_item_id: line.id,
      variant_mapping_id: mapping.id,
      quantity: line.quantity,
      provider_cost_cents: mapping.provider_cost_cents,
    } as never, { onConflict: 'commerce_order_item_id' });
    if (linked.error) throw linked.error;
  }
  return { providerOrderId, status: providerStatus, dashboardUrl, reused: false };
}

export function verifyPrintfulWebhook(rawBody: string, signature: string | null) {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', printfulWebhookSecret()).update(rawBody).digest('hex');
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

export function printfulWebhookEventId(payload: JsonRecord) {
  const canonical = { ...payload };
  delete canonical.retries;
  return `pf_${createHash('sha256').update(stableJson(canonical)).digest('hex')}`;
}

export function printfulErrorResponse(error: unknown) {
  const known = error instanceof PrintfulConfigurationError || error instanceof PrintfulBoundaryError || error instanceof PrintfulProviderError;
  const developmentDetail = !known && process.env.NODE_ENV === 'development' && error instanceof Error
    ? error.message
      .replace(/https?:\/\/\S+/g, '[url]')
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
      .replace(/(?:Bearer\s+)?(?:sk_|whsec_|eyJ)[A-Za-z0-9._-]+/gi, '[credential]')
      .slice(0, 240)
    : undefined;
  return Response.json({
    error: known ? error.message : 'Printful operation could not be completed.',
    code: known ? error.code : 'printful_operation_failed',
    ...(developmentDetail ? { detail: developmentDetail } : {}),
  }, { status: known ? error.status : 400, headers: { 'Cache-Control': 'no-store' } });
}
