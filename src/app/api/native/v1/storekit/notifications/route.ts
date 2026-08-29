import { commerceAdminClient } from '@/lib/server/commerce';
import {
  readStoreKitJSON,
  storeKitDigest,
  storeKitErrorResponse,
  StoreKitVerificationError,
  verifyStoreKitNotification,
  verifyStoreKitTransaction,
} from '@/lib/server/storekit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type NotificationRequest = { signedPayload?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isoDate(milliseconds: number | undefined) {
  return milliseconds == null ? null : new Date(milliseconds).toISOString();
}

export async function POST(request: Request) {
  try {
    const body = await readStoreKitJSON<NotificationRequest>(request);
    if (!body.signedPayload) throw new StoreKitVerificationError('The signed App Store notification is missing.');
    const notification = await verifyStoreKitNotification(body.signedPayload);
    if (!notification.notificationUUID || !UUID.test(notification.notificationUUID)
      || !notification.notificationType || !notification.data?.environment) {
      throw new StoreKitVerificationError('The signed App Store notification is incomplete.');
    }

    const signedTransaction = notification.data.signedTransactionInfo;
    const transaction = signedTransaction ? await verifyStoreKitTransaction(signedTransaction) : null;
    if (transaction?.environment && transaction.environment !== notification.data.environment) {
      throw new StoreKitVerificationError('The App Store notification environments do not match.');
    }
    if (['REFUND', 'REVOKE'].includes(String(notification.notificationType)) && !transaction) {
      throw new StoreKitVerificationError('The App Store revocation notification has no transaction.');
    }

    const result = await commerceAdminClient().rpc('process_native_storekit_notification_v1' as never, {
      target_notification_uuid: notification.notificationUUID,
      target_notification_type: String(notification.notificationType),
      target_signed_payload_sha256: storeKitDigest(body.signedPayload),
      target_subtype: notification.subtype ? String(notification.subtype) : null,
      target_environment: String(notification.data.environment),
      target_transaction_id: transaction?.transactionId ?? null,
      target_original_transaction_id: transaction?.originalTransactionId ?? null,
      target_revocation_date: isoDate(transaction?.revocationDate),
      target_revocation_reason: transaction?.revocationReason ?? null,
    } as never);
    if (result.error) throw result.error;
    const outcome = result.data as { retryable?: boolean } | null;
    if (outcome?.retryable) {
      return Response.json({ error: 'Notification processing will be retried.' }, {
        status: 503,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
      });
    }
    return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return storeKitErrorResponse(error);
  }
}
