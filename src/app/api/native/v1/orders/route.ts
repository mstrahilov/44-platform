import { authenticateCommerceRequest, commerceAdminClient, commerceErrorResponse } from '@/lib/server/commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Cursor = { createdAt: string; id: string };

function decodeCursor(value: string | null): Cursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Cursor;
    if (!parsed.createdAt || Number.isNaN(Date.parse(parsed.createdAt)) || !UUID.test(parsed.id)) return null;
    return { createdAt: new Date(parsed.createdAt).toISOString(), id: parsed.id.toLowerCase() };
  } catch {
    return null;
  }
}

function encodeCursor(cursor: Cursor) {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export async function GET(request: Request) {
  try {
    const user = await authenticateCommerceRequest(request);
    const url = new URL(request.url);
    const cursorValue = url.searchParams.get('cursor');
    const cursor = decodeCursor(cursorValue);
    if (cursorValue && !cursor) {
      return Response.json({ error: 'Invalid Orders cursor.', code: 'invalid_cursor' }, { status: 400 });
    }

    const requestedLimit = Number(url.searchParams.get('limit') ?? '20');
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 20;
    const admin = commerceAdminClient();
    let query = admin.from('commerce_orders')
      .select('id,status,currency,subtotal_cents,discount_cents,tax_cents,shipping_cents,total_cents,provider,placed_at,paid_at,canceled_at,created_at,updated_at')
      .eq('buyer_id', user.id)
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);
    if (cursor) {
      query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
    }
    const ordersResult = await query;
    if (ordersResult.error) throw ordersResult.error;
    const page = (ordersResult.data ?? []).slice(0, limit);
    const orderIds = page.map(order => order.id);
    const linesResult = orderIds.length
      ? await admin.from('commerce_order_items')
        .select('id,order_id,item_id,item_title,offer_title,offer_type,quantity,line_total_cents,currency,fulfillment_status,created_at')
        .in('order_id', orderIds)
        .order('created_at', { ascending: true })
      : { data: [], error: null };
    if (linesResult.error) throw linesResult.error;
    const lines = linesResult.data ?? [];
    const orders = page.map(order => ({
      ...order,
      purchase_channel: order.provider === 'app_store' ? 'app_store' : 'external_checkout',
      lines: lines.filter(line => line.order_id === order.id),
    }));
    const last = page.at(-1);
    const nextCursor = (ordersResult.data?.length ?? 0) > limit && last
      ? encodeCursor({ createdAt: last.created_at, id: last.id })
      : null;
    return Response.json({ contract_version: 1, orders, next_cursor: nextCursor }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return commerceErrorResponse(error);
  }
}
