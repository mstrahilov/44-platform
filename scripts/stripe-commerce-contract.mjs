import { readFile } from 'node:fs/promises';

const [migration, session, webhook, checkout, diagnostics, envExample, preflight, sandboxVerify] = await Promise.all([
  Promise.all([
    readFile('supabase/migrations/20260716022000_m12_stripe_verified_payments.sql', 'utf8'),
    readFile('supabase/migrations/20260716025000_m12_stripe_processor_fee_allocation.sql', 'utf8'),
    readFile('supabase/migrations/20260716030000_m12_stripe_acceptance_reconciliation.sql', 'utf8'),
  ]).then(parts => parts.join('\n')),
  readFile('src/app/api/checkout/session/route.ts', 'utf8'),
  readFile('src/app/api/stripe/webhook/route.ts', 'utf8'),
  readFile('src/app/checkout/page.tsx', 'utf8'),
  readFile('src/app/api/admin/commerce/diagnostics/route.ts', 'utf8'),
  readFile('.env.example', 'utf8'),
  readFile('scripts/stripe-sandbox-preflight.mjs', 'utf8'),
  readFile('scripts/stripe-sandbox-verify.mjs', 'utf8'),
]);

const requirements = [
  ['durable order before provider redirect', /create_stripe_pending_order[\s\S]*stripe\.checkout\.sessions\.create/, session],
  ['server offer price is the Stripe amount', /unit_amount:\s*line\.unit_price_cents/, session],
  ['digital and physical offer resolution', /\['physical_purchase', 'digital_download'\]/, session],
  ['physical-only shipping collection', /hasPhysical[\s\S]*shipping_address_collection[\s\S]*shippingRateIds/, session],
  ['Stripe-hosted payment Session', /checkout\.sessions\.create[\s\S]*mode:\s*'payment'/, session],
  ['runtime and operating-model gate', /not controls\.checkout_enabled[\s\S]*operating_model_approved_at/, migration],
  ['exact terms snapshot', /terms_snapshot[\s\S]*'body',terms\.body[\s\S]*'sha256',terms\.body_sha256/, migration],
  ['raw webhook body', /const rawBody = await request\.text\(\)/, webhook],
  ['Stripe signature verification', /webhooks\.constructEvent\(rawBody, signature, webhookSecret\)/, webhook],
  ['invalid signature rejection', /Invalid Stripe signature[\s\S]*status: 400/, webhook],
  ['idempotent provider event inbox', /on conflict\(provider,provider_event_id\)/, migration],
  ['failed event retry path', /processing_status='failed'[\s\S]*retryable/, migration],
  ['webhook-authoritative paid return', /\/api\/checkout\/status[\s\S]*Confirming Payment/, checkout],
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
