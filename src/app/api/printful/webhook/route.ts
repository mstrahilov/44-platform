import { commerceAdminClient } from '@/lib/server/commerce';
import { processEmailOutbox } from '@/lib/server/email';
import {
  printfulErrorResponse,
  printfulStoreId,
  printfulWebhookEventId,
  verifyPrintfulWebhook,
} from '@/lib/server/printful';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SAFE_ORDER_STATUSES = new Set([
  'draft', 'inreview', 'pending', 'onhold', 'partial', 'fulfilled', 'failed', 'canceled', 'returned',
]);
const SHIPMENT_EVENTS = new Set(['shipment_sent', 'shipment_delivered', 'shipment_returned', 'shipment_canceled']);

function safeDate(value: unknown) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function providerCents(value: unknown) {
  const amount = typeof value === 'string' || typeof value === 'number' ? Number(value) : Number.NaN;
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

function safeHttps(value: unknown) {
  return typeof value === 'string' && value.startsWith('https://') ? value : null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-pf-webhook-signature');
  try {
    if (!verifyPrintfulWebhook(rawBody, signature)) {
      return Response.json({ error: 'Invalid Printful signature.' }, { status: 400 });
    }
    let payload: Record<string, unknown>;
    try { payload = JSON.parse(rawBody) as Record<string, unknown>; }
    catch { return Response.json({ error: 'Invalid Printful payload.' }, { status: 400 }); }
    const type = typeof payload.type === 'string' ? payload.type : 'unknown';
    const storeId = Number(payload.store_id);
    if (!Number.isSafeInteger(storeId) || storeId !== printfulStoreId()) {
      return Response.json({ error: 'Printful store mismatch.' }, { status: 400 });
    }
    const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : {};
    const order = data.order && typeof data.order === 'object' ? data.order as Record<string, unknown> : null;
    const shipment = data.shipment && typeof data.shipment === 'object' ? data.shipment as Record<string, unknown> : null;
    const eventId = printfulWebhookEventId(payload);
    const admin = commerceAdminClient();
    const inserted = await admin.from('provider_webhook_events').upsert({
      provider: 'printful',
      provider_event_id: eventId,
      event_type: type,
      signature_verified: true,
      processing_status: 'received',
      payload: {
        type,
        occurredAt: payload.occurred_at ?? null,
        storeId,
        order: order ? { id: order.id ?? null, externalId: order.external_id ?? null, status: order.status ?? null } : null,
        shipment: shipment ? {
          id: shipment.id ?? null,
          status: shipment.status ?? null,
          trackingNumber: shipment.tracking_number ?? null,
          trackingUrl: safeHttps(shipment.tracking_url),
        } : null,
      },
    } as never, { onConflict: 'provider,provider_event_id', ignoreDuplicates: true }).select('id,processing_status').maybeSingle();
    if (inserted.error) throw inserted.error;
    if (!inserted.data) return Response.json({ received: true, duplicate: true });
    const eventRow = inserted.data as { id: string; processing_status: string };
    if (!order) {
      await admin.from('provider_webhook_events').update({ processing_status: 'ignored', processed_at: new Date().toISOString() } as never).eq('id', eventRow.id);
      return Response.json({ received: true, ignored: true });
    }
    const providerOrderId = Number(order.id);
    const externalId = typeof order.external_id === 'string' ? order.external_id : null;
    const providerStatus = typeof order.status === 'string' ? order.status : 'unknown';
    let fulfillment = admin.from('printful_fulfillment_orders' as never)
      .select('id,commerce_order_id,last_provider_event_at,confirmed_externally_at,provider_dashboard_url,provider_subtotal_cents,provider_shipping_cents,provider_tax_cents,provider_total_cents,charged_cents')
      .limit(1);
    fulfillment = Number.isSafeInteger(providerOrderId) && providerOrderId > 0
      ? fulfillment.eq('provider_order_id', providerOrderId)
      : fulfillment.eq('external_id', externalId ?? '');
    const fulfillmentResult = await fulfillment.maybeSingle();
    if (fulfillmentResult.error) throw fulfillmentResult.error;
    if (!fulfillmentResult.data) {
      await admin.from('provider_webhook_events').update({ processing_status: 'ignored', processed_at: new Date().toISOString() } as never).eq('id', eventRow.id);
      return Response.json({ received: true, ignored: true });
    }
    if (!SAFE_ORDER_STATUSES.has(providerStatus)) {
      await admin.from('provider_webhook_events').update({
        processing_status: 'failed',
        processed_at: new Date().toISOString(),
        error_message: 'Provider order returned an unsupported status.',
      } as never).eq('id', eventRow.id);
      return Response.json({ error: 'Printful order status is unsupported.' }, { status: 409 });
    }
    const fulfillmentRow = fulfillmentResult.data as unknown as {
      id: string;
      commerce_order_id: string;
      last_provider_event_at: string | null;
      confirmed_externally_at: string | null;
      provider_dashboard_url: string | null;
      provider_subtotal_cents: number | null;
      provider_shipping_cents: number | null;
      provider_tax_cents: number | null;
      provider_total_cents: number | null;
      charged_cents: number;
    };
    const occurredAt = safeDate(payload.occurred_at) ?? new Date().toISOString();
    if (fulfillmentRow.last_provider_event_at && new Date(occurredAt) < new Date(fulfillmentRow.last_provider_event_at)) {
      await admin.from('provider_webhook_events').update({
        processing_status: 'processed',
        processed_at: new Date().toISOString(),
        error_message: 'Older signed Printful event retained without regressing current fulfillment state.',
      } as never).eq('id', eventRow.id);
      return Response.json({ received: true, outOfOrder: true });
    }
    const costs = order.costs && typeof order.costs === 'object' ? order.costs as Record<string, unknown> : {};
    const providerTotal = providerCents(costs.total);
    const externallyConfirmed = providerStatus !== 'draft';
    const chargedCents = ['pending', 'partial', 'fulfilled'].includes(providerStatus) && providerTotal !== null
      ? providerTotal
      : fulfillmentRow.charged_cents;
    const update = await admin.from('printful_fulfillment_orders' as never).update({
      provider_status: providerStatus,
      failure_code: type === 'order_failed' ? 'printful_order_failed' : null,
      failure_message: type === 'order_failed' ? 'Printful reported an order failure.' : null,
      provider_dashboard_url: safeHttps(order.dashboard_url) ?? fulfillmentRow.provider_dashboard_url,
      provider_subtotal_cents: providerCents(costs.subtotal) ?? fulfillmentRow.provider_subtotal_cents,
      provider_shipping_cents: providerCents(costs.shipping) ?? fulfillmentRow.provider_shipping_cents,
      provider_tax_cents: providerCents(costs.tax) ?? fulfillmentRow.provider_tax_cents,
      provider_total_cents: providerTotal ?? fulfillmentRow.provider_total_cents,
      charged_cents: chargedCents,
      confirmed_externally_at: fulfillmentRow.confirmed_externally_at ?? (externallyConfirmed ? occurredAt : null),
      last_provider_event_at: occurredAt,
      response_snapshot: { id: providerOrderId, externalId, status: providerStatus, eventType: type },
      confirmation_requested_at: null,
    } as never).eq('id', fulfillmentRow.id);
    if (update.error) throw update.error;
    if (shipment && SHIPMENT_EVENTS.has(type)) {
      const providerShipmentId = Number(shipment.id);
      if (Number.isSafeInteger(providerShipmentId) && providerShipmentId > 0) {
        const shipmentStatus = type === 'shipment_delivered' ? 'delivered'
          : type === 'shipment_returned' ? 'returned'
            : type === 'shipment_canceled' ? 'canceled'
              : 'shipped';
        const existingShipment = await admin.from('printful_fulfillment_shipments' as never)
          .select('id,last_provider_event_at').eq('fulfillment_order_id', fulfillmentRow.id)
          .eq('provider_shipment_id', providerShipmentId).maybeSingle();
        if (existingShipment.error) throw existingShipment.error;
        const existingAt = (existingShipment.data as unknown as { last_provider_event_at?: string } | null)?.last_provider_event_at;
        if (!existingAt || new Date(occurredAt) >= new Date(existingAt)) {
          const shipmentWrite = await admin.from('printful_fulfillment_shipments' as never).upsert({
            fulfillment_order_id: fulfillmentRow.id,
            provider_shipment_id: providerShipmentId,
            status: shipmentStatus,
            tracking_number: typeof shipment.tracking_number === 'string' ? shipment.tracking_number.slice(0, 200) : null,
            tracking_url: safeHttps(shipment.tracking_url),
            shipped_at: safeDate(shipment.shipped_at) ?? (shipmentStatus === 'shipped' ? occurredAt : null),
            delivered_at: safeDate(shipment.delivered_at) ?? (shipmentStatus === 'delivered' ? occurredAt : null),
            returned_at: shipmentStatus === 'returned' ? occurredAt : null,
            last_provider_event_at: occurredAt,
            provider_snapshot: { eventType: type, status: shipment.status ?? shipmentStatus },
          } as never, { onConflict: 'fulfillment_order_id,provider_shipment_id' });
          if (shipmentWrite.error) throw shipmentWrite.error;
        }
      }
    }
    const fulfillmentStatus = providerStatus === 'fulfilled' ? 'fulfilled'
      : providerStatus === 'returned' ? 'returned'
        : providerStatus === 'canceled' ? 'canceled'
          : providerStatus === 'draft' ? 'pending'
            : 'in_progress';
    const lineUpdate = await admin.from('commerce_order_items')
      .update({ fulfillment_status: fulfillmentStatus })
      .eq('order_id', fulfillmentRow.commerce_order_id).eq('offer_type', 'physical_purchase');
    if (lineUpdate.error) throw lineUpdate.error;
    const eventUpdate = await admin.from('provider_webhook_events').update({ processing_status: 'processed', processed_at: new Date().toISOString() } as never).eq('id', eventRow.id);
    if (eventUpdate.error) throw eventUpdate.error;
    const emailStatus = type === 'shipment_returned' ? null
      : type === 'shipment_delivered' ? 'delivered'
      : type === 'shipment_canceled' ? 'canceled'
        : SHIPMENT_EVENTS.has(type) ? 'shipped'
          : ['inreview', 'pending', 'onhold', 'partial'].includes(providerStatus) ? 'in_production'
            : null;
    if (emailStatus) {
      const email = await admin.rpc('queue_fulfillment_email' as never, {
        target_order_id: fulfillmentRow.commerce_order_id,
        target_provider_event_id: eventId,
        target_status: emailStatus,
        target_detail: emailStatus === 'in_production'
          ? 'Your 44OS order is being prepared by our fulfillment partner.'
          : emailStatus === 'shipped'
            ? 'Your 44OS order has shipped.'
            : emailStatus === 'delivered'
              ? 'Your 44OS order was marked delivered.'
              : 'Your 44OS fulfillment was canceled. Support will follow up.',
        target_tracking_url: shipment ? safeHttps(shipment.tracking_url) : null,
        target_tracking_number: shipment && typeof shipment.tracking_number === 'string' ? shipment.tracking_number.slice(0, 200) : null,
      } as never);
      if (email.error) throw email.error;
      // A verified fulfillment transition owns the durable queue. Sending is
      // best-effort here so a mail-provider outage cannot make Printful replay
      // an already-persisted fulfillment event; the recovery worker retries it.
      await processEmailOutbox(5).catch(() => undefined);
    }
    return Response.json({ received: true });
  } catch (error) {
    return printfulErrorResponse(error);
  }
}
