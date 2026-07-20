import { persistSanitizedErrorEvent } from '@/lib/server/opsErrorSink';
import type Stripe from 'stripe';
import {
  authenticateCommerceRequest,
  automaticTaxEnabled,
  applicationOrigin,
  commerceAdminClient,
  CommerceConfigurationError,
  commerceErrorResponse,
  digitalTaxCode,
  merchTaxCode,
  type PendingStripeOrder,
  shippingRateIds,
  stripeClient,
} from '@/lib/server/commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CheckoutRequestBody = {
  lines?: Array<{ itemId?: string; offerId?: string | null; merchVariantId?: string | null }>;
  idempotencyKey?: string;
  termsAccepted?: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let orderId: string | null = null;
  try {
    const user = await authenticateCommerceRequest(request);
    let body: CheckoutRequestBody;
    try { body = await request.json() as CheckoutRequestBody; }
    catch { return Response.json({ error: 'Invalid checkout request.', code: 'invalid_request' }, { status: 400 }); }
    const lines = body.lines ?? [];
    if (!body.termsAccepted || !body.idempotencyKey || !/^[A-Za-z0-9_-]{16,200}$/.test(body.idempotencyKey)
      || lines.length < 1 || lines.length > 20
      || lines.some(line => !line.itemId || !UUID.test(line.itemId)
        || (line.offerId && !UUID.test(line.offerId))
        || (line.merchVariantId != null && !UUID.test(line.merchVariantId)))) {
      return Response.json({ error: 'Checkout details are incomplete.', code: 'invalid_request' }, { status: 400 });
    }
    const itemIds = [...new Set(lines.map(line => line.itemId!))];
    if (itemIds.length !== lines.length) {
      return Response.json({ error: 'Each Item can appear only once in checkout.', code: 'duplicate_item' }, { status: 400 });
    }

    const admin = commerceAdminClient();
    const missingOfferItemIds = lines.flatMap(line => line.offerId ? [] : [line.itemId!]);
    const inferredOfferByItem = new Map<string, string>();
    if (missingOfferItemIds.length) {
      const result = await admin.from('catalog_offers')
        .select('id,item_id')
        .in('item_id', missingOfferItemIds)
        .in('offer_type', ['physical_purchase', 'digital_download'])
        .eq('status', 'active');
      if (result.error) throw result.error;
      const byItem = new Map<string, string[]>();
      for (const offer of result.data ?? []) {
        byItem.set(offer.item_id, [...(byItem.get(offer.item_id) ?? []), offer.id]);
      }
      for (const itemId of missingOfferItemIds) {
        const offers = byItem.get(itemId) ?? [];
        if (offers.length !== 1) {
          return Response.json({
            error: offers.length ? 'Choose an exact offer before checking out.' : 'One or more Items are not available for paid checkout.',
            code: offers.length ? 'offer_selection_required' : 'offer_unavailable',
          }, { status: 409 });
        }
        inferredOfferByItem.set(itemId, offers[0]);
      }
    }
    const resolvedOfferIds = lines.map(line => line.offerId || inferredOfferByItem.get(line.itemId!) || '');
    if (new Set(resolvedOfferIds).size !== lines.length) {
      return Response.json({ error: 'Checkout offers are invalid.', code: 'invalid_offer' }, { status: 400 });
    }
    const offerResult = await admin.from('catalog_offers')
      .select('id,item_id,offer_type,fulfillment_type,status')
      .in('id', resolvedOfferIds)
      .eq('status', 'active');
    if (offerResult.error) throw offerResult.error;
    const offerById = new Map((offerResult.data ?? []).map(offer => [offer.id, offer]));
    if (offerById.size !== resolvedOfferIds.length || lines.some((line, index) => offerById.get(resolvedOfferIds[index])?.item_id !== line.itemId)) {
      return Response.json({ error: 'One or more offers are not available for this Item.', code: 'offer_unavailable' }, { status: 409 });
    }
    const itemTypeResult = await admin.from('catalog_items').select('id,experience_type').in('id', itemIds);
    if (itemTypeResult.error) throw itemTypeResult.error;
    const experienceTypeByItem = new Map((itemTypeResult.data ?? []).map(item => [item.id, item.experience_type]));
    if (experienceTypeByItem.size !== itemIds.length) {
      return Response.json({ error: 'One or more Items are unavailable.', code: 'offer_unavailable' }, { status: 409 });
    }

    const createResult = await admin.rpc('create_stripe_pending_order_with_variants' as never, {
      target_buyer_id: user.id,
      target_offer_ids: resolvedOfferIds,
      target_merch_variant_ids: lines.map(line => line.merchVariantId ?? null),
      target_idempotency_key: body.idempotencyKey,
      target_customer_email: user.email ?? null,
    } as never);
    if (createResult.error) throw createResult.error;
    const order = createResult.data as unknown as PendingStripeOrder;
    orderId = order.order_id;
    const siteUrl = applicationOrigin();
    const stripe = stripeClient();
    // Stripe measures the 30-minute minimum from provider-side Session creation,
    // so keep a buffer for request transit instead of submitting the exact edge.
    const expiresAt = Math.floor(Date.now() / 1000) + 35 * 60;
    const hasPhysical = order.lines.some(line => offerById.get(line.offer_id)?.offer_type === 'physical_purchase');
    if (hasPhysical && (order.shipping_countries.length !== 1 || order.shipping_countries[0] !== 'US')) {
      throw new CommerceConfigurationError('Initial physical checkout must be restricted to United States delivery.');
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: order.order_id,
      customer_email: user.email ?? undefined,
      success_url: `${siteUrl}/checkout?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout?checkout=canceled`,
      expires_at: expiresAt,
      automatic_tax: { enabled: automaticTaxEnabled() },
      ...(hasPhysical ? { shipping_address_collection: {
        allowed_countries: order.shipping_countries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      shipping_options: shippingRateIds().map(shippingRate => ({ shipping_rate: shippingRate })) } : {}),
      line_items: order.lines.map(line => ({
        quantity: 1,
        price_data: {
          currency: line.currency.toLowerCase(),
          unit_amount: line.unit_price_cents,
          tax_behavior: 'exclusive',
          product_data: {
            name: line.title,
            description: line.merch_variant?.display_name
              ? `${line.offer_title} · ${line.merch_variant.display_name}`
              : line.offer_title,
            tax_code: offerById.get(line.offer_id)?.offer_type === 'physical_purchase'
              ? merchTaxCode(line.title)
              : digitalTaxCode(experienceTypeByItem.get(line.item_id) ?? ''),
            metadata: {
              item_id: line.item_id,
              offer_id: line.offer_id,
              order_item_id: line.order_item_id,
              ...(line.merch_variant_id ? { merch_variant_id: line.merch_variant_id } : {}),
            },
          },
        },
      })),
      metadata: { order_id: order.order_id, terms_sha256: order.terms.sha256 },
      payment_intent_data: {
        receipt_email: user.email ?? undefined,
        metadata: { order_id: order.order_id, terms_sha256: order.terms.sha256 },
      },
    }, { idempotencyKey: `checkout:${order.idempotency_key}` });
    if (!session.url) throw new Error('Stripe did not return a hosted checkout URL.');
    const bindResult = await admin.rpc('bind_stripe_checkout_session' as never, {
      target_order_id: order.order_id,
      target_session_id: session.id,
      target_expires_at: new Date(expiresAt * 1000).toISOString(),
    } as never);
    if (bindResult.error) {
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
      throw bindResult.error;
    }
    return Response.json({ url: session.url, orderId: order.order_id }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const diagnostic = error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
          ? String(error.message)
          : 'Unknown checkout error';
      console.error(`[checkout] ${diagnostic
        .replace(/sk_(?:test|live)_[A-Za-z0-9]+/g, '[Stripe key]')
        .replace(/whsec_[A-Za-z0-9]+/g, '[webhook secret]')
        .replace(/https?:\/\/\S+/g, '[url]')
        .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
        .slice(0, 500)}`);
    }
    if (orderId) {
      try {
        await commerceAdminClient().from('commerce_orders').update({
          status: 'failed', failure_code: 'checkout_session_creation_failed',
          failure_message: 'Stripe Checkout Session creation did not complete.',
        } as never).eq('id', orderId).eq('status', 'pending_payment');
      } catch { /* The sanitized operations sink remains the fallback evidence. */ }
    }
    await persistSanitizedErrorEvent({
      occurredAt: new Date().toISOString(), release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
      runtime: 'nodejs', method: 'POST', path: '/api/checkout/session',
      errorName: error instanceof Error ? error.name : 'CheckoutError', safeMessage: 'Stripe Checkout Session creation failed.',
      frameworkContext: { route: 'checkout_session', configured: Boolean(process.env.STRIPE_SECRET_KEY) },
    }).catch(() => undefined);
    return commerceErrorResponse(error);
  }
}
