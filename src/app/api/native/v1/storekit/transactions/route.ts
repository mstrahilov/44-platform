import { authenticateCommerceRequest, commerceAdminClient, commerceErrorResponse } from '@/lib/server/commerce';
import {
  assertNonConsumableTransaction,
  readStoreKitJSON,
  storeKitDigest,
  storeKitErrorResponse,
  StoreKitVerificationError,
  verifyStoreKitTransaction,
} from '@/lib/server/storekit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TransactionRequest = {
  product_id?: string;
  transaction_jws?: string;
  transaction_id?: string;
  purchase_intent_id?: string | null;
  item_id?: string | null;
  offer_id?: string | null;
  app_account_token?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRODUCT_ID = /^com\.fortyfour\.os44\.(item|offer)\.[0-9a-f]{32}$/;
const TRANSACTION_ID = /^[0-9]{1,40}$/;

function isoDate(milliseconds: number | undefined) {
  return milliseconds == null ? null : new Date(milliseconds).toISOString();
}

export async function POST(request: Request) {
  try {
    const user = await authenticateCommerceRequest(request);
    const body = await readStoreKitJSON<TransactionRequest>(request);
    if (!body.product_id || !PRODUCT_ID.test(body.product_id)
      || !body.transaction_jws || !body.transaction_id || !TRANSACTION_ID.test(body.transaction_id)
      || !body.app_account_token || !UUID.test(body.app_account_token)
      || (body.purchase_intent_id != null && !UUID.test(body.purchase_intent_id))
      || (body.item_id != null && !UUID.test(body.item_id))
      || (body.offer_id != null && !UUID.test(body.offer_id))) {
      throw new StoreKitVerificationError('The signed purchase submission is invalid.');
    }
    const transaction = await verifyStoreKitTransaction(body.transaction_jws);
    assertNonConsumableTransaction(transaction);
    if (!transaction.transactionId || !transaction.originalTransactionId || !transaction.productId
      || !transaction.appAccountToken || !transaction.environment || !transaction.purchaseDate
      || !transaction.currency || !/^[A-Z]{3}$/.test(transaction.currency)
      || !Number.isSafeInteger(transaction.price) || (transaction.price ?? 0) <= 0
      || transaction.transactionId !== body.transaction_id
      || transaction.productId !== body.product_id
      || transaction.appAccountToken.toLowerCase() !== body.app_account_token.toLowerCase()
      || transaction.appAccountToken.toLowerCase() !== user.id.toLowerCase()) {
      throw new StoreKitVerificationError('The signed purchase does not match this account or product.');
    }

    const result = await commerceAdminClient().rpc('fulfill_native_storekit_transaction_v1' as never, {
      target_user_id: user.id,
      target_transaction_id: transaction.transactionId,
      target_original_transaction_id: transaction.originalTransactionId,
      target_product_id: transaction.productId,
      target_app_account_token: transaction.appAccountToken,
      target_environment: transaction.environment,
      target_jws_sha256: storeKitDigest(body.transaction_jws),
      target_purchase_date: isoDate(transaction.purchaseDate),
      target_purchase_intent_id: body.purchase_intent_id ?? null,
      target_expected_item_id: body.item_id ?? null,
      target_expected_offer_id: body.offer_id ?? null,
      target_original_purchase_date: isoDate(transaction.originalPurchaseDate),
      target_signed_date: isoDate(transaction.signedDate),
      target_storefront: transaction.storefront ?? null,
      target_storefront_id: transaction.storefrontId ?? null,
      target_currency: transaction.currency,
      target_price_milliunits: transaction.price,
      target_revocation_date: isoDate(transaction.revocationDate),
      target_revocation_reason: transaction.revocationReason ?? null,
    } as never);
    if (result.error) throw result.error;
    return Response.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof StoreKitVerificationError) return storeKitErrorResponse(error);
    return commerceErrorResponse(error);
  }
}
