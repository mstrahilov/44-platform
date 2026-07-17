import type Stripe from 'stripe';
import { authenticateCommerceRequest, checkoutConfigurationPresence, commerceAdminClient, commerceErrorResponse, stripeClient } from '@/lib/server/commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin(request: Request) {
  const user = await authenticateCommerceRequest(request);
  const admin = commerceAdminClient();
  const profile = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile.error) throw profile.error;
  if (profile.data?.role !== 'admin') return null;
  return admin;
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    const result = await admin.rpc('get_admin_commerce_diagnostics' as never);
    if (result.error) throw result.error;
    const [orders, webhooks, reconciliation] = await Promise.all([
      admin.from('commerce_orders')
        .select('id,status,total_cents,currency,failure_code,failure_message,created_at,updated_at')
        .in('status', ['pending_payment', 'failed', 'disputed', 'dispute_lost'])
        .order('updated_at', { ascending: false }).limit(20),
      admin.from('provider_webhook_events')
        .select('provider_event_id,event_type,processing_status,error_message,received_at,processed_at')
        .eq('provider', 'stripe').in('processing_status', ['received', 'failed'])
        .order('received_at', { ascending: false }).limit(20),
      admin.from('commerce_reconciliation_runs')
        .select('id,scope,status,checked_count,mismatch_count,started_at,completed_at,summary')
        .eq('provider', 'stripe').order('started_at', { ascending: false }).limit(20),
    ]);
    if (orders.error) throw orders.error;
    if (webhooks.error) throw webhooks.error;
    if (reconciliation.error) throw reconciliation.error;
    const environment = checkoutConfigurationPresence();
    return Response.json({
      database: result.data,
      environment,
      ready: Object.values(environment).every(Boolean)
        && Boolean((result.data as { checkout_enabled?: boolean } | null)?.checkout_enabled),
      orders: orders.data ?? [],
      webhooks: webhooks.data ?? [],
      reconciliation: reconciliation.data ?? [],
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return commerceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return Response.json({ error: 'Administrator access required.' }, { status: 403 });
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);
  let runId: string | null = null;
  try {
    const run = await admin.from('commerce_reconciliation_runs').insert({
      provider: 'stripe', scope: 'payments', window_start: windowStart.toISOString(), window_end: windowEnd.toISOString(), status: 'running',
    }).select('id').single();
    if (run.error) throw run.error;
    runId = run.data.id;
    const ordersResult = await admin.from('commerce_orders')
      .select('id,buyer_id,status,currency,subtotal_cents,tax_cents,shipping_cents,total_cents,refunded_cents,disputed_cents,provider_order_id', { count: 'exact' })
      .eq('provider', 'stripe').gte('created_at', windowStart.toISOString()).lte('created_at', windowEnd.toISOString())
      .order('created_at', { ascending: true }).limit(500);
    if (ordersResult.error) throw ordersResult.error;
    const orders = ordersResult.data ?? [];
    if ((ordersResult.count ?? orders.length) !== orders.length) {
      throw new Error('The reconciliation window exceeds the exact-check limit.');
    }
    const orderIds = orders.map(order => order.id);
    const [linesResult, attemptsResult, paymentEventsResult] = await Promise.all([
      orderIds.length ? admin.from('commerce_order_items').select('id,order_id,item_id,line_total_cents,entitlement_snapshot', { count: 'exact' }).in('order_id', orderIds) : Promise.resolve({ data: [], error: null, count: 0 }),
      orderIds.length ? admin.from('payment_attempts').select('order_id,provider_charge_id', { count: 'exact' }).eq('provider', 'stripe').in('order_id', orderIds) : Promise.resolve({ data: [], error: null, count: 0 }),
      orderIds.length ? admin.from('payment_events').select('order_id,event_type,processing_status', { count: 'exact' }).eq('provider', 'stripe').in('order_id', orderIds) : Promise.resolve({ data: [], error: null, count: 0 }),
    ]);
    if (linesResult.error) throw linesResult.error;
    if (attemptsResult.error) throw attemptsResult.error;
    if (paymentEventsResult.error) throw paymentEventsResult.error;
    if ((linesResult.count ?? linesResult.data?.length ?? 0) !== (linesResult.data?.length ?? 0)
      || (attemptsResult.count ?? attemptsResult.data?.length ?? 0) !== (attemptsResult.data?.length ?? 0)
      || (paymentEventsResult.count ?? paymentEventsResult.data?.length ?? 0) !== (paymentEventsResult.data?.length ?? 0)) {
      throw new Error('The reconciliation evidence set is incomplete.');
    }
    const lineIds = (linesResult.data ?? []).map(line => line.id);
    const buyerIds = [...new Set(orders.map(order => order.buyer_id))];
    const itemIds = [...new Set((linesResult.data ?? []).map(line => line.item_id))];
    const [earningsResult, grantsResult, libraryResult] = await Promise.all([
      lineIds.length ? admin.from('creator_earnings_entries').select('order_item_id,entry_type,amount_cents', { count: 'exact' }).in('order_item_id', lineIds) : Promise.resolve({ data: [], error: null, count: 0 }),
      lineIds.length ? admin.from('commerce_entitlement_grants').select('order_item_id,status', { count: 'exact' }).in('order_item_id', lineIds) : Promise.resolve({ data: [], error: null, count: 0 }),
      buyerIds.length && itemIds.length ? admin.from('library_entries').select('user_id,item_id,acquisition_type', { count: 'exact' }).in('user_id', buyerIds).in('item_id', itemIds) : Promise.resolve({ data: [], error: null, count: 0 }),
    ]);
    if (earningsResult.error) throw earningsResult.error;
    if (grantsResult.error) throw grantsResult.error;
    if (libraryResult.error) throw libraryResult.error;
    if ((earningsResult.count ?? earningsResult.data?.length ?? 0) !== (earningsResult.data?.length ?? 0)
      || (grantsResult.count ?? grantsResult.data?.length ?? 0) !== (grantsResult.data?.length ?? 0)
      || (libraryResult.count ?? libraryResult.data?.length ?? 0) !== (libraryResult.data?.length ?? 0)) {
      throw new Error('The reconciliation ledger set is incomplete.');
    }
    const stripe = stripeClient();
    const financiallyConfirmedStatuses = ['paid', 'fulfilled', 'partially_refunded', 'refunded', 'disputed', 'dispute_lost'];
    const successfulPaymentEvents = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
    const mismatches: Array<{ orderId: string; codes: string[] }> = [];
    for (const order of orders) {
      const codes: string[] = [];
      let providerProcessorFee: number | null = null;
      if (!order.provider_order_id) {
        if (!['failed', 'canceled'].includes(order.status)) codes.push('missing_checkout_session');
      } else {
        const session = await stripe.checkout.sessions.retrieve(order.provider_order_id, { expand: ['payment_intent.latest_charge.balance_transaction'] });
        const paymentIntent = typeof session.payment_intent === 'object' ? session.payment_intent : null;
        const charge = paymentIntent && typeof paymentIntent.latest_charge === 'object' ? paymentIntent.latest_charge as Stripe.Charge : null;
        const balanceTransaction = charge && typeof charge.balance_transaction === 'object' ? charge.balance_transaction : null;
        providerProcessorFee = balanceTransaction?.fee ?? null;
        if ((session.amount_subtotal ?? 0) !== order.subtotal_cents) codes.push('subtotal');
        if ((session.amount_total ?? 0) !== order.total_cents) codes.push('total');
        if ((session.total_details?.amount_tax ?? 0) !== order.tax_cents) codes.push('tax');
        if ((session.total_details?.amount_shipping ?? 0) !== order.shipping_cents) codes.push('shipping');
        if ((charge?.amount_refunded ?? 0) !== order.refunded_cents) codes.push('refund');
        if (financiallyConfirmedStatuses.includes(order.status) && session.payment_status !== 'paid') codes.push('payment_status');
      }
      const orderLines = (linesResult.data ?? []).filter(line => line.order_id === order.id);
      const orderLineIds = new Set(orderLines.map(line => line.id));
      const lineTotal = orderLines.reduce((sum, line) => sum + Number(line.line_total_cents), 0);
      if (lineTotal !== order.subtotal_cents) codes.push('order_lines');
      const paymentAttempt = (attemptsResult.data ?? []).find(attempt => attempt.order_id === order.id);
      if (financiallyConfirmedStatuses.includes(order.status)
        && !paymentAttempt?.provider_charge_id) codes.push('payment_evidence');
      const paymentEvents = (paymentEventsResult.data ?? []).filter(event => event.order_id === order.id);
      if (financiallyConfirmedStatuses.includes(order.status)
        && !paymentEvents.some(event => event.processing_status === 'processed' && successfulPaymentEvents.includes(event.event_type))) codes.push('payment_event');
      const earnings = (earningsResult.data ?? []).filter(entry => entry.order_item_id && orderLineIds.has(entry.order_item_id));
      const saleTotal = earnings.filter(entry => entry.entry_type === 'sale').reduce((sum, entry) => sum + Number(entry.amount_cents), 0);
      const processorFeeTotal = -earnings.filter(entry => entry.entry_type === 'processor_fee').reduce((sum, entry) => sum + Number(entry.amount_cents), 0);
      const refundTotal = -earnings.filter(entry => entry.entry_type === 'refund').reduce((sum, entry) => sum + Number(entry.amount_cents), 0);
      const disputeNet = earnings.filter(entry => ['dispute', 'adjustment'].includes(entry.entry_type)).reduce((sum, entry) => sum + Number(entry.amount_cents), 0);
      if (financiallyConfirmedStatuses.includes(order.status) && saleTotal !== order.subtotal_cents) codes.push('earnings_sale');
      if (financiallyConfirmedStatuses.includes(order.status)
        && (providerProcessorFee === null || processorFeeTotal !== providerProcessorFee)) codes.push('processor_fee');
      if (refundTotal !== Math.min(order.refunded_cents, order.subtotal_cents)) codes.push('earnings_refund');
      const expectedDisputeNet = ['disputed', 'dispute_lost'].includes(order.status) ? -Math.min(order.disputed_cents, order.subtotal_cents) : 0;
      if (disputeNet !== expectedDisputeNet) codes.push('earnings_dispute');
      const grants = (grantsResult.data ?? []).filter(grant => orderLineIds.has(grant.order_item_id));
      const expectedGrantCount = orderLines.reduce((sum, line) => sum + (Array.isArray(line.entitlement_snapshot) ? line.entitlement_snapshot.length : 0), 0);
      if (['paid', 'fulfilled', 'partially_refunded'].includes(order.status)
        && grants.filter(grant => grant.status === 'active').length !== expectedGrantCount) codes.push('entitlement_grants');
      if (['refunded', 'disputed', 'dispute_lost'].includes(order.status) && grants.some(grant => grant.status === 'active')) codes.push('entitlement_revocation');
      if (financiallyConfirmedStatuses.includes(order.status)) {
        for (const line of orderLines.filter(line => Array.isArray(line.entitlement_snapshot) && line.entitlement_snapshot.length > 0)) {
          const libraryEntries = (libraryResult.data ?? []).filter(entry => entry.user_id === order.buyer_id && entry.item_id === line.item_id);
          if (libraryEntries.length !== 1 || libraryEntries[0].acquisition_type !== 'purchase') codes.push('library_entry');
        }
      }
      if (codes.length) mismatches.push({ orderId: order.id, codes });
    }
    const update = await admin.from('commerce_reconciliation_runs').update({
      status: mismatches.length ? 'mismatched' : 'matched', checked_count: orders.length,
      mismatch_count: mismatches.length, completed_at: new Date().toISOString(),
      summary: { orderCount: orders.length, mismatches },
    }).eq('id', runId);
    if (update.error) throw update.error;
    return Response.json({ runId, checkedCount: orders.length, mismatchCount: mismatches.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (runId) await admin.from('commerce_reconciliation_runs').update({ status: 'failed', completed_at: new Date().toISOString(), summary: { reason: 'provider_or_database_error' } }).eq('id', runId);
    return commerceErrorResponse(error);
  }
}
