import { authenticateCommerceRequest, commerceAdminClient } from '@/lib/server/commerce';
import {
  estimatePrintfulShipping,
  estimatePrintfulShippingForOrder,
  printfulErrorResponse,
} from '@/lib/server/printful';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await authenticateCommerceRequest(request);
    const admin = commerceAdminClient();
    const profile = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile.error) throw profile.error;
    if (profile.data?.role !== 'admin') return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    const body = await request.json() as {
      commerceOrderId?: string;
      recipient?: { countryCode?: string; stateCode?: string; postalCode?: string };
      currency?: string;
      items?: Array<{ merchVariantId?: string; quantity?: number }>;
    };
    if (body.commerceOrderId) {
      return Response.json(await estimatePrintfulShippingForOrder(body.commerceOrderId));
    }
    if (!body.recipient?.countryCode || !body.currency || !body.items?.length
      || body.items.some(item => !item.merchVariantId || !Number.isInteger(item.quantity))) {
      return Response.json({ error: 'Printful shipping estimate details are incomplete.', code: 'invalid_request' }, { status: 400 });
    }
    return Response.json(await estimatePrintfulShipping({
      recipient: {
        countryCode: body.recipient.countryCode,
        stateCode: body.recipient.stateCode,
        postalCode: body.recipient.postalCode,
      },
      currency: body.currency,
      items: body.items.map(item => ({ merchVariantId: item.merchVariantId!, quantity: item.quantity! })),
    }));
  } catch (error) {
    return printfulErrorResponse(error);
  }
}
