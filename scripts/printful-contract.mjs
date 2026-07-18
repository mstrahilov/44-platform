import { readFile } from 'node:fs/promises';

const [migration, manualFulfillmentMigration, variantCommerceMigration, merchImagesMigration, catalogSyncMigration, merchLifecycleMigration, adapter, adminRoute, merchImagesRoute, cleanupRoute, estimateRoute, draftRoute, webhookRoute, storefrontPreviewRoute, merchImagesDomain, storefrontPage, adminPage, merchDetail, envExample, runbook] = await Promise.all([
  readFile('supabase/migrations/20260716032000_m20_printful_draft_fulfillment.sql', 'utf8'),
  readFile('supabase/migrations/20260717020000_m20_manual_printful_fulfillment.sql', 'utf8'),
  readFile('supabase/migrations/20260716033000_m20_merch_variant_commerce.sql', 'utf8'),
  readFile('supabase/migrations/20260717021000_m20_merch_owned_product_images.sql', 'utf8'),
  readFile('supabase/migrations/20260717024000_m20_printful_catalog_sync.sql', 'utf8'),
  readFile('supabase/migrations/20260717025000_m20_merch_image_lifecycle.sql', 'utf8'),
  readFile('src/lib/server/printful.ts', 'utf8'),
  readFile('src/app/api/admin/printful/route.ts', 'utf8'),
  readFile('src/app/api/admin/merch-images/route.ts', 'utf8'),
  readFile('src/app/api/admin/merch-images/cleanup/route.ts', 'utf8'),
  readFile('src/app/api/admin/printful/estimate/route.ts', 'utf8'),
  readFile('src/app/api/admin/printful/draft-order/route.ts', 'utf8'),
  readFile('src/app/api/printful/webhook/route.ts', 'utf8'),
  readFile('src/app/api/store/merch/variants/route.ts', 'utf8'),
  readFile('src/lib/domain/merchImages.ts', 'utf8'),
  readFile('src/app/store/item/[identifier]/page.tsx', 'utf8'),
  readFile('src/app/admin/fulfillment/page.tsx', 'utf8'),
  readFile('src/components/admin/AdminMerchDetailApp.tsx', 'utf8'),
  readFile('.env.example', 'utf8'),
  readFile('Other/44OS_FOUNDATION.md', 'utf8'),
]);

const source = `${adapter}\n${adminRoute}\n${merchImagesRoute}\n${estimateRoute}\n${draftRoute}\n${webhookRoute}`;
const requirements = [
  ['database hard-locks confirmation false', /printful_confirmation_phase_lock check \(not confirmation_enabled\)/, migration],
  ['database forbids confirmation evidence', /confirmation_requested_at is null/, migration],
  ['database forbids provider charges', /charged_cents=0/, migration],
  ['forward migration still forbids in-app confirmation', /printful_no_api_confirmation_lock check \(not confirmation_enabled\)/, manualFulfillmentMigration],
  ['signed provider evidence may record manual production', /'draft','inreview','pending','onhold','partial','fulfilled','failed','canceled','returned'/, manualFulfillmentMigration],
  ['pricing approvals are immutable', /printful_pricing_approvals_immutable/, manualFulfillmentMigration],
  ['shipment evidence is separately minimized', /create table public\.printful_fulfillment_shipments/, manualFulfillmentMigration],
  ['only 44-owned Merch can map', /Printful mappings are restricted to 44-owned Merch/, migration],
  ['canonical variants are distinct from provider mappings', /create table public\.merch_variants[\s\S]*create table public\.printful_variant_mappings/, migration],
  ['unmapped variants fail closed', /unmapped, unavailable, or unreviewed/, adapter],
  ['provider product is re-fetched', /fetchPrintfulSyncProduct\(syncProductId\)/, adapter],
  ['provider catalog pagination is completed before reconciliation', /for \(let page = 0; page < 500; page \+= 1\)[\s\S]*offset=\$\{offset\}[\s\S]*Printful product pagination did not produce a complete snapshot/, adapter],
  ['incomplete or duplicate provider pages fail closed', /incomplete product snapshot[\s\S]*duplicate Sync Product identity/, adapter],
  ['catalog sync has a service-only concurrent-run lease', /create table public\.printful_catalog_sync_runs[\s\S]*printful_catalog_sync_one_running_store_idx[\s\S]*begin_printful_catalog_sync/, catalogSyncMigration],
  ['only completed snapshots may archive provider catalog history', /Failed or partial runs never archive product or variant history/, catalogSyncMigration],
  ['sync creates unseen provider products as permanent drafts', /if \(!itemId\)[\s\S]*createPendingPrintfulProduct[\s\S]*summary\.created/, adapter],
  ['sync updates provider facts from the complete snapshot', /await importPrintfulProduct\(itemId, providerProduct\.syncProductId, runId\)/, adapter],
  ['sync auto-activates only margin-safe sizes under an imaged reviewed color', /imagedColors\.has\(color\) && reviewedColorsBeforeSync\.has\(color\)/, adapter],
  ['new colors without the approved image gate remain staged', /stagedIds[\s\S]*status: 'draft'/, adapter],
  ['missing provider variants archive without deletion', /staleVariants[\s\S]*status: 'archived'[\s\S]*merch_variants/, adapter],
  ['missing provider products archive only after the full loop succeeds', /for \(const providerProduct of providerProducts\)[\s\S]*const staleProductsResult[\s\S]*status: 'archived'/, adapter],
  ['reappearing archived provider identities return to draft', /existingMapping\?\.status === 'archived' \? 'draft'/, adapter],
  ['sync returns the required Admin summary counts', /created: number;[\s\S]*updated: number;[\s\S]*staged: number;[\s\S]*archived: number/, adapter],
  ['provider Catalog Variant price and availability are re-fetched', /fetchPrintfulCatalogVariant\(catalogVariantId\)/, adapter],
  ['catalog out-of-stock truth overrides a stale active Sync Variant', /if \(inStock === false\) return 'out_of_stock'/, adapter],
  ['review re-fetches provider truth', /await importPrintfulProduct\(itemId, mapping\.sync_product_id\)/, adapter],
  ['base-cost margin is enforced per local variant price', /price_cents \?\? retail\) - variant\.provider_cost_cents >= minimumMargin/, adapter],
  ['review blocks unsafe variants individually', /blockedVariantCount: blocked\.length/, adapter],
  ['quote and draft operations recheck current provider truth', /assertCurrentProviderVariants\(mappings\)/, adapter],
  ['paid order lines recheck base-cost margin', /line\.unit_price_cents - providerCost < controls\.minimum_margin_cents/, adapter],
  ['shipping quotes use exact provider variants', /providerItems[\s\S]*\/shipping\/rates/, adapter],
  ['launch shipping is United States only', /countryCode !== LAUNCH_SHIPPING_COUNTRY/, adapter],
  ['paid-order quote is server-derived', /estimatePrintfulShippingForOrder/, adapter],
  ['quote is bound to the exact paid order', /shipping quote does not belong to this exact paid order/, adapter],
  ['shipping quote snapshots are content-addressed', /quoteKey = createHash\('sha256'\)/, adapter],
  ['draft external ID is deterministic', /draftExternalId\(commerceOrderId\)/, adapter],
  ['provider draft is looked up before creation', /\/orders\/@\$\{externalId\}[\s\S]*confirm=false&update_existing=false/, adapter],
  ['provider creation explicitly disables confirmation', /\/orders\?confirm=false&update_existing=false/, adapter],
  ['adapter rejects non-draft provider states', /SAFE_DRAFT_STATUSES\.has\(providerStatus\)/, adapter],
  ['raw webhook body is verified before JSON processing', /rawBody = await request\.text\(\)[\s\S]*verifyPrintfulWebhook\(rawBody, signature\)[\s\S]*JSON\.parse\(rawBody\)/, webhookRoute],
  ['webhook uses Printful HMAC header', /x-pf-webhook-signature/, webhookRoute],
  ['webhook retries have a stable content ID', /delete canonical\.retries/, adapter],
  ['out-of-order provider events cannot regress current state', /Older signed Printful event retained without regressing/, webhookRoute],
  ['fulfillment email requires processed signed evidence', /queue_fulfillment_email/, webhookRoute],
  ['admin role protects provider controls', /profile\.data\?\.role === 'admin'/, adminRoute],
  ['Printful retail price is distinct from provider production cost', /retail_price[\s\S]*provider_cost_cents/, adapter],
  ['provider retail prices populate canonical variant prices', /price_cents: retailCurrency === printfulStoreCurrency\(\) \? retailPrice : null/, adapter],
  ['complete-store sync replaces manual destination mapping', /Sync with Printful[\s\S]*complete verified store[\s\S]*New products become permanent drafts/, adminPage],
  ['new provider products remain unpublished', /createPendingPrintfulProduct[\s\S]*status: 'draft'/, adapter],
  ['Admin review records immutable provider-derived pricing evidence', /printful_pricing_approvals[\s\S]*retail_price_cents: Math\.min/, adapter],
  ['Admin paid-order queue creates drafts only', /Paid physical orders[\s\S]*Create Printful draft/, adminPage],
  ['admin UI names the hard lock', /Confirmation \/ charging[\s\S]*Hard-locked off/, adminPage],
  ['checkout requires an active reviewed provider mapping', /provider_variant\.status='reviewed'[\s\S]*provider_variant\.availability_status='active'/, variantCommerceMigration],
  ['orders snapshot local variants without provider IDs', /merch_variant_snapshot=jsonb_build_object\([\s\S]*'option_values'[\s\S]*'price_cents'/, variantCommerceMigration],
  ['customer-facing Merch imagery is 44OS-owned', /create table public\.merch_product_images[\s\S]*role in \('main','color','bonus'\)/, merchImagesMigration],
  ['one main and one image per color are unique', /merch_product_images_one_main_idx[\s\S]*merch_product_images_one_per_color_idx/, merchImagesMigration],
  ['image assignment atomically updates cards and color variants', /set_merch_product_image[\s\S]*cover_url=target_file_url[\s\S]*image_url=target_file_url/, merchImagesMigration],
  ['browser roles cannot mutate Merch imagery', /revoke all on public\.merch_product_images from anon,authenticated[\s\S]*grant select/, merchImagesMigration],
  ['Admin image upload is authenticated and type-limited', /requireAdmin\(request\)[\s\S]*ALLOWED_IMAGE_TYPES[\s\S]*MAX_IMAGE_BYTES/, merchImagesRoute],
  ['Admin uploads use the service-only atomic assignment', /rpc\('set_merch_product_image_v2'/, merchImagesRoute],
  ['featured selection replaces the former main-image role', /is_featured boolean[\s\S]*set is_featured=true[\s\S]*set role='bonus'/, merchLifecycleMigration],
  ['image metadata and duplicate prevention are durable', /content_sha256[\s\S]*merch_product_images_item_hash_idx/, merchLifecycleMigration],
  ['replaced or deleted files enter delayed cleanup', /merch_storage_cleanup_queue[\s\S]*'replaced','deleted','unreferenced'[\s\S]*not_before/, merchLifecycleMigration],
  ['published featured images require replacement before deletion', /published Merch Item needs a replacement featured image first/, merchLifecycleMigration],
  ['cleanup worker is bounded and dedicated-prefix safe', /BATCH_SIZE = 50[\s\S]*\^merch\\\//, cleanupRoute],
  ['Admin product detail exposes read-only facts and gallery controls', /Printful facts[\s\S]*Read-only[\s\S]*Set featured[\s\S]*Move up/, merchDetail],
  ['storefront reads the curated Merch gallery', /listPublicMerchImages[\s\S]*merch_product_images/, merchImagesDomain],
  ['color selection advances to the matching 44OS image', /merchGallery\.findIndex\(image => image\.role === 'color'/, storefrontPage],
  ['provider storefront preview discards imagery', /imageUrl: null/, adapter],
  ['provider imports discard product thumbnails', /thumbnail_url: null/, adapter],
  ['provider preview is development-only', /NODE_ENV === 'production'[\s\S]*NEXT_PUBLIC_COMMERCE_TEST_MODE !== 'true'/, storefrontPreviewRoute],
  ['provider preview returns sanitized storefront choices', /storefront-preview:[\s\S]*slice\(0, 24\)[\s\S]*availabilityStatus[\s\S]*selectable/, adapter],
  ['authoritative Printful operating contract exists', /Printful is inventory and fulfillment authority[\s\S]*complete paginated Sync[\s\S]*confirm=false[\s\S]*owner alone confirms manufacturing inside Printful/, runbook],
];

const failures = requirements.filter(([, pattern, content]) => !pattern.test(content)).map(([label]) => label);
if (/First-time 44OS destination|Create new pending product|Import as pending/.test(adminPage)) {
  failures.push('manual product-destination mapping controls must be absent');
}
if (/action === 'import_product'|action === 'create_pending_product'/.test(adminRoute)) {
  failures.push('manual product-destination mapping actions must be absent');
}
if (/cover_url:\s*null/.test(adapter)) failures.push('provider sync must not clear 44OS-owned featured covers');
for (const name of ['PRINTFUL_PRIVATE_TOKEN', 'PRINTFUL_STORE_ID', 'PRINTFUL_STORE_CURRENCY', 'PRINTFUL_WEBHOOK_SECRET', 'PRINTFUL_ACCEPTANCE_USE_LOCAL_SUPABASE']) {
  if (!envExample.split(/\r?\n/).some(line => line.startsWith(`${name}=`))) failures.push(`environment name ${name}`);
}
if (/NEXT_PUBLIC_PRINTFUL_/.test(source + envExample)) failures.push('Printful secrets and store configuration must never be public');
if (/\/orders\/[^'"`]*confirm/.test(adapter) || /confirmPrintful|confirmOrder/.test(source)) failures.push('Printful confirmation operation must not exist');
if (!envExample.includes('NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE=false')) failures.push('public purchase switch must remain off by default');
if (failures.length) throw new Error(`Printful contract failed:\n${failures.map(label => `- ${label}`).join('\n')}`);
console.log(`Printful draft-only contract passed: ${requirements.length} guarded boundaries and five server configuration names.`);
