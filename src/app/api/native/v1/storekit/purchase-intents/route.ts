import { authenticateCommerceRequest, commerceAdminClient, commerceErrorResponse } from '@/lib/server/commerce';
import {
  assertStoreKitConfigured,
  readStoreKitJSON,
  StoreKitConfigurationError,
  StoreKitVerificationError,
  storeKitErrorResponse,
} from '@/lib/server/storekit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PurchaseIntentRequest = {
  item_id?: string;
  offer_id?: string | null;
  tier_code?: string | null;
  terms_sha256?: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const user = await authenticateCommerceRequest(request);
    assertStoreKitConfigured();
    const body = await readStoreKitJSON<PurchaseIntentRequest>(request, 8_192);
    if (!body.item_id || !UUID.test(body.item_id)
      || (body.offer_id != null && !UUID.test(body.offer_id))
      || (body.tier_code != null && !['basic', 'premium', 'trackout'].includes(body.tier_code))
      || (body.terms_sha256 != null && !/^[0-9a-f]{64}$/.test(body.terms_sha256))) {
      throw new StoreKitVerificationError('The digital purchase selection is invalid.');
    }
    const result = await commerceAdminClient().rpc('prepare_native_storekit_purchase_intent_v1' as never, {
      target_user_id: user.id,
      target_item_id: body.item_id,
      target_offer_id: body.offer_id ?? null,
      target_tier_code: body.tier_code ?? null,
      target_terms_sha256: body.terms_sha256 ?? null,
    } as never);
    if (result.error) throw result.error;
    return Response.json(result.data, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof StoreKitConfigurationError || error instanceof StoreKitVerificationError) {
      return storeKitErrorResponse(error);
    }
    return commerceErrorResponse(error);
  }
}
