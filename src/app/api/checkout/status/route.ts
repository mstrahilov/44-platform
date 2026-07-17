import { authenticateCommerceRequest, commerceAdminClient, commerceErrorResponse } from '@/lib/server/commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await authenticateCommerceRequest(request);
    const sessionId = new URL(request.url).searchParams.get('session_id') ?? '';
    if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) {
      return Response.json({ error: 'Invalid Checkout Session.', code: 'invalid_session' }, { status: 400 });
    }
    const admin = commerceAdminClient();
    const attemptResult = await admin.from('payment_attempts')
      .select('id,order_id,status,updated_at')
      .eq('provider', 'stripe')
      .eq('provider_session_id', sessionId)
      .maybeSingle();
    if (attemptResult.error) throw attemptResult.error;
    if (!attemptResult.data) return Response.json({ status: 'pending' }, { headers: { 'Cache-Control': 'no-store' } });
    const orderResult = await admin.from('commerce_orders')
      .select('id,buyer_id,status,total_cents,currency,paid_at,updated_at')
      .eq('id', attemptResult.data.order_id)
      .eq('buyer_id', user.id)
      .maybeSingle();
    if (orderResult.error) throw orderResult.error;
    if (!orderResult.data) return Response.json({ error: 'Order not found.', code: 'order_not_found' }, { status: 404 });
    return Response.json({
      orderId: orderResult.data.id,
      status: orderResult.data.status,
      totalCents: orderResult.data.total_cents,
      currency: orderResult.data.currency,
      paidAt: orderResult.data.paid_at,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return commerceErrorResponse(error);
  }
}

