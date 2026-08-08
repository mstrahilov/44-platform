import { readFile } from 'node:fs/promises';

const [migration, beatActivation, session, webhook, checkout, checkoutConfig, availability, commerce, diagnostics, envExample, preflight, sandboxVerify] = await Promise.all([
  Promise.all([
    readFile('supabase/migrations/20260716022000_m12_stripe_verified_payments.sql', 'utf8'),
    readFile('supabase/migrations/20260716025000_m12_stripe_processor_fee_allocation.sql', 'utf8'),
    readFile('supabase/migrations/20260716030000_m12_stripe_acceptance_reconciliation.sql', 'utf8'),
  ]).then(parts => parts.join('\n')),
  Promise.all([
    readFile('supabase/migrations/20260729010000_m18_nonexclusive_beat_store_activation.sql', 'utf8'),
    readFile('supabase/migrations/20260807010000_v12_activate_standard_beat_sales.sql', 'utf8'),
    readFile('supabase/migrations/20260807020000_v12_sync_published_beat_offers.sql', 'utf8'),
  ]).then(parts => parts.join('\n')),
  readFile('src/app/api/checkout/session/route.ts', 'utf8'),
  readFile('src/app/api/stripe/webhook/route.ts', 'utf8'),
  readFile('src/app/checkout/page.tsx', 'utf8'),
  readFile('src/app/api/checkout/config/route.ts', 'utf8'),
  readFile('src/lib/commerceAvailability.ts', 'utf8'),
  readFile('src/lib/server/commerce.ts', 'utf8'),
  readFile('src/app/api/admin/commerce/diagnostics/route.ts', 'utf8'),
  readFile('.env.example', 'utf8'),
  readFile('scripts/stripe-sandbox-preflight.mjs', 'utf8'),
  readFile('scripts/stripe-sandbox-verify.mjs', 'utf8'),
]);

const requirements = [
  ['durable order before provider redirect', /create_stripe_pending_order[\s\S]*stripe\.checkout\.sessions\.create/, session],
  ['server offer price is the Stripe amount', /unit_amount:\s*line\.unit_price_cents/, session],
  ['implicit offer resolution remains digital and physical only', /\['physical_purchase', 'digital_download'\]/, session],
  ['Beat checkout requires an exact selected offer', /beatOfferIds[\s\S]*licenseAcceptances[\s\S]*termsSha256/, session],
  ['Beat checkout accepts only active standard non-exclusive terms', /template\.status !== 'active'[\s\S]*template\.is_exclusive[\s\S]*\['basic', 'premium', 'trackout'\]/, session],
  ['Beat launch no longer depends on the retired deployment presentation flag', /const beatOfferIds[\s\S]*const nonBeatOfferIds[\s\S]*nonBeatOfferIds\.length[\s\S]*NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE/, session],
  ['standard Beat licenses use the approved digital music tax classification', /experienceType === 'music' \|\| experienceType === 'beat'[\s\S]*STRIPE_MUSIC_TAX_CODE/, commerce],
  ['Beat cart boundary requires offer, tier, and terms digest', /PUBLIC_BEAT_PURCHASES_AVAILABLE[\s\S]*item\.offer_id && item\.tier_code && item\.terms_sha256/, availability],
  ['Beat configuration checks all server runtime gates', /catalog_enabled,publishing_enabled,checkout_enabled,nonexclusive_pilot_enabled[\s\S]*beatReady/, checkoutConfig],
  ['Beat launch keeps split and exclusive sales disabled', /checkout_enabled=true[\s\S]*nonexclusive_pilot_enabled=true[\s\S]*split_sales_enabled=false[\s\S]*exclusive_sales_enabled=false/, beatActivation],
  ['Beat launch activates only complete published approved-creator offers', /item\.status='published'[\s\S]*is_creator_paid_sales_enabled[\s\S]*beat_configuration_health/, beatActivation],
  ['future eligible Beat publications activate their standard offers', /catalog_items_sync_published_beat_offers[\s\S]*template\.tier_code in \('basic','premium','trackout'\)[\s\S]*beat_configuration_health/, beatActivation],
  ['Beat license order snapshot is immutable fulfillment evidence', /beat_license_snapshot[\s\S]*termsText[\s\S]*termsSha256[\s\S]*file_manifest/, beatActivation],
  ['physical-only shipping collection', /hasPhysical[\s\S]*shipping_address_collection[\s\S]*shippingRateIds/, session],
  ['Stripe-hosted payment Session', /checkout\.sessions\.create[\s\S]*mode:\s*'payment'/, session],
  ['runtime and operating-model gate', /not controls\.checkout_enabled[\s\S]*operating_model_approved_at/, migration],
  ['exact terms snapshot', /terms_snapshot[\s\S]*'body',terms\.body[\s\S]*'sha256',terms\.body_sha256/, migration],
  ['raw webhook body', /const rawBody = await request\.text\(\)/, webhook],
  ['Stripe signature verification', /for \(const webhookSecret of webhookSecrets\)[\s\S]*webhooks\.constructEvent\(rawBody, signature, webhookSecret\)/, webhook],
  ['invalid signature rejection', /Invalid Stripe signature[\s\S]*status: 400/, webhook],
  ['idempotent provider event inbox', /on conflict\(provider,provider_event_id\)/, migration],
  ['failed event retry path', /processing_status='failed'[\s\S]*retryable/, migration],
  ['webhook-authoritative paid return', /\/api\/checkout\/status[\s\S]*Confirming Payment/, checkout],
  ['concise linked checkout acceptance', /I agree to the <Link href="\/legal\/terms">Terms &amp; Conditions<\/Link>\{hasBeatLicense \? ' and each selected Beat license shown in this order' : ''\}\./, checkout],
  ['refund and dispute lifecycle', /charge\.refunded[\s\S]*charge\.dispute\.created[\s\S]*charge\.dispute\.closed/, webhook],
  ['entitlement revocation evidence', /commerce_entitlement_grants[\s\S]*revoked_reason='Stripe dispute'/, migration],
  ['creator earnings exact allocator', /record_creator_earnings_adjustment[\s\S]*target_amount_cents-sum\(base_amount\)/, migration],
  ['actual processor fee evidence', /latest_charge\.balance_transaction[\s\S]*processor_fee/, webhook],
  ['processor fee exact allocator', /record_stripe_processor_fee_from_payment_event[\s\S]*fee_amount-sum\(base_amount\)/, migration],
  ['processor fee Charge idempotency', /charge_reference[\s\S]*allocated\.id\|\|':'\|\|charge_reference\|\|':processor_fee'/, migration],
  ['physical fulfillment address snapshot', /commerce_order_addresses[\s\S]*recipient_name/, migration],
  ['admin reconciliation boundary', /stripe\.checkout\.sessions\.retrieve[\s\S]*commerce_reconciliation_runs/, diagnostics],
  ['receipt-event reconciliation', /successfulPaymentEvents[\s\S]*codes\.push\('payment_event'\)/, diagnostics],
  ['Library delivery reconciliation', /libraryResult[\s\S]*codes\.push\('library_entry'\)/, diagnostics],
  ['processor-fee reconciliation', /balance_transaction[\s\S]*codes\.push\('processor_fee'\)/, diagnostics],
];
const acceptanceEnvironment = [
  'STRIPE_ACCEPTANCE_BUYER_ID', 'STRIPE_ACCEPTANCE_ITEM_ID', 'STRIPE_ACCEPTANCE_SESSION_ID',
  'STRIPE_ACCEPTANCE_EXPECTED_STATUS', 'STRIPE_ACCEPTANCE_USE_LOCAL_SUPABASE',
  'STRIPE_ACCEPTANCE_ALLOW_REMOTE', 'STRIPE_ACCEPTANCE_BUYER_EMAIL', 'STRIPE_ACCEPTANCE_BUYER_PASSWORD',
];
const requiredEnvironment = [
  'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'STRIPE_SHIPPING_RATE_IDS', 'STRIPE_AUTOMATIC_TAX_ENABLED', 'STRIPE_MERCH_TAX_CODE',
  'STRIPE_MERCH_HAT_TAX_CODE', 'STRIPE_MERCH_BAG_TAX_CODE',
  'STRIPE_BOOK_TAX_CODE', 'STRIPE_MUSIC_TAX_CODE', 'STRIPE_SAMPLE_PACK_TAX_CODE',
];
const failures = requirements.filter(([, pattern, source]) => !pattern.test(source)).map(([label]) => label);
for (const name of requiredEnvironment) {
  if (!envExample.split(/\r?\n/).some(line => line === `${name}=`)) failures.push(`environment name ${name}`);
}
for (const name of acceptanceEnvironment) {
  if (!envExample.split(/\r?\n/).some(line => line.startsWith(`${name}=`))) failures.push(`acceptance environment name ${name}`);
}
if (/NEXT_PUBLIC_STRIPE_(SECRET|WEBHOOK)/.test(envExample + session + webhook)) failures.push('Stripe secrets must never be public');
if (!/sk_test_/.test(preflight) || !/NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE must remain false/.test(preflight)) failures.push('sandbox preflight must enforce test mode and the public kill switch');
if (!/exactly one durable order/.test(sandboxVerify) || !/exactly one purchase Library entry/.test(sandboxVerify)
  || !/processor-fee accounting equals Stripe balance evidence/.test(sandboxVerify)) failures.push('sandbox verifier must reconcile order, Library, and processor-fee evidence');
if (!envExample.includes('NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE=false')) failures.push('emergency public purchase switch defaults false');
if (/payment_method_types:\s*\['card'\]/.test(session)) failures.push('Checkout must use Dashboard-managed dynamic payment methods');
if (failures.length) throw new Error(`Stripe commerce contract failed:\n${failures.map(label => `- ${label}`).join('\n')}`);
console.log(`Stripe commerce contract passed: ${requirements.length} lifecycle boundaries and ${requiredEnvironment.length} server configuration names.`);
