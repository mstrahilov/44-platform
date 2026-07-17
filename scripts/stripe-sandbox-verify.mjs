import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { loadStripeSandboxEnvironment } from './stripe-sandbox-environment.mjs';

loadStripeSandboxEnvironment();

const required = [
  'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY',
  'STRIPE_ACCEPTANCE_BUYER_ID', 'STRIPE_ACCEPTANCE_ITEM_ID', 'STRIPE_ACCEPTANCE_SESSION_ID',
];
const failures = [];
const passes = [];
const fail = message => failures.push(message);
const pass = message => passes.push(message);
for (const name of required) if (!process.env[name]?.trim()) fail(`${name} is absent`);

if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) fail('Stripe verification requires a test-mode secret');
if (process.env.STRIPE_ACCEPTANCE_SESSION_ID && !/^cs_test_[A-Za-z0-9_]+$/.test(process.env.STRIPE_ACCEPTANCE_SESSION_ID)) fail('acceptance Session must be a test-mode Checkout Session');
const expectedStatus = process.env.STRIPE_ACCEPTANCE_EXPECTED_STATUS || 'paid';
if (!['paid', 'partially_refunded', 'refunded', 'disputed', 'dispute_lost'].includes(expectedStatus)) fail('STRIPE_ACCEPTANCE_EXPECTED_STATUS is invalid');

if (!failures.length) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 1 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(process.env.STRIPE_ACCEPTANCE_SESSION_ID, {
      expand: ['payment_intent.latest_charge.balance_transaction'],
    });
  } catch {
    fail('Stripe Checkout Session could not be retrieved');
  }
  if (session) {
    if (session.livemode) fail('acceptance Session is live-mode');
    else pass('Checkout Session is test-mode');
    if (session.payment_status !== 'paid') fail('Stripe has not marked the Session paid');
    else pass('Stripe marks the Session paid');
    const orderId = session.metadata?.order_id || session.client_reference_id;
    if (!orderId) {
      fail('Stripe Session has no durable 44OS order reference');
    } else {
      const orders = await supabase.from('commerce_orders').select('*').eq('provider', 'stripe').eq('provider_order_id', session.id);
      if (orders.error || orders.data?.length !== 1 || orders.data[0].id !== orderId) {
        fail('Stripe Session does not resolve to exactly one durable order');
      } else {
        const order = orders.data[0];
        if (order.buyer_id !== process.env.STRIPE_ACCEPTANCE_BUYER_ID) fail('durable order buyer does not match the named acceptance buyer');
        else pass('durable order belongs to the named acceptance buyer');
        if (order.status !== expectedStatus) fail(`durable order status is not ${expectedStatus}`);
        else pass(`durable order status is ${expectedStatus}`);
        if (order.subtotal_cents !== (session.amount_subtotal ?? 0)
          || order.total_cents !== (session.amount_total ?? 0)
          || order.tax_cents !== (session.total_details?.amount_tax ?? 0)
          || order.shipping_cents !== (session.total_details?.amount_shipping ?? 0)
          || order.currency.toLowerCase() !== session.currency) {
          fail('Stripe and durable order totals do not reconcile');
        } else {
          pass('Stripe and durable order totals reconcile');
        }

        const [lines, attempts, paymentEvents] = await Promise.all([
          supabase.from('commerce_order_items').select('*').eq('order_id', order.id),
          supabase.from('payment_attempts').select('*').eq('provider', 'stripe').eq('order_id', order.id),
          supabase.from('payment_events').select('provider_event_id,event_type,processing_status').eq('provider', 'stripe').eq('order_id', order.id),
        ]);
        if (lines.error || lines.data?.length !== 1 || lines.data[0].item_id !== process.env.STRIPE_ACCEPTANCE_ITEM_ID) {
          fail('order does not contain exactly the named acceptance Item');
        } else {
          const line = lines.data[0];
          pass('order contains exactly the named acceptance Item');
          if (!Array.isArray(line.entitlement_snapshot) || !line.entitlement_snapshot.length) fail('order line has no snapshotted entitlement contract');
          else pass('order line snapshots its entitlement contract');
          if (!line.terms_snapshot || typeof line.terms_snapshot !== 'object' || !('sha256' in line.terms_snapshot)) fail('order line has no immutable accepted-terms snapshot');
          else pass('order line snapshots immutable accepted terms');

          const [grants, libraryEntries, earnings] = await Promise.all([
            supabase.from('commerce_entitlement_grants').select('status,entitlement_type').eq('order_item_id', line.id),
            supabase.from('library_entries').select('acquisition_type').eq('user_id', order.buyer_id).eq('item_id', line.item_id),
            supabase.from('creator_earnings_entries').select('entry_type,amount_cents').eq('order_item_id', line.id),
          ]);
          const expectedGrantCount = Array.isArray(line.entitlement_snapshot) ? line.entitlement_snapshot.length : 0;
          if (grants.error || grants.data?.length !== expectedGrantCount) fail('order does not have exactly one durable grant per entitlement');
          else pass('order has exactly one durable grant per entitlement');
          const shouldBeActive = ['paid', 'partially_refunded'].includes(expectedStatus);
          if (!grants.error && grants.data?.some(grant => (grant.status === 'active') !== shouldBeActive)) fail('entitlement grant state does not match the financial state');
          else if (!grants.error) pass('entitlement grant state matches the financial state');
          if (libraryEntries.error || libraryEntries.data?.length !== 1 || libraryEntries.data[0].acquisition_type !== 'purchase') fail('buyer does not have exactly one purchase Library entry');
          else pass('buyer has exactly one purchase Library entry');

          const paymentIntent = typeof session.payment_intent === 'object' ? session.payment_intent : null;
          const charge = paymentIntent && typeof paymentIntent.latest_charge === 'object' ? paymentIntent.latest_charge : null;
          const balanceTransaction = charge && typeof charge.balance_transaction === 'object' ? charge.balance_transaction : null;
          if (attempts.error || attempts.data?.length !== 1 || attempts.data[0].provider_charge_id !== charge?.id) fail('order does not have exactly one matching Stripe payment attempt');
          else pass('order has exactly one matching Stripe payment attempt');
          if (paymentEvents.error || !paymentEvents.data?.some(event => event.processing_status === 'processed'
            && ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.event_type))) fail('order has no processed successful-payment receipt event');
          else pass('order has processed successful-payment receipt evidence');
          const saleTotal = (earnings.data ?? []).filter(entry => entry.entry_type === 'sale').reduce((sum, entry) => sum + Number(entry.amount_cents), 0);
          const processorFeeTotal = -(earnings.data ?? []).filter(entry => entry.entry_type === 'processor_fee').reduce((sum, entry) => sum + Number(entry.amount_cents), 0);
          const refundTotal = -(earnings.data ?? []).filter(entry => entry.entry_type === 'refund').reduce((sum, entry) => sum + Number(entry.amount_cents), 0);
          if (earnings.error || saleTotal !== order.subtotal_cents) fail('seller sale accounting does not equal the durable subtotal');
          else pass('seller sale accounting equals the durable subtotal');
          if (!balanceTransaction || processorFeeTotal !== balanceTransaction.fee) fail('processor-fee accounting does not equal Stripe balance evidence');
          else pass('processor-fee accounting equals Stripe balance evidence');
          if (refundTotal !== Math.min(order.refunded_cents, order.subtotal_cents)) fail('refund accounting does not equal the durable refunded subtotal');
          else pass('refund accounting equals the durable refunded subtotal');
        }
      }
    }
  }
}

for (const message of passes) console.log(`PASS: ${message}`);
if (failures.length) {
  console.error(`Stripe sandbox verification failed (${failures.length}):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log('Stripe sandbox purchase verification passed without exposing provider or customer values.');
}
