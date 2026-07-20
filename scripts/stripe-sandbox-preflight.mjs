import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { loadStripeSandboxEnvironment } from './stripe-sandbox-environment.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUIRED = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_AUTOMATIC_TAX_ENABLED',
  'STRIPE_BOOK_TAX_CODE',
  'STRIPE_MUSIC_TAX_CODE',
  'STRIPE_SAMPLE_PACK_TAX_CODE',
  'STRIPE_ACCEPTANCE_BUYER_ID',
  'STRIPE_ACCEPTANCE_ITEM_ID',
];

loadStripeSandboxEnvironment();

const failures = [];
const passes = [];
const fail = message => failures.push(message);
const pass = message => passes.push(message);

for (const name of REQUIRED) {
  if (!process.env[name]?.trim()) fail(`${name} is absent`);
}

const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
if (siteUrl) {
  try {
    const parsed = new URL(siteUrl);
    if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
      fail('NEXT_PUBLIC_APP_URL must use HTTPS outside localhost');
    } else {
      pass('checkout return URL is structurally safe');
    }
  } catch {
    fail('NEXT_PUBLIC_APP_URL is not a valid URL');
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    const isLocal = ['localhost', '127.0.0.1'].includes(parsed.hostname);
    if (!isLocal && process.env.STRIPE_ACCEPTANCE_ALLOW_REMOTE !== 'true') {
      fail('remote Supabase acceptance requires STRIPE_ACCEPTANCE_ALLOW_REMOTE=true');
    } else {
      pass(isLocal ? 'acceptance database is local' : 'remote acceptance database was explicitly allowed');
    }
  } catch {
    fail('NEXT_PUBLIC_SUPABASE_URL is not a valid URL');
  }
}

if (process.env.STRIPE_SECRET_KEY) {
  if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) fail('STRIPE_SECRET_KEY must be a Stripe test-mode secret');
  else pass('Stripe secret is test-mode scoped');
}
if (process.env.STRIPE_WEBHOOK_SECRET) {
  if (!process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) fail('STRIPE_WEBHOOK_SECRET must be a webhook signing secret');
  else pass('Stripe webhook secret has the expected server-only shape');
} else {
  pass('isolated sandbox command will inject an ephemeral Stripe CLI webhook secret');
}
if (process.env.STRIPE_AUTOMATIC_TAX_ENABLED) {
  if (process.env.STRIPE_AUTOMATIC_TAX_ENABLED !== 'true') fail('STRIPE_AUTOMATIC_TAX_ENABLED must be true after the tax decision is approved');
  else pass('approved automatic-tax control is enabled for the sandbox');
}
for (const name of ['STRIPE_BOOK_TAX_CODE', 'STRIPE_MUSIC_TAX_CODE', 'STRIPE_SAMPLE_PACK_TAX_CODE']) {
  if (process.env[name]) {
    if (!/^txcd_\d+$/.test(process.env[name])) fail(`${name} must be an approved txcd_ identifier`);
    else pass(`${name} has the expected shape`);
  }
}
for (const name of ['STRIPE_ACCEPTANCE_BUYER_ID', 'STRIPE_ACCEPTANCE_ITEM_ID']) {
  if (process.env[name] && !UUID.test(process.env[name])) fail(`${name} must be a UUID`);
}
if (process.env.NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE === 'true') {
  fail('NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE must remain false during preflight');
} else {
  pass('public emergency purchase presentation remains disabled');
}

const stripeCli = spawnSync('stripe', ['version'], { encoding: 'utf8' });
if (stripeCli.status !== 0) fail('Stripe CLI is not installed or not available on PATH');
else pass('Stripe CLI is available for signed local webhook forwarding');

if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 1 });
    const [, taxSettings] = await Promise.all([
      stripe.accounts.retrieve(),
      stripe.tax.settings.retrieve(),
    ]);
    pass('Stripe test account accepted the configured secret');
    if (taxSettings.livemode) fail('Stripe Tax settings unexpectedly resolved to live mode');
    else if (taxSettings.status !== 'active' || !taxSettings.head_office) {
      fail('Stripe sandbox Tax settings require a valid head office address');
    } else {
      pass('Stripe sandbox Tax settings are active with a head office address');
    }
  } catch {
    fail('Stripe test account could not be reached with the configured secret');
  }
}

if (!failures.length) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const buyerId = process.env.STRIPE_ACCEPTANCE_BUYER_ID;
  const itemId = process.env.STRIPE_ACCEPTANCE_ITEM_ID;
  const [buyer, controls, item, offers] = await Promise.all([
    supabase.auth.admin.getUserById(buyerId),
    supabase.from('commerce_runtime_controls').select('*').eq('singleton', true).maybeSingle(),
    supabase.from('catalog_items').select('id,status,experience_type,fulfillment_type,author_id,download_purchase_enabled,is_free').eq('id', itemId).maybeSingle(),
    supabase.from('catalog_offers').select('id,offer_type,fulfillment_type,status,price_cents,currency').eq('item_id', itemId).eq('offer_type', 'digital_download').eq('status', 'active'),
  ]);
  if (buyer.error || !buyer.data.user) fail('named acceptance buyer was not found');
  else pass('named acceptance buyer exists');
  if (controls.error || !controls.data) {
    fail('commerce runtime controls could not be read');
  } else {
    const ready = controls.data.checkout_enabled
      && controls.data.stripe_payments_enabled
      && controls.data.operating_model_approved_at
      && controls.data.approved_by
      && controls.data.terms_version_id
      && controls.data.platform_seller_id;
    if (!ready) fail('database commerce controls are not approved and enabled in the acceptance environment');
    else pass('database commerce controls are approved and enabled in the acceptance environment');
    if (ready) {
      const terms = await supabase.from('commerce_terms_versions')
        .select('id,status,effective_at').eq('id', controls.data.terms_version_id).maybeSingle();
      if (terms.error || terms.data?.status !== 'active' || !terms.data.effective_at || new Date(terms.data.effective_at) > new Date()) {
        fail('reviewed checkout/refund terms are not active');
      } else {
        pass('reviewed checkout/refund terms are active');
      }
    }
  }
  if (item.error || !item.data) {
    fail('named acceptance Item was not found');
  } else if (item.data.status !== 'published'
    || !['music', 'book', 'asset'].includes(item.data.experience_type)
    || !['digital', 'hybrid'].includes(item.data.fulfillment_type)
    || !item.data.download_purchase_enabled || item.data.is_free) {
    fail('named acceptance Item is not an eligible published non-Beat paid digital Item');
  } else {
    pass('named acceptance Item is an eligible published non-Beat paid digital Item');
    const sellerState = await supabase.rpc('get_creator_paid_sales_public_status', {
      target_creator_ids: [item.data.author_id],
    });
    if (sellerState.error || sellerState.data?.length !== 1 || !sellerState.data[0].can_sell_paid) {
      fail('named acceptance Item seller is not approved for paid sales');
    } else {
      pass('named acceptance Item seller is approved for paid sales');
    }
  }
  if (offers.error || offers.data?.length !== 1 || offers.data[0].price_cents <= 0) {
    fail('named acceptance Item must have exactly one active positive-price digital offer');
  } else {
    const [entitlements, beatOffer] = await Promise.all([
      supabase.from('offer_entitlements').select('entitlement_type').eq('offer_id', offers.data[0].id),
      supabase.from('beat_license_offers').select('offer_id', { count: 'exact', head: true }).eq('offer_id', offers.data[0].id),
    ]);
    if (entitlements.error || !entitlements.data?.some(row => row.entitlement_type === 'download')) {
      fail('acceptance offer has no download entitlement delivery contract');
    } else {
      pass('acceptance offer has a download entitlement delivery contract');
    }
    if (beatOffer.error || beatOffer.count !== 0) fail('named acceptance offer is linked to Beat licensing');
    else pass('named acceptance offer is outside Beat licensing');
  }
}

for (const message of passes) console.log(`PASS: ${message}`);
if (failures.length) {
  console.error(`Stripe sandbox preflight blocked (${failures.length}):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log('Stripe sandbox preflight passed. Public purchases remain disabled; proceed with the isolated browser lifecycle matrix.');
}
