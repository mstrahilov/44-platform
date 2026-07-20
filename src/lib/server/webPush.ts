import 'server-only';
import { randomUUID } from 'node:crypto';
import webPush from 'web-push';
import { commerceAdminClient } from './commerce';

type PushDelivery = {
  delivery_id: string;
  achievement_event_id: string;
  subscription_id: string;
  event_type: string;
  metadata: Record<string, unknown>;
  endpoint: string;
  p256dh: string;
  auth: string;
  attempt_count: number;
};

function requiredPushConfiguration() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim() || 'mailto:support@44os.com';
  if (!publicKey || !privateKey) throw new Error('Web Push is not configured.');
  return { publicKey, privateKey, subject };
}

export function webPushConfigurationPresence() {
  return Boolean(
    process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim()
    && process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim(),
  );
}

function stringValue(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === 'string' ? value : '';
}

function payloadFor(delivery: PushDelivery) {
  const actor = stringValue(delivery.metadata, 'actor_name') || 'Someone';
  if (delivery.event_type === 'reply_received') {
    return {
      title: `${actor} replied`,
      body: stringValue(delivery.metadata, 'reply_body') || 'Someone replied to your Community post.',
      url: `/community/thread/${stringValue(delivery.metadata, 'post_slug') || stringValue(delivery.metadata, 'post_id')}`,
    };
  }
  if (delivery.event_type === 'mention_received') {
    return {
      title: `${actor} mentioned you`,
      body: stringValue(delivery.metadata, 'post_body') || 'You were mentioned in Community.',
      url: `/community/thread/${stringValue(delivery.metadata, 'post_slug') || stringValue(delivery.metadata, 'post_id')}`,
    };
  }
  if (delivery.event_type === 'message_received') {
    return {
      title: `${actor} sent you a message`,
      body: stringValue(delivery.metadata, 'message_body') || 'You have a new message.',
      url: `/inbox?conversation=${encodeURIComponent(stringValue(delivery.metadata, 'conversation_id'))}`,
    };
  }
  return {
    title: 'You are now a Creator',
    body: 'Creator access is ready. Open Studio to add your first release.',
    url: '/studio',
  };
}

function safePushError(error: unknown) {
  const statusCode = typeof error === 'object' && error && 'statusCode' in error
    ? Number((error as { statusCode?: unknown }).statusCode)
    : 0;
  return {
    statusCode,
    code: statusCode ? `push_http_${statusCode}` : 'push_delivery_error',
    retryable: statusCode === 0 || statusCode === 408 || statusCode === 429 || statusCode >= 500,
    expired: statusCode === 404 || statusCode === 410,
  };
}

export async function processWebPushOutbox(limit = 20) {
  const configuration = requiredPushConfiguration();
  webPush.setVapidDetails(configuration.subject, configuration.publicKey, configuration.privateKey);
  const admin = commerceAdminClient();
  const claimToken = randomUUID();
  const claimed = await admin.rpc('claim_web_push_deliveries' as never, {
    target_limit: Math.max(1, Math.min(limit, 50)),
    target_claim_token: claimToken,
  } as never);
  if (claimed.error) throw claimed.error;
  const results: Array<{ id: string; status: 'sent' | 'failed' }> = [];

  for (const delivery of (claimed.data ?? []) as unknown as PushDelivery[]) {
    try {
      await webPush.sendNotification({
        endpoint: delivery.endpoint,
        keys: { p256dh: delivery.p256dh, auth: delivery.auth },
      }, JSON.stringify({ ...payloadFor(delivery), badge: 1 }), {
        TTL: 60 * 60 * 24,
        urgency: delivery.event_type === 'message_received' ? 'high' : 'normal',
      });
      const complete = await admin.rpc('complete_web_push_delivery' as never, {
        target_delivery_id: delivery.delivery_id,
        target_claim_token: claimToken,
      } as never);
      if (complete.error) throw complete.error;
      results.push({ id: delivery.delivery_id, status: 'sent' });
    } catch (error) {
      const failure = safePushError(error);
      if (failure.expired) {
        await admin.from('web_push_subscriptions' as never).delete().eq('id', delivery.subscription_id);
      } else {
        await admin.rpc('fail_web_push_delivery' as never, {
          target_delivery_id: delivery.delivery_id,
          target_claim_token: claimToken,
          target_error_code: failure.code,
          target_retryable: failure.retryable,
        } as never);
      }
      results.push({ id: delivery.delivery_id, status: 'failed' });
    }
  }
  return results;
}
