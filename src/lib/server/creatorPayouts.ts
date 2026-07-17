import type Stripe from 'stripe';
import { checkoutSiteUrl, commerceAdminClient, stripeClient } from '@/lib/server/commerce';

export type SyncedConnectState = {
  can_sell_paid: boolean;
  state: string;
  admin_status: string;
  provider: string | null;
  provider_status: string | null;
  country_code: string | null;
  currency: string | null;
  requirements_due: string[];
};

export class CreatorPayoutError extends Error {
  constructor(public code: string, message: string, public status = 409) { super(message); }
}

export async function syncStripeConnectAccount(creatorId: string, account: Stripe.Account) {
  const requirements = account.requirements?.currently_due ?? [];
  const pastDue = account.requirements?.past_due ?? [];
  const disabledReason = account.requirements?.disabled_reason ?? null;
  const transferCapability = account.capabilities?.transfers ?? 'inactive';
  const status = disabledReason || pastDue.length
    ? 'restricted'
    : account.payouts_enabled && transferCapability === 'active' && requirements.length === 0
      ? 'verified'
      : 'pending';
  const country = (account.country || '').toUpperCase();
  const currency = (account.default_currency || 'usd').toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new CreatorPayoutError('country_required', 'Stripe did not return a valid payout country.');
  const result = await commerceAdminClient().rpc('sync_creator_payout_capability' as never, {
    target_creator_id: creatorId,
    target_provider: 'stripe_connect',
    target_provider_recipient_ref: account.id,
    target_country_code: country,
    target_currency: currency,
    target_status: status,
    target_reason_code: disabledReason,
    target_capabilities: { transfers: transferCapability, payouts_enabled: account.payouts_enabled },
    target_requirements_due: [...new Set([...requirements, ...pastDue])],
  } as never);
  if (result.error) throw result.error;
  return result.data as unknown as SyncedConnectState;
}

export async function getCreatorConnectContext(userId: string, email?: string | null) {
  const admin = commerceAdminClient();
  const [profileResult, stateResult, payoutResult] = await Promise.all([
    admin.from('profiles').select('id,role,country_code,home_country_code,display_currency,home_currency').eq('id', userId).maybeSingle(),
    admin.rpc('get_creator_paid_sales_state' as never, { target_creator_id: userId } as never),
    admin.from('creator_payout_accounts').select('provider_recipient_ref').eq('creator_id', userId).eq('provider', 'stripe_connect').maybeSingle(),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (stateResult.error) throw stateResult.error;
  if (payoutResult.error) throw payoutResult.error;
  const profile = profileResult.data;
  const state = stateResult.data as unknown as SyncedConnectState & { is_platform_seller?: boolean };
  if (!profile || !['creator', 'admin'].includes(profile.role)) throw new CreatorPayoutError('creator_required', 'Creator access is required.', 403);
  if (state.is_platform_seller) throw new CreatorPayoutError('platform_seller', 'The 44 platform seller does not use creator payout onboarding.');
  if (state.admin_status !== 'approved') throw new CreatorPayoutError('admin_approval_required', '44 approval is required before payout setup.');
  const country = (profile.country_code || profile.home_country_code || '').toUpperCase();
  const currency = (profile.display_currency || profile.home_currency || 'USD').toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new CreatorPayoutError('country_required', 'Choose your country in Settings before starting payout setup.');
  return { admin, profile, state, country, currency, email: email || undefined, accountId: payoutResult.data?.provider_recipient_ref ?? null };
}

export async function createCreatorConnectOnboarding(userId: string, email?: string | null) {
  const context = await getCreatorConnectContext(userId, email);
  const stripe = stripeClient();
  let account: Stripe.Account;
  if (context.accountId) {
    account = await stripe.accounts.retrieve(context.accountId);
  } else {
    account = await stripe.accounts.create({
      type: 'express',
      country: context.country,
      email: context.email,
      capabilities: { transfers: { requested: true } },
      business_profile: { product_description: 'Digital creator selling licensed content through 44OS.' },
      metadata: { creator_id: userId, platform: '44OS' },
    }, { idempotencyKey: `connect-account:${userId}` });
  }
  await syncStripeConnectAccount(userId, account);
  const siteUrl = checkoutSiteUrl();
  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${siteUrl}/studio/payouts?connect=refresh`,
    return_url: `${siteUrl}/studio/payouts?connect=returned`,
    type: 'account_onboarding',
    collection_options: { fields: 'eventually_due' },
  });
  return { url: link.url };
}

export async function refreshCreatorConnectState(userId: string, email?: string | null) {
  const context = await getCreatorConnectContext(userId, email);
  if (!context.accountId) return context.state;
  const account = await stripeClient().accounts.retrieve(context.accountId);
  return syncStripeConnectAccount(userId, account);
}

export async function syncStripeConnectWebhookAccount(account: Stripe.Account) {
  const result = await commerceAdminClient().from('creator_payout_accounts')
    .select('creator_id')
    .eq('provider', 'stripe_connect')
    .eq('provider_recipient_ref', account.id)
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data?.creator_id) return null;
  return syncStripeConnectAccount(result.data.creator_id, account);
}
