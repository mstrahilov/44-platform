import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
  createPrintfulDraftOrder,
  estimatePrintfulShipping,
  importPrintfulProduct,
  reviewPrintfulProduct,
  verifyPrintfulConnection,
} from '@/lib/server/printful';

function loadFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

for (const path of ['.env.printful.local', '.env.local', '.env.test.local', '.env']) loadFile(path);
if (!process.argv.includes('--confirm-local-only')) throw new Error('Refusing acceptance writes without --confirm-local-only.');
if (!process.argv.includes('--create-provider-draft')) throw new Error('Refusing provider draft creation without --create-provider-draft.');

const hostedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const hostedAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!hostedUrl || !hostedAnonKey || new URL(hostedUrl).hostname === '127.0.0.1') throw new Error('The hosted public catalog source is unavailable.');

const expected = [
  { id: 'befd4ee9-6a11-48dc-893d-3d8fc65cb6cb', title: '44 T-Shirt', slug: 't-shirt', price_cents: 999, sort_order: 10 },
  { id: '5d9ffe4d-cdab-418e-afd5-6773d87d6e39', title: '44 Sweatshirt', slug: 'sweatshirt', price_cents: 2499, sort_order: 20 },
  { id: '73c06043-e1cd-4229-bd36-cef0612d9135', title: '44 Hoodie', slug: 'tiedye-hoodie', price_cents: 5999, sort_order: 30 },
  { id: '62610e6b-a5f2-48bc-b01e-6c2055f8505a', title: '44 Windbreaker', slug: 'windbreaker', price_cents: 3999, sort_order: 40 },
  { id: '417f3804-9c9f-49e6-829d-8694fb0921e9', title: '44 Beanie', slug: 'beanie', price_cents: 1499, sort_order: 50 },
  { id: '955bb70e-1369-49b4-82f0-b7294bd03d2c', title: '44 Hat', slug: 'hat', price_cents: 1499, sort_order: 60 },
  { id: 'b123ebf5-cea7-4c71-aef9-37ef1576fb44', title: '44 Bag', slug: 'bag', price_cents: 1499, sort_order: 70 },
  { id: '40ff7beb-6314-4e04-9681-c16d98bd9e43', title: '44 Tote', slug: 'tote', price_cents: 1999, sort_order: 80 },
] as const;

const catalogUrl = new URL('/rest/v1/catalog_items', hostedUrl);
catalogUrl.searchParams.set('select', 'id,title,slug,price_cents,status,experience_type,fulfillment_type,sort_order');
catalogUrl.searchParams.set('or', '(experience_type.eq.merch,fulfillment_type.eq.physical,fulfillment_type.eq.hybrid)');
catalogUrl.searchParams.set('order', 'sort_order.asc.nullslast,title.asc');
async function main() {
const catalogResponse = await fetch(catalogUrl, { headers: { apikey: hostedAnonKey!, Authorization: `Bearer ${hostedAnonKey!}` } });
const hostedCatalog = await catalogResponse.json() as Array<Record<string, unknown>>;
if (!catalogResponse.ok) throw new Error('The hosted public Merch catalog could not be audited.');
if (hostedCatalog.length !== expected.length || expected.some((item, index) => {
  const actual = hostedCatalog[index];
  return actual?.id !== item.id || actual?.title !== item.title || actual?.price_cents !== item.price_cents
    || actual?.status !== 'published' || actual?.experience_type !== 'merch' || actual?.fulfillment_type !== 'physical';
})) throw new Error('Hosted Merch differs from the approved eight-item launch list; no acceptance writes were made.');

const status = spawnSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' });
if (status.status !== 0) throw new Error('Local Supabase is not running.');
const local = JSON.parse(status.stdout) as { API_URL: string; ANON_KEY: string; SERVICE_ROLE_KEY: string };
if (!['127.0.0.1', 'localhost'].includes(new URL(local.API_URL).hostname)) throw new Error('Acceptance is restricted to local Supabase.');
process.env.NEXT_PUBLIC_SUPABASE_URL = local.API_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = local.ANON_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = local.SERVICE_ROLE_KEY;
process.env.NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE = 'false';

const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const category = await admin.from('item_categories').select('id').eq('slug', 'merch').single();
const commerceControls = await admin.from('commerce_runtime_controls').select('platform_seller_id').eq('singleton', true).single();
if (category.error || commerceControls.error || !commerceControls.data.platform_seller_id) throw new Error('Local platform Merch authority is unavailable.');
const sellerId = commerceControls.data.platform_seller_id;
const seeded = await admin.from('catalog_items').upsert(expected.map(item => ({
  ...item,
  item_category_id: category.data.id,
  creator: '44OS',
  item_type: ['44 Bag', '44 Tote'].includes(item.title) ? 'Bags' : ['44 Beanie', '44 Hat'].includes(item.title) ? 'Accessories' : 'Apparel',
  is_free: false,
  featured: false,
  tags: [],
  status: 'published',
  author_id: sellerId,
  experience_type: 'merch',
  fulfillment_type: 'physical',
})), { onConflict: 'id' });
if (seeded.error) throw seeded.error;

const adminUsername = 'm20_printful_admin';
const adminEmail = 'm20-printful-admin@example.test';
const password = randomBytes(24).toString('base64url');
const existingProfile = await admin.from('profiles').select('id').eq('username', adminUsername).maybeSingle();
if (existingProfile.error) throw existingProfile.error;
let adminId = existingProfile.data?.id;
if (adminId) {
  const updated = await admin.auth.admin.updateUserById(adminId, { password, email_confirm: true, user_metadata: { username: adminUsername } });
  if (updated.error) throw updated.error;
} else {
  const created = await admin.auth.admin.createUser({ email: adminEmail, password, email_confirm: true, user_metadata: { username: adminUsername } });
  if (created.error) throw created.error;
  adminId = created.data.user.id;
}
const adminProfile = await admin.from('profiles').update({ role: 'admin', display_name: 'M20 Printful Acceptance' }).eq('id', adminId);
if (adminProfile.error) throw adminProfile.error;

const provider = await verifyPrintfulConnection();
const connected = await admin.from('printful_runtime_controls').update({
  store_id: provider.storeId,
  provider_connected: true,
  catalog_import_enabled: true,
  shipping_quotes_enabled: true,
  draft_orders_enabled: true,
  confirmation_enabled: false,
  verified_at: new Date().toISOString(),
  approved_by: adminId,
}).eq('singleton', true);
if (connected.error) throw connected.error;

const providerProductsResponse = await fetch('https://api.printful.com/store/products?limit=100', {
  headers: { Authorization: `Bearer ${process.env.PRINTFUL_PRIVATE_TOKEN}`, 'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID! },
});
const providerProductsBody = await providerProductsResponse.json() as { result?: Array<{ id: number; name: string }> };
if (!providerProductsResponse.ok) throw new Error('Printful store products could not be read.');
const providerProducts = new Map((providerProductsBody.result ?? []).map(product => [product.name, product.id]));
const tShirtSyncId = providerProducts.get('44 T-Shirt');
const hoodieSyncId = providerProducts.get('44 Hoodie');
if (!tShirtSyncId || !hoodieSyncId) throw new Error('Both 44 T-Shirt and 44 Hoodie must exist in the configured Printful store.');

const tShirtImport = await importPrintfulProduct(expected[0].id, tShirtSyncId);
const tShirtReview = await reviewPrintfulProduct(expected[0].id, adminId);
const hoodieImport = await importPrintfulProduct(expected[2].id, hoodieSyncId);
const hoodieReview = await reviewPrintfulProduct(expected[2].id, adminId);

const localAcceptancePriceCents = 1999;
let firstDraft: Awaited<ReturnType<typeof createPrintfulDraftOrder>> | null = null;
let repeatedDraft: Awaited<ReturnType<typeof createPrintfulDraftOrder>> | null = null;
let quoteEvidence: { quoteId: string; rateId: string; rateCents: number } | null = null;
try {
  const temporaryPrice = await admin.from('catalog_items').update({ price_cents: localAcceptancePriceCents }).eq('id', expected[0].id);
  if (temporaryPrice.error) throw temporaryPrice.error;
  const viableReview = await reviewPrintfulProduct(expected[0].id, adminId);
  if (viableReview.reviewedVariantCount !== 12) throw new Error('The local-only viable-price review did not approve all available T-Shirt variants.');
  const tShirtProductMapping = await admin.from('printful_product_mappings').select('id').eq('item_id', expected[0].id).single();
  if (tShirtProductMapping.error) throw tShirtProductMapping.error;
  const selectedVariant = await admin.from('printful_variant_mappings').select('merch_variant_id').eq('product_mapping_id', tShirtProductMapping.data.id)
    .eq('status', 'reviewed').ilike('provider_name', '% / M').limit(1).single();
  if (selectedVariant.error) throw selectedVariant.error;
  const quote = await estimatePrintfulShipping({
    recipient: { countryCode: 'US', stateCode: 'IL', postalCode: '60601' },
    currency: 'USD',
    items: [{ merchVariantId: selectedVariant.data.merch_variant_id, quantity: 1 }],
  });
  const rate = quote.rates[0];
  if (!rate) throw new Error('Printful returned no rate for the synthetic acceptance address.');
  quoteEvidence = { quoteId: quote.quoteId, rateId: rate.id, rateCents: rate.rateCents! };

  const offerId = 'f4400000-0000-4000-8000-000000000001';
  const orderId = 'f4400000-0000-4000-8000-000000000002';
  const orderItemId = 'f4400000-0000-4000-8000-000000000003';
  const offer = await admin.from('catalog_offers').upsert({
    id: offerId, item_id: expected[0].id, code: 'm20-printful-local-physical', offer_type: 'physical_purchase',
    title: 'M20 local Printful T-Shirt', description: 'Local-only non-charging provider draft acceptance.',
    price_cents: localAcceptancePriceCents, currency: 'USD', status: 'active', fulfillment_type: 'physical', quantity_limit: 1,
  }, { onConflict: 'id' });
  if (offer.error) throw offer.error;
  const order = await admin.from('commerce_orders').upsert({
    id: orderId, buyer_id: adminId, status: 'paid', currency: 'USD', subtotal_cents: localAcceptancePriceCents,
    shipping_cents: rate.rateCents, total_cents: localAcceptancePriceCents + rate.rateCents!,
    idempotency_key: 'm20-printful-local-draft', paid_at: new Date().toISOString(), placed_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (order.error) throw order.error;
  const line = await admin.from('commerce_order_items').upsert({
    id: orderItemId, order_id: orderId, offer_id: offerId, item_id: expected[0].id, seller_id: sellerId,
    item_title: '44 T-Shirt', offer_title: 'M20 local Printful T-Shirt', offer_type: 'physical_purchase', quantity: 1,
    unit_price_cents: localAcceptancePriceCents, line_total_cents: localAcceptancePriceCents, currency: 'USD',
    fulfillment_status: 'pending', merch_variant_id: selectedVariant.data.merch_variant_id,
  }, { onConflict: 'id' });
  if (line.error) throw line.error;
  const address = await admin.from('commerce_order_addresses').upsert({
    order_id: orderId, recipient_name: 'M20 Printful Acceptance', address_line_1: '1 N State St',
    city: 'Chicago', region: 'IL', postal_code: '60601', country_code: 'US',
  }, { onConflict: 'order_id' });
  if (address.error) throw address.error;
  firstDraft = await createPrintfulDraftOrder(orderId, quote.quoteId, rate.id);
  repeatedDraft = await createPrintfulDraftOrder(orderId, quote.quoteId, rate.id);
  if (firstDraft.providerOrderId !== repeatedDraft.providerOrderId || !repeatedDraft.reused) throw new Error('Duplicate draft calls did not reuse the exact provider order.');
} finally {
  const restored = await admin.from('catalog_items').update({ price_cents: expected[0].price_cents }).eq('id', expected[0].id);
  if (restored.error) throw restored.error;
  await reviewPrintfulProduct(expected[0].id, adminId);
}

const mappings = await admin.from('printful_product_mappings').select('id,item_id,provider_name,status');
if (mappings.error) throw mappings.error;
const mappingByItem = new Map(mappings.data.map(mapping => [mapping.item_id, mapping]));
const variants = await admin.from('printful_variant_mappings').select('product_mapping_id,status,availability_status,provider_cost_cents');
if (variants.error) throw variants.error;
const summarize = (itemId: string) => {
  const mapping = mappingByItem.get(itemId);
  const rows = variants.data.filter(variant => variant.product_mapping_id === mapping?.id);
  return {
    productStatus: mapping?.status,
    variants: rows.length,
    reviewed: rows.filter(row => row.status === 'reviewed').length,
    blocked: rows.filter(row => row.status === 'blocked').length,
    unavailable: rows.filter(row => row.availability_status !== 'active').length,
    costRangeCents: rows.length ? [Math.min(...rows.map(row => row.provider_cost_cents ?? Number.MAX_SAFE_INTEGER)), Math.max(...rows.map(row => row.provider_cost_cents ?? 0))] : [],
  };
};
const controls = await admin.from('printful_runtime_controls').select('confirmation_enabled').eq('singleton', true).single();
const drafts = await admin.from('printful_fulfillment_orders').select('id,provider_order_id,provider_status,charged_cents,confirmation_requested_at');
if (controls.error || controls.data.confirmation_enabled || drafts.error || drafts.data.length !== 1
  || drafts.data[0].charged_cents !== 0 || drafts.data[0].confirmation_requested_at !== null || drafts.data[0].provider_status !== 'draft') {
  throw new Error('Draft-only acceptance boundary was not preserved.');
}
if (tShirtImport.variantCount !== 12 || hoodieImport.variantCount !== 5) throw new Error('Printful variant counts changed during acceptance.');

console.log(JSON.stringify({
  hostedCatalog: 'exact approved eight',
  providerStore: provider.name,
  tShirt: { import: tShirtImport, review: tShirtReview, evidence: summarize(expected[0].id) },
  hoodie: { import: hoodieImport, review: hoodieReview, evidence: summarize(expected[2].id) },
  shippingQuote: quoteEvidence,
  providerDraft: firstDraft,
  duplicateDraft: repeatedDraft,
  providerDraftOrdersCreated: 1,
  providerChargedCents: 0,
  confirmationEnabled: false,
}, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Printful acceptance failed.');
  process.exitCode = 1;
});
