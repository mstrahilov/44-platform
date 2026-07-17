import type Stripe from 'stripe';
import { persistSanitizedErrorEvent } from '@/lib/server/opsErrorSink';
import { commerceAdminClient, stripeClient } from '@/lib/server/commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HANDLED_EVENTS = new Set([
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

function id(value: string | { id: string } | null | undefined) {
  return typeof value === 'string' ? value : value?.id ?? null;
}

function safeFailureMessage(message: string | null | undefined) {
  return message?.replace(/https?:\/\/\S+/g, '[url]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]').slice(0, 500) ?? null;
}

async function checkoutData(stripe: Stripe, sessionInput: Stripe.Checkout.Session) {
  const session = await stripe.checkout.sessions.retrieve(sessionInput.id, { expand: ['payment_intent.latest_charge.balance_transaction'] });
  const paymentIntent = typeof session.payment_intent === 'object' ? session.payment_intent : null;
  const charge = paymentIntent && typeof paymentIntent.latest_charge === 'object' ? paymentIntent.latest_charge : null;
  const balanceTransactionId = id(charge?.balance_transaction);
  const balanceTransaction = charge && typeof charge.balance_transaction === 'object'
    ? charge.balance_transaction
    : balanceTransactionId
      ? await stripe.balanceTransactions.retrieve(balanceTransactionId)
      : null;
  if (charge && !balanceTransaction) throw new Error('Stripe processing fee evidence is not available yet.');
  const shipping = session.collected_information?.shipping_details;
  return {
    order_id: session.metadata?.order_id || session.client_reference_id,
    checkout_session_id: session.id,
    payment_intent_id: id(session.payment_intent),
    charge_id: id(paymentIntent?.latest_charge),
    amount_subtotal: session.amount_subtotal ?? 0,
    amount_total: session.amount_total ?? 0,
    amount_tax: session.total_details?.amount_tax ?? 0,
    amount_shipping: session.total_details?.amount_shipping ?? 0,
    currency: session.currency,
    payment_status: session.payment_status,
    address: shipping ? {
      name: shipping.name,
      line1: shipping.address.line1,
      line2: shipping.address.line2,
      city: shipping.address.city,
      state: shipping.address.state,
      postal_code: shipping.address.postal_code,
      country: shipping.address.country,
    } : null,
    charge_amount_refunded: charge?.amount_refunded ?? 0,
    processor_fee: balanceTransaction?.fee ?? 0,
    processor_net: balanceTransaction?.net ?? null,
  };
}

async function eventData(stripe: Stripe, event: Stripe.Event): Promise<Record<string, unknown>> {
  if (event.type.startsWith('checkout.session.')) {
    return checkoutData(stripe, event.data.object as Stripe.Checkout.Session);
  }
  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    return {
      order_id: intent.metadata.order_id,
      payment_intent_id: intent.id,
      charge_id: id(intent.latest_charge),
      currency: intent.currency,
      failure_code: intent.last_payment_error?.code,
      failure_message: safeFailureMessage(intent.last_payment_error?.message),
    };
  }
  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    return {
      order_id: charge.metadata.order_id,
      payment_intent_id: id(charge.payment_intent),
      charge_id: charge.id,
      amount_refunded: charge.amount_refunded,
      currency: charge.currency,
      reason: 'Stripe charge refund',
    };
  }
  if (event.type === 'refund.created') {
    const refund = event.data.object as Stripe.Refund;
    const chargeId = id(refund.charge);
    const charge = chargeId ? await stripe.charges.retrieve(chargeId) : null;
    return {
      order_id: refund.metadata?.order_id || charge?.metadata.order_id,
      payment_intent_id: id(refund.payment_intent) || id(charge?.payment_intent),
      charge_id: chargeId,
      refund_id: refund.id,
      amount: refund.amount,
      amount_refunded: charge?.amount_refunded ?? refund.amount,
      currency: refund.currency,
      reason: refund.reason,
    };
  }
  const dispute = event.data.object as Stripe.Dispute;
  return {
    order_id: dispute.metadata.order_id,
    payment_intent_id: id(dispute.payment_intent),
    charge_id: id(dispute.charge),
    dispute_id: dispute.id,
    dispute_amount: dispute.amount,
    dispute_status: dispute.status,
    dispute_outcome: dispute.status,
    currency: dispute.currency,
    reason: dispute.reason,
  };
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return Response.json({ error: 'Stripe webhook is not configured.' }, { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return Response.json({ error: 'Stripe signature is required.' }, { status: 400 });
  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return Response.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }
  if (!HANDLED_EVENTS.has(event.type)) return Response.json({ received: true, ignored: true });
  try {
    const data = await eventData(stripeClient(), event);
    const result = await commerceAdminClient().rpc('process_stripe_webhook_event' as never, {
      target_event_id: event.id,
      target_event_type: event.type,
      target_data: data,
    } as never);
    if (result.error) throw result.error;
    const outcome = result.data as unknown as { processed?: boolean; duplicate?: boolean; retryable?: boolean; error?: string };
    if (outcome.retryable) return Response.json({ received: true, processed: false }, { status: 500 });
    return Response.json({ received: true, processed: Boolean(outcome.processed), duplicate: Boolean(outcome.duplicate) });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const diagnostic = error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
          ? String(error.message)
          : 'Unknown webhook error';
      console.error(`[stripe-webhook] ${diagnostic
        .replace(/sk_(?:test|live)_[A-Za-z0-9]+/g, '[Stripe key]')
        .replace(/whsec_[A-Za-z0-9]+/g, '[webhook secret]')
        .replace(/https?:\/\/\S+/g, '[url]')
        .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
        .slice(0, 500)}`);
    }
    await persistSanitizedErrorEvent({
      occurredAt: new Date().toISOString(), release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
      runtime: 'nodejs', method: 'POST', path: '/api/stripe/webhook',
      errorName: error instanceof Error ? error.name : 'StripeWebhookError', safeMessage: 'Verified Stripe webhook processing failed.',
      frameworkContext: { provider: 'stripe', eventType: event.type },
    }).catch(() => undefined);
    return Response.json({ received: true, processed: false }, { status: 500 });
  }
}
