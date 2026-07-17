import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { loadStripeSandboxEnvironment, STRIPE_SANDBOX_STATE_PATH } from './stripe-sandbox-environment.mjs';

const { state, useLocalSupabase } = loadStripeSandboxEnvironment();
if (!useLocalSupabase) throw new Error('The Stripe acceptance fixture is restricted to local Supabase.');
if (!process.argv.includes('--confirm-local-only')) {
  throw new Error('Refusing to write fixture data without --confirm-local-only.');
}
const buyerPassword = process.env.STRIPE_ACCEPTANCE_BUYER_PASSWORD;
if (!buyerPassword || buyerPassword.length < 12) {
  throw new Error('Set a 12+ character STRIPE_ACCEPTANCE_BUYER_PASSWORD in .env.stripe-sandbox.local.');
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const buyerEmail = process.env.STRIPE_ACCEPTANCE_BUYER_EMAIL || 'm12-stripe-buyer@example.test';
const sellerEmail = 'm12-stripe-seller@example.test';

async function ensureUser(email, password, username) {
  const profile = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
  if (profile.error) throw profile.error;
  if (profile.data) {
    const updated = await supabase.auth.admin.updateUserById(profile.data.id, { password, email_confirm: true, user_metadata: { username } });
    if (updated.error) throw updated.error;
    return updated.data.user;
  }
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username } });
  if (created.error) throw created.error;
  return created.data.user;
}

const buyer = await ensureUser(buyerEmail, buyerPassword, 'm12_stripe_buyer');
const seller = await ensureUser(sellerEmail, randomBytes(24).toString('base64url'), 'm12_stripe_seller');
const profileUpdate = await supabase.from('profiles').update({ role: 'admin', display_name: '44OS Stripe Sandbox' }).eq('id', seller.id);
if (profileUpdate.error) throw profileUpdate.error;

const category = await supabase.from('item_categories').select('id').eq('slug', 'music').single();
if (category.error) throw category.error;
let item = await supabase.from('catalog_items').select('id').eq('slug', 'm12-stripe-sandbox-download').maybeSingle();
if (item.error) throw item.error;
const itemId = item.data?.id || state?.itemId || randomUUID();
if (!item.data) {
  const inserted = await supabase.from('catalog_items').insert({
    id: itemId,
    item_category_id: category.data.id,
    slug: 'm12-stripe-sandbox-download',
    title: 'M12 Stripe Sandbox Download',
    creator: '44OS',
    item_type: 'Single',
    price_cents: 100,
    is_free: false,
    featured: false,
    tags: [],
    status: 'published',
    author_id: seller.id,
    experience_type: 'music',
    fulfillment_type: 'digital',
    download_purchase_enabled: true,
    short_description: 'Local-only Stripe acceptance Item.',
  }).select('id').single();
  if (inserted.error) throw inserted.error;
  item = inserted;
}

let offer = await supabase.from('catalog_offers').select('id').eq('item_id', itemId).eq('code', 'm12-stripe-sandbox-download').maybeSingle();
if (offer.error) throw offer.error;
if (!offer.data) {
  offer = await supabase.from('catalog_offers').insert({
    item_id: itemId,
    code: 'm12-stripe-sandbox-download',
    offer_type: 'digital_download',
    title: 'Sandbox Download',
    description: 'Local-only verified-payment acceptance offer.',
    price_cents: 100,
    currency: 'USD',
    status: 'active',
    fulfillment_type: 'entitlement',
  }).select('id').single();
  if (offer.error) throw offer.error;
}
const entitlement = await supabase.from('offer_entitlements').upsert({ offer_id: offer.data.id, entitlement_type: 'download' }, { onConflict: 'offer_id,entitlement_type' });
if (entitlement.error) throw entitlement.error;

const termsBody = 'Local-only M12 Stripe acceptance terms. No production sale, fulfillment promise, refund policy, or public legal approval is represented by this fixture.';
const termsSha256 = createHash('sha256').update(termsBody).digest('hex');
let terms = await supabase.from('commerce_terms_versions').select('id').eq('code', 'm12-stripe-sandbox').eq('version', 'local-1').maybeSingle();
if (terms.error) throw terms.error;
if (!terms.data) {
  terms = await supabase.from('commerce_terms_versions').insert({
    code: 'm12-stripe-sandbox',
    version: 'local-1',
    title: 'M12 local Stripe acceptance terms',
    body: termsBody,
    body_sha256: termsSha256,
    status: 'active',
    effective_at: new Date().toISOString(),
    approved_by: seller.id,
  }).select('id').single();
  if (terms.error) throw terms.error;
}
const controls = await supabase.from('commerce_runtime_controls').update({
  launch_scope: 'marketplace',
  platform_seller_id: seller.id,
  platform_fee_bps: 0,
  terms_version_id: terms.data.id,
  shipping_countries: ['US'],
  operating_model_approved_at: new Date().toISOString(),
  approved_by: seller.id,
  stripe_payments_enabled: true,
  checkout_enabled: true,
}).eq('singleton', true);
if (controls.error) throw controls.error;

writeFileSync(STRIPE_SANDBOX_STATE_PATH, `${JSON.stringify({
  buyerId: buyer.id,
  buyerEmail,
  sellerId: seller.id,
  itemId,
  offerId: offer.data.id,
  termsVersionId: terms.data.id,
  createdAt: new Date().toISOString(),
}, null, 2)}\n`, { mode: 0o600 });
console.log('Local-only M12 Stripe fixture is ready. Buyer email and IDs were written to the ignored sandbox state file; no password or provider secret was recorded.');
