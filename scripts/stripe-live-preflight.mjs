import Stripe from 'stripe';

if (!process.argv.includes('--confirm-read-only-live')) {
  throw new Error('Refusing live Stripe inspection without --confirm-read-only-live.');
}

const required = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_SHIPPING_RATE_IDS',
  'STRIPE_MERCH_TAX_CODE',
  'STRIPE_MERCH_HAT_TAX_CODE',
  'STRIPE_MERCH_BAG_TAX_CODE',
  'STRIPE_BOOK_TAX_CODE',
  'STRIPE_MUSIC_TAX_CODE',
  'STRIPE_SAMPLE_PACK_TAX_CODE',
  'NEXT_PUBLIC_SITE_URL',
];
const failures = [];
const pass = message => console.log(`PASS: ${message}`);
const fail = message => failures.push(message);

for (const name of required) {
  if (!process.env[name]?.trim()) fail(`${name} is absent`);
}
if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) fail('Stripe secret is not live-mode scoped');
if (!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) fail('Stripe webhook secret shape is invalid');
if (process.env.STRIPE_AUTOMATIC_TAX_ENABLED !== 'true') fail('Stripe automatic tax is not approved');
if (process.env.NEXT_PUBLIC_SITE_URL !== 'https://44os.com') fail('production site URL must be https://44os.com');
if (process.env.NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE === 'true') fail('public purchases must remain off during preflight');

const shippingRates = (process.env.STRIPE_SHIPPING_RATE_IDS ?? '').split(',').map(value => value.trim()).filter(Boolean);
if (shippingRates.length !== 1 || !/^shr_[A-Za-z0-9]+$/.test(shippingRates[0] ?? '')) {
  fail('exactly one approved Stripe shipping rate is required');
}
for (const name of ['STRIPE_MERCH_TAX_CODE', 'STRIPE_MERCH_HAT_TAX_CODE', 'STRIPE_MERCH_BAG_TAX_CODE', 'STRIPE_BOOK_TAX_CODE', 'STRIPE_MUSIC_TAX_CODE', 'STRIPE_SAMPLE_PACK_TAX_CODE']) {
  if (!/^txcd_\d+$/.test(process.env[name] ?? '')) fail(`${name} is invalid`);
}

if (!failures.length) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 1 });
  try {
    const [account, taxSettings, registrations, shippingRate, webhookEndpoints] = await Promise.all([
      stripe.accounts.retrieve(),
      stripe.tax.settings.retrieve(),
      stripe.tax.registrations.list({ status: 'active', limit: 100 }),
      stripe.shippingRates.retrieve(shippingRates[0]),
      stripe.webhookEndpoints.list({ limit: 100 }),
    ]);
    if (!account.charges_enabled) fail('Stripe account charges are not enabled');
    else pass('Stripe account charges are enabled');
    if (!account.payouts_enabled) fail('Stripe business settlement payouts are not enabled');
    else pass('Stripe business settlement payouts are enabled');
    if (taxSettings.status !== 'active' || !taxSettings.head_office) fail('Stripe Tax head office is incomplete');
    else pass('Stripe Tax is active with a head office');
    if (!registrations.data.length) fail('no active Stripe Tax registration exists');
    else pass('at least one active Stripe Tax registration exists');
    if (!shippingRate.active || shippingRate.fixed_amount?.currency !== 'usd') fail('approved shipping rate is not active USD');
    else pass('one active USD shipping rate is configured');
    const requiredEvents = new Set([
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded',
      'checkout.session.async_payment_failed',
      'checkout.session.expired',
      'payment_intent.payment_failed',
      'charge.refunded',
      'refund.created',
      'charge.dispute.created',
      'charge.dispute.closed',
      'charge.dispute.funds_reinstated',
    ]);
    const endpoint = webhookEndpoints.data.find(candidate => candidate.url === 'https://44os.com/api/stripe/webhook' && candidate.status === 'enabled');
    const enabled = new Set(endpoint?.enabled_events ?? []);
    if (!endpoint || ![...requiredEvents].every(event => enabled.has(event) || enabled.has('*'))) {
      fail('production Stripe webhook is absent or missing required events');
    } else {
      pass('production Stripe webhook covers the required event set');
    }
  } catch {
    fail('live Stripe read-only inspection could not complete');
  }
}

if (failures.length) {
  console.error(`Stripe live preflight blocked (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Stripe live preflight passed without printing provider identifiers or secrets. Public purchases remain disabled.');
