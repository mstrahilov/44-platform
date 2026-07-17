import { createClient, type User } from '@supabase/supabase-js';
import Stripe from 'stripe';
import type { Database } from '@/lib/database.types';

export type PendingStripeOrder = {
  order_id: string;
  currency: string;
  subtotal_cents: number;
  total_cents: number;
  idempotency_key: string;
  shipping_countries: string[];
  terms: { id: string; title: string; version: string; sha256: string };
  lines: Array<{
    order_item_id: string;
    offer_id: string;
    item_id: string;
    merch_variant_id: string | null;
    merch_variant: { display_name?: string; option_values?: Record<string, string> } | null;
    title: string;
    offer_title: string;
    unit_price_cents: number;
    currency: string;
  }>;
};

export function commerceAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new CommerceConfigurationError('Commerce database access is not configured.');
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function stripeClient() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new CommerceConfigurationError('Stripe payments are not configured.');
  return new Stripe(secret, { maxNetworkRetries: 2 });
}

export async function authenticateCommerceRequest(request: Request): Promise<User> {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new CommerceAuthenticationError();
  const { data, error } = await commerceAdminClient().auth.getUser(token);
  if (error || !data.user) throw new CommerceAuthenticationError();
  return data.user;
}

export function checkoutSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel = process.env.VERCEL_URL?.trim();
  const value = configured || (vercel ? `https://${vercel}` : 'http://localhost:3000');
  let url: URL;
  try { url = new URL(value); }
  catch { throw new CommerceConfigurationError('The checkout return URL is not configured.'); }
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new CommerceConfigurationError('The checkout return URL must use HTTPS.');
  }
  return url.origin;
}

export function shippingRateIds() {
  const values = (process.env.STRIPE_SHIPPING_RATE_IDS ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  if (values.length !== 1 || values.some(value => !/^shr_[A-Za-z0-9]+$/.test(value))) {
    throw new CommerceConfigurationError('Exactly one approved United States Stripe shipping rate is required.');
  }
  return values;
}

export function automaticTaxEnabled() {
  if (process.env.STRIPE_AUTOMATIC_TAX_ENABLED !== 'true') {
    throw new CommerceConfigurationError('The approved Stripe Tax decision is not configured.');
  }
  return true;
}

export function merchTaxCode(itemTitle: string) {
  const normalizedTitle = itemTitle.trim().toLowerCase();
  const environmentName = /\b(beanie|hat|cap)\b/.test(normalizedTitle)
    ? 'STRIPE_MERCH_HAT_TAX_CODE'
    : /\b(bag|tote|satchel|purse)\b/.test(normalizedTitle)
      ? 'STRIPE_MERCH_BAG_TAX_CODE'
      : /\b(t-?shirt|sweatshirt|hoodie|windbreaker|jacket)\b/.test(normalizedTitle)
        ? 'STRIPE_MERCH_TAX_CODE'
        : null;
  if (!environmentName) {
    throw new CommerceConfigurationError('This merchandise type does not have an approved Stripe Tax code.');
  }
  const value = process.env[environmentName]?.trim();
  if (!value || !/^txcd_\d+$/.test(value)) {
    throw new CommerceConfigurationError('The approved Stripe Tax product code is not configured.');
  }
  return value;
}

export function digitalTaxCode(experienceType: string) {
  const environmentName = experienceType === 'book'
    ? 'STRIPE_BOOK_TAX_CODE'
    : experienceType === 'music'
      ? 'STRIPE_MUSIC_TAX_CODE'
      : experienceType === 'asset'
        ? 'STRIPE_SAMPLE_PACK_TAX_CODE'
        : null;
  if (!environmentName) {
    throw new CommerceConfigurationError('This digital Item category is not approved for paid launch.');
  }
  const value = process.env[environmentName]?.trim();
  if (!value || !/^txcd_\d+$/.test(value)) {
    throw new CommerceConfigurationError(`The approved Stripe Tax code for ${experienceType} is not configured.`);
  }
  return value;
}

export function checkoutConfigurationPresence({ includePhysical = true }: { includePhysical?: boolean } = {}) {
  return {
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    stripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL),
    automaticTax: process.env.STRIPE_AUTOMATIC_TAX_ENABLED === 'true',
    bookTaxCode: Boolean((process.env.STRIPE_BOOK_TAX_CODE ?? '').trim()),
    musicTaxCode: Boolean((process.env.STRIPE_MUSIC_TAX_CODE ?? '').trim()),
    samplePackTaxCode: Boolean((process.env.STRIPE_SAMPLE_PACK_TAX_CODE ?? '').trim()),
    publicPurchases: process.env.NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE === 'true',
    ...(includePhysical ? {
      shippingRates: Boolean((process.env.STRIPE_SHIPPING_RATE_IDS ?? '').trim()),
      merchTaxCode: Boolean((process.env.STRIPE_MERCH_TAX_CODE ?? '').trim()),
      merchHatTaxCode: Boolean((process.env.STRIPE_MERCH_HAT_TAX_CODE ?? '').trim()),
      merchBagTaxCode: Boolean((process.env.STRIPE_MERCH_BAG_TAX_CODE ?? '').trim()),
    } : {}),
  };
}

export class CommerceConfigurationError extends Error {
  status = 503;
  code = 'commerce_not_configured';
}

export class CommerceAuthenticationError extends Error {
  status = 401;
  code = 'authentication_required';
  constructor() { super('Sign in again before checking out.'); }
}

export function commerceErrorResponse(error: unknown) {
  const known = error instanceof CommerceConfigurationError || error instanceof CommerceAuthenticationError;
  return Response.json({
    error: known ? error.message : 'Checkout could not be started.',
    code: known ? error.code : 'checkout_failed',
  }, {
    status: known ? error.status : 400,
    headers: { 'Cache-Control': 'no-store' },
  });
}
