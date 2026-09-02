import { readFile } from 'node:fs/promises';

const [migration, verifier, intentRoute, transactionRoute, notificationRoute, ordersRoute, environment, packageJSON] = await Promise.all([
  readFile('supabase/migrations/20260829010000_native_storekit_commerce.sql', 'utf8'),
  readFile('src/lib/server/storekit.ts', 'utf8'),
  readFile('src/app/api/native/v1/storekit/purchase-intents/route.ts', 'utf8'),
  readFile('src/app/api/native/v1/storekit/transactions/route.ts', 'utf8'),
  readFile('src/app/api/native/v1/storekit/notifications/route.ts', 'utf8'),
  readFile('src/app/api/native/v1/orders/route.ts', 'utf8'),
  readFile('.env.example', 'utf8'),
  readFile('package.json', 'utf8'),
]);

const requirements = [
  ['official Apple server library', /@apple\/app-store-server-library/, packageJSON],
  ['official signed transaction verification', /SignedDataVerifier[\s\S]*verifyAndDecodeTransaction/, verifier],
  ['official signed notification verification', /verifyAndDecodeNotification/, verifier],
  ['bundle and App Apple ID verification', /APPLE_BUNDLE_ID[\s\S]*APPLE_APP_ID/, verifier],
  ['production fail-closed enable switch', /APPLE_STOREKIT_ENABLED !== 'true'/, verifier],
  ['bounded signed payload input', /maximumBytes = 131_072[\s\S]*Buffer\.byteLength/, verifier],
  ['authenticated purchase intent', /authenticateCommerceRequest[\s\S]*prepare_native_storekit_purchase_intent_v1/, intentRoute],
  ['authenticated transaction fulfillment', /authenticateCommerceRequest[\s\S]*verifyStoreKitTransaction[\s\S]*fulfill_native_storekit_transaction_v1/, transactionRoute],
  ['client and signed account binding', /transaction\.appAccountToken[\s\S]*body\.app_account_token[\s\S]*user\.id/, transactionRoute],
  ['non-consumable-only fulfillment', /assertNonConsumableTransaction/, transactionRoute],
  ['server notification fulfillment', /verifyStoreKitNotification[\s\S]*process_native_storekit_notification_v1/, notificationRoute],
  ['notification transaction signature verification', /signedTransaction[\s\S]*verifyStoreKitTransaction/, notificationRoute],
  ['retryable notification response', /outcome\?\.retryable[\s\S]*status: 503[\s\S]*Retry-After/, notificationRoute],
  ['approved immutable product mapping', /native_storekit_product_mappings[\s\S]*approval_status[\s\S]*APPROVED[\s\S]*cannot be remapped/, migration],
  ['short-lived purchase intent', /native_storekit_purchase_intents[\s\S]*interval '15 minutes'/, migration],
  ['localized StoreKit price and currency evidence', /price_milliunits[\s\S]*storefront[\s\S]*paid_price_cents:=round\(target_price_milliunits\/10\.0\)/, migration],
  ['idempotent verified transaction ledger', /native_storekit_transactions[\s\S]*transaction_id text primary key[\s\S]*duplicate/, migration],
  ['canonical entitlement and Library fulfillment', /commerce_entitlement_grants[\s\S]*library_entries[\s\S]*finalize_beat_license_purchase/, migration],
  ['refund and revocation convergence', /REFUND','REVOKE[\s\S]*refresh_paid_entitlement[\s\S]*beat_license_grants/, migration],
  ['server-only tables and RPCs', /revoke all on public\.native_storekit_product_mappings[\s\S]*from public,anon,authenticated[\s\S]*grant execute[\s\S]*to service_role/, migration],
  ['raw signed data not persisted', /Raw signed JWS values are never retained/, migration],
  ['creator payouts wait for settlement evidence', /settlement importer[\s\S]*must not make an estimated[\s\S]*payout-eligible/, migration],
  ['App Store Beat fulfillment is independent of Stripe', /order_row\.provider='app_store' or controls\.stripe_payments_enabled/, migration],
  ['authenticated bounded Orders page', /(?=[\s\S]*authenticateCommerceRequest)(?=[\s\S]*\.eq\('buyer_id', user\.id\))(?=[\s\S]*Math\.min[\s\S]*50)(?=[\s\S]*next_cursor)/, ordersRoute],
];

const requiredEnvironment = [
  'APPLE_STOREKIT_ENABLED=false',
  'APPLE_BUNDLE_ID=com.fortyfour.os44',
  'APPLE_APP_ID=',
  'APPLE_ROOT_CERTIFICATES_BASE64=',
  'APPLE_STOREKIT_ALLOWED_ENVIRONMENTS=Production,Sandbox',
  'APPLE_STOREKIT_ONLINE_CHECKS=true',
];

const failures = requirements
  .filter(([, pattern, source]) => !pattern.test(source))
  .map(([label]) => label);
for (const entry of requiredEnvironment) {
  if (!environment.split(/\r?\n/).includes(entry)) failures.push(`environment default ${entry}`);
}
if (/\btransaction_jws\s+text\b/i.test(migration)
  || /\bsigned_payload\s+text\b/i.test(migration)) {
  failures.push('raw JWS must never be written to the database');
}
if (failures.length) {
  throw new Error(`StoreKit contract failed:\n${failures.map(label => `- ${label}`).join('\n')}`);
}
console.log(`StoreKit contract passed: ${requirements.length} verification, fulfillment, and revocation boundaries.`);
