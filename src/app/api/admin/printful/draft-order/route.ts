import { authenticateCommerceRequest, commerceAdminClient } from '@/lib/server/commerce';
import { createPrintfulDraftOrder, printfulErrorResponse } from '@/lib/server/printful';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await authenticateCommerceRequest(request);
    const admin = commerceAdminClient();
    const profile = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile.error) throw profile.error;
    if (profile.data?.role !== 'admin') return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    const body = await request.json() as { commerceOrderId?: string; shippingQuoteId?: string; selectedRateId?: string };
    if (!body.commerceOrderId || !body.shippingQuoteId || !body.selectedRateId) {
      return Response.json({ error: 'Printful draft-order details are incomplete.', code: 'invalid_request' }, { status: 400 });
    }
    return Response.json(await createPrintfulDraftOrder(body.commerceOrderId, body.shippingQuoteId, body.selectedRateId));
  } catch (error) {
    return printfulErrorResponse(error);
  }
}
