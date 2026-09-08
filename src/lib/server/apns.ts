import 'server-only';
import { randomUUID } from 'node:crypto';
import crypto from 'node:crypto';
import http2 from 'node:http2';
import { commerceAdminClient } from './commerce';

type ApnsDelivery = {
  delivery_id: string;
  achievement_event_id: string;
  device_token_id: string;
  event_type: string;
  metadata: Record<string, unknown>;
  device_token: string;
  environment: 'sandbox' | 'production';
  attempt_count: number;
  achievement_title: string | null;
};

function requiredApnsConfiguration() {
  const key = process.env.APNS_KEY?.trim();
  const keyId = process.env.APNS_KEY_ID?.trim();
  const teamId = process.env.APNS_TEAM_ID?.trim();
  const bundleId = process.env.APNS_BUNDLE_ID?.trim();
  if (!key || !keyId || !teamId || !bundleId) throw new Error('APNs is not configured.');
  return { key, keyId, teamId, bundleId };
}

export function apnsConfigurationPresence() {
  return Boolean(
    process.env.APNS_KEY?.trim()
    && process.env.APNS_KEY_ID?.trim()
    && process.env.APNS_TEAM_ID?.trim()
    && process.env.APNS_BUNDLE_ID?.trim(),
  );
}

function base64url(input: Buffer | string) {
  return (typeof input === 'string' ? Buffer.from(input) : input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// One token is valid for up to an hour; Apple asks providers not to generate
// a fresh one on every request. A module-level cache lets a warm serverless
// instance reuse the same token across cron invocations.
let cachedToken: { token: string; expiresAt: number } | null = null;

function apnsAuthToken() {
  const configuration = requiredApnsConfiguration();
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.token;
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: configuration.keyId }));
  const payload = base64url(JSON.stringify({ iss: configuration.teamId, iat: now }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.sign(null, Buffer.from(signingInput), {
    key: configuration.key,
    dsaEncoding: 'ieee-p1363',
  });
  const token = `${signingInput}.${base64url(signature)}`;
  cachedToken = { token, expiresAt: now + 55 * 60 };
  return token;
}

function stringValue(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === 'string' ? value : '';
}

function payloadFor(delivery: ApnsDelivery) {
  const actor = stringValue(delivery.metadata, 'actor_name') || 'Someone';
  switch (delivery.event_type) {
    case 'reply_received':
      return { title: `${actor} replied`, body: stringValue(delivery.metadata, 'reply_body') || 'Someone replied to your Community post.', kind: 'reply' };
    case 'mention_received':
      return { title: `${actor} mentioned you`, body: stringValue(delivery.metadata, 'post_body') || 'You were mentioned in Community.', kind: 'mention' };
    case 'like_received':
      return { title: `${actor} liked your post`, body: stringValue(delivery.metadata, 'post_title') || 'Someone liked your Community post.', kind: 'like' };
    case 'message_received':
      return { title: `${actor} sent you a message`, body: stringValue(delivery.metadata, 'message_body') || 'You have a new message.', kind: 'message' };
    case 'achievement_unlocked':
      return { title: 'Achievement unlocked', body: delivery.achievement_title || 'You unlocked a new achievement.', kind: 'achievement' };
    default:
      return { title: 'You are now a Creator', body: 'Creator access is ready. Open Studio to add your first release.', kind: 'creator_access_granted' };
  }
}

function apnsHost(environment: 'sandbox' | 'production') {
  return environment === 'production' ? 'https://api.push.apple.com' : 'https://api.sandbox.push.apple.com';
}

function sendApnsRequest(
  client: http2.ClientHttp2Session,
  deviceToken: string,
  bundleId: string,
  body: Record<string, unknown>,
  token: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${token}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    });
    let status = 0;
    let responseBody = '';
    request.on('response', headers => { status = Number(headers[':status'] ?? 0); });
    request.setEncoding('utf8');
    request.on('data', chunk => { responseBody += chunk; });
    request.on('end', () => resolve({ status, body: responseBody }));
    request.on('error', reject);
    request.end(payload);
  });
}

function safeApnsError(status: number, body: string) {
  let reason = 'apns_delivery_error';
  try { reason = (JSON.parse(body) as { reason?: string }).reason || reason; } catch { /* non-JSON error body */ }
  return {
    code: `apns_${status || 'network'}_${reason}`,
    retryable: status === 0 || status === 429 || status >= 500,
    expired: status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered',
  };
}

export async function processApnsOutbox(limit = 20) {
  const configuration = requiredApnsConfiguration();
  const admin = commerceAdminClient();
  const claimToken = randomUUID();
  const claimed = await admin.rpc('claim_apns_deliveries' as never, {
    target_limit: Math.max(1, Math.min(limit, 50)),
    target_claim_token: claimToken,
  } as never);
  if (claimed.error) throw claimed.error;
  const deliveries = (claimed.data ?? []) as unknown as ApnsDelivery[];
  const results: Array<{ id: string; status: 'sent' | 'failed' }> = [];
  const token = apnsAuthToken();
  const clients = new Map<string, http2.ClientHttp2Session>();

  try {
    for (const delivery of deliveries) {
      try {
        let client = clients.get(delivery.environment);
        if (!client) {
          client = http2.connect(apnsHost(delivery.environment));
          client.on('error', () => {});
          clients.set(delivery.environment, client);
        }
        const { title, body, kind } = payloadFor(delivery);
        const response = await sendApnsRequest(client, delivery.device_token, configuration.bundleId, {
          aps: { alert: { title, body }, sound: 'default' },
          kind,
        }, token);
        if (response.status === 200) {
          const complete = await admin.rpc('complete_apns_delivery' as never, {
            target_delivery_id: delivery.delivery_id,
            target_claim_token: claimToken,
          } as never);
          if (complete.error) throw complete.error;
          results.push({ id: delivery.delivery_id, status: 'sent' });
        } else {
          const failure = safeApnsError(response.status, response.body);
          if (failure.expired) {
            await admin.from('apns_device_tokens' as never).delete().eq('id', delivery.device_token_id);
          } else {
            await admin.rpc('fail_apns_delivery' as never, {
              target_delivery_id: delivery.delivery_id,
              target_claim_token: claimToken,
              target_error_code: failure.code,
              target_retryable: failure.retryable,
            } as never);
          }
          results.push({ id: delivery.delivery_id, status: 'failed' });
        }
      } catch {
        await admin.rpc('fail_apns_delivery' as never, {
          target_delivery_id: delivery.delivery_id,
          target_claim_token: claimToken,
          target_error_code: 'apns_request_failed',
          target_retryable: true,
        } as never);
        results.push({ id: delivery.delivery_id, status: 'failed' });
      }
    }
  } finally {
    for (const client of clients.values()) client.close();
  }
  return results;
}
