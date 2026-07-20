import 'server-only';
import { randomUUID } from 'node:crypto';
import type { User } from '@supabase/supabase-js';
import { EMAIL_TEMPLATE_VERSIONS, type EmailTemplateKey, type EmailTemplatePayloads } from '@/emails/contracts';
import { renderEmail } from '@/emails/render';
import { checkoutSiteUrl, commerceAdminClient } from './commerce';

type OutboxRow = {
  id: string;
  event_key: string;
  template_key: EmailTemplateKey;
  template_version: number;
  recipient_email: string;
  payload: EmailTemplatePayloads[EmailTemplateKey];
};

export class EmailConfigurationError extends Error {}
export class EmailProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly ambiguous: boolean,
    readonly retryable: boolean,
  ) { super(message); }
}

function requiredSecret(name: 'RESEND_API_KEY' | 'EMAIL_CRON_SECRET' | 'RESEND_WEBHOOK_SECRET') {
  const value = process.env[name]?.trim();
  if (!value) throw new EmailConfigurationError(`${name} is not configured.`);
  return value;
}

export function emailConfigurationPresence() {
  return {
    resendApiKey: Boolean(process.env.RESEND_API_KEY?.trim()),
    cronSecret: Boolean(process.env.EMAIL_CRON_SECRET?.trim()),
    webhookSecret: Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim()),
    newsletterTopic: Boolean(process.env.RESEND_NEWSLETTER_TOPIC_ID?.trim()),
  };
}

export type ResendWebhookDiagnostic = {
  providerReachable: boolean;
  endpointConfigured: boolean;
  endpointEnabled: boolean;
  signingSecretMatches: boolean | null;
  requiredEventsConfigured: boolean;
};

const REQUIRED_RESEND_WEBHOOK_EVENTS = new Set([
  'email.sent',
  'email.delivered',
  'email.delivery_delayed',
  'email.bounced',
  'email.complained',
  'email.failed',
  'email.suppressed',
  'contact.updated',
]);

export async function inspectResendWebhookConfiguration(): Promise<ResendWebhookDiagnostic> {
  const unavailable: ResendWebhookDiagnostic = {
    providerReachable: false,
    endpointConfigured: false,
    endpointEnabled: false,
    signingSecretMatches: null,
    requiredEventsConfigured: false,
  };
  try {
    const response = await fetch('https://api.resend.com/webhooks?limit=100', {
      headers: {
        Authorization: `Bearer ${requiredSecret('RESEND_API_KEY')}`,
        'User-Agent': '44OS-email-operations/1.0',
      },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    if (!response.ok) return unavailable;
    const payload = await response.json() as {
      data?: Array<{
        endpoint?: string;
        status?: string;
        events?: string[];
        signing_secret?: string;
      }>;
    };
    const expectedEndpoint = `${checkoutSiteUrl()}/api/email/webhook`;
    const endpoint = (payload.data ?? []).find(candidate => candidate.endpoint === expectedEndpoint);
    if (!endpoint) return { ...unavailable, providerReachable: true };
    const configuredSecret = requiredSecret('RESEND_WEBHOOK_SECRET');
    return {
      providerReachable: true,
      endpointConfigured: true,
      endpointEnabled: endpoint.status === 'enabled',
      signingSecretMatches: typeof endpoint.signing_secret === 'string'
        ? endpoint.signing_secret === configuredSecret
        : null,
      requiredEventsConfigured: [...REQUIRED_RESEND_WEBHOOK_EVENTS]
        .every(event => endpoint.events?.includes(event)),
    };
  } catch {
    return unavailable;
  }
}

export function authorizeEmailWorker(request: Request) {
  const expected = requiredSecret('EMAIL_CRON_SECRET');
  const supplied = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!supplied || supplied !== expected) throw new EmailConfigurationError('Email worker authorization failed.');
}

export function authorizeScheduledEmailWorker(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const supplied = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!expected || !supplied || supplied !== expected) throw new EmailConfigurationError('Scheduled email worker authorization failed.');
}

export async function authenticateEmailRequest(request: Request): Promise<User> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new EmailConfigurationError('Authentication is required.');
  const result = await commerceAdminClient().auth.getUser(token);
  if (result.error || !result.data.user) throw new EmailConfigurationError('Authentication is required.');
  return result.data.user;
}

async function resendRequest(path: string, init: RequestInit) {
  const response = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${requiredSecret('RESEND_API_KEY')}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  }).catch(error => { throw new EmailProviderError(error instanceof Error ? error.name : 'network_error', 0, true, true); });
  const body = await response.json().catch(() => ({})) as { id?: string; name?: string; message?: string };
  if (!response.ok) {
    const ambiguous = response.status >= 500 || response.status === 409;
    throw new EmailProviderError(body.name ?? `resend_${response.status}`, response.status, ambiguous, ambiguous || response.status === 429);
  }
  return body;
}

async function sendOutboxRow(row: OutboxRow) {
  if (EMAIL_TEMPLATE_VERSIONS[row.template_key] !== row.template_version) throw new EmailProviderError('unsupported_template_version', 422, false, false);
  let rendered: Awaited<ReturnType<typeof renderEmail>>;
  try {
    rendered = await renderEmail(row.template_key, row.payload as never);
  } catch {
    // Rendering and payload validation occur before the provider request. A
    // deterministic local failure must never be treated as a possibly sent email.
    throw new EmailProviderError('email_render_validation_failed', 422, false, false);
  }
  const response = await resendRequest('/emails', {
    method: 'POST',
    headers: { 'Idempotency-Key': row.event_key },
    body: JSON.stringify({
      from: '44OS <support@44os.com>', reply_to: 'support@44os.com', to: [row.recipient_email],
      subject: rendered.subject, html: rendered.html, text: rendered.text,
      tags: [{ name: 'template', value: row.template_key }, { name: 'outbox_id', value: row.id }],
    }),
  });
  if (!response.id) throw new EmailProviderError('missing_provider_message_id', 502, true, true);
  return response.id;
}

export async function processEmailOutbox(limit = 20) {
  const admin = commerceAdminClient();
  const recovered = await admin.rpc('recover_stale_application_email_claims' as never);
  if (recovered.error) throw recovered.error;
  const candidates = await admin.from('email_outbox_events' as never).select('id').in('status', ['pending', 'failed']).lte('next_attempt_at', new Date().toISOString()).order('created_at').limit(Math.max(1, Math.min(limit, 50)));
  if (candidates.error) throw candidates.error;
  const results: Array<{ id: string; status: 'sent' | 'failed' | 'skipped' }> = [];
  for (const candidate of (candidates.data ?? []) as unknown as Array<{ id: string }>) {
    const claimToken = randomUUID();
    const claim = await admin.rpc('claim_application_email' as never, { target_event_id: candidate.id, target_claim_token: claimToken } as never);
    if (claim.error) { results.push({ id: candidate.id, status: 'skipped' }); continue; }
    const row = ((claim.data ?? []) as unknown as OutboxRow[])[0];
    if (!row) { results.push({ id: candidate.id, status: 'skipped' }); continue; }
    try {
      const providerMessageId = await sendOutboxRow(row);
      const complete = await admin.rpc('complete_application_email' as never, { target_event_id: row.id, target_claim_token: claimToken, target_provider_message_id: providerMessageId } as never);
      if (complete.error) throw complete.error;
      results.push({ id: row.id, status: 'sent' });
    } catch (error) {
      const providerError = error instanceof EmailProviderError ? error : new EmailProviderError('delivery_worker_error', 0, true, true);
      await admin.rpc('fail_application_email' as never, {
        target_event_id: row.id,
        target_claim_token: claimToken,
        target_error_code: providerError.message,
        target_ambiguous: providerError.ambiguous,
        target_retryable: providerError.retryable,
      } as never);
      results.push({ id: row.id, status: 'failed' });
    }
  }
  return results;
}

type NewsletterRow = { user_id: string; email_normalized: string; status: 'subscribed' | 'unsubscribed'; provider_contact_id: string | null; policy_version: string; sync_attempts: number };
type NewsletterRetirementRow = {
  id: string;
  user_id: string;
  email_normalized: string;
  provider_contact_id: string | null;
  sync_attempts: number;
};
type NewsletterSyncResult = { userId: string; status: 'synced' | 'failed' };

async function processNewsletterContactRetirements(
  admin: ReturnType<typeof commerceAdminClient>,
  topicId: string,
  limit: number,
): Promise<NewsletterSyncResult[]> {
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const recovered = await admin.from('newsletter_contact_retirements' as never).update({
    sync_status: 'failed',
    claim_token: null,
    claimed_at: null,
    last_sync_error: 'stale_retirement_claim_recovered',
    updated_at: new Date().toISOString(),
  } as never).eq('sync_status', 'claimed').lt('claimed_at', staleBefore);
  if (recovered.error) throw recovered.error;

  const pending = await admin.from('newsletter_contact_retirements' as never)
    .select('id,user_id,email_normalized,provider_contact_id,sync_attempts')
    .in('sync_status', ['pending', 'failed'])
    .is('claim_token', null)
    .order('updated_at')
    .limit(Math.max(1, Math.min(limit, 50)));
  if (pending.error) throw pending.error;

  const results: NewsletterSyncResult[] = [];
  for (const retirement of (pending.data ?? []) as unknown as NewsletterRetirementRow[]) {
    const activeConsentClaim = await admin.from('newsletter_consents' as never)
      .select('sync_claimed_at')
      .eq('user_id', retirement.user_id)
      .not('sync_claimed_at', 'is', null)
      .maybeSingle();
    if (activeConsentClaim.error) throw activeConsentClaim.error;
    // A pre-change Contact sync may still be in flight. Its 15-second provider
    // timeout is well inside the ten-minute stale-claim recovery boundary.
    if (activeConsentClaim.data) continue;
    const claimToken = randomUUID();
    const claim = await admin.from('newsletter_contact_retirements' as never).update({
      sync_status: 'claimed',
      claim_token: claimToken,
      claimed_at: new Date().toISOString(),
      sync_attempts: retirement.sync_attempts + 1,
      updated_at: new Date().toISOString(),
    } as never)
      .eq('id', retirement.id)
      .in('sync_status', ['pending', 'failed'])
      .is('claim_token', null)
      .select('id')
      .maybeSingle();
    if (claim.error) throw claim.error;
    if (!claim.data) continue;

    try {
      try {
        await resendRequest(`/contacts/${encodeURIComponent(retirement.provider_contact_id ?? retirement.email_normalized)}/topics`, {
          method: 'PATCH',
          body: JSON.stringify({ topics: [{ id: topicId, subscription: 'opt_out' }] }),
        });
      } catch (error) {
        // A missing old Contact is already retired and is therefore a successful no-op.
        if (!(error instanceof EmailProviderError) || error.status !== 404) throw error;
      }
      const completed = await admin.from('newsletter_contact_retirements' as never).update({
        sync_status: 'synced',
        claim_token: null,
        claimed_at: null,
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      } as never).eq('id', retirement.id).eq('claim_token', claimToken);
      if (completed.error) throw completed.error;
      results.push({ userId: retirement.user_id, status: 'synced' });
    } catch (error) {
      const code = error instanceof EmailProviderError ? error.message : 'newsletter_retirement_error';
      await admin.from('newsletter_contact_retirements' as never).update({
        sync_status: 'failed',
        claim_token: null,
        claimed_at: null,
        last_sync_error: code.slice(0, 120),
        updated_at: new Date().toISOString(),
      } as never).eq('id', retirement.id).eq('claim_token', claimToken);
      results.push({ userId: retirement.user_id, status: 'failed' });
    }
  }
  return results;
}

export async function processNewsletterSync(limit = 20) {
  const topicId = process.env.RESEND_NEWSLETTER_TOPIC_ID?.trim();
  if (!topicId) throw new EmailConfigurationError('The Resend newsletter Topic is not configured.');
  const admin = commerceAdminClient();
  const controls = await admin.from('email_delivery_controls' as never).select('newsletter_sync_enabled').eq('singleton', true).single();
  if (controls.error) throw controls.error;
  if (!(controls.data as unknown as { newsletter_sync_enabled: boolean }).newsletter_sync_enabled) return [];
  const results = await processNewsletterContactRetirements(admin, topicId, limit);
  const unresolvedRetirements = await admin.from('newsletter_contact_retirements' as never)
    .select('user_id')
    .in('sync_status', ['pending', 'claimed', 'failed']);
  if (unresolvedRetirements.error) throw unresolvedRetirements.error;
  const blockedUsers = new Set(
    ((unresolvedRetirements.data ?? []) as unknown as Array<{ user_id: string }>).map(row => row.user_id),
  );
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const recovered = await admin.from('newsletter_consents' as never).update({
    sync_status: 'failed',
    sync_claimed_at: null,
    last_sync_error: 'stale_sync_claim_recovered',
    updated_at: new Date().toISOString(),
  } as never).lt('sync_claimed_at', staleBefore);
  if (recovered.error) throw recovered.error;
  const pending = await admin.from('newsletter_consents' as never).select('user_id,email_normalized,status,provider_contact_id,policy_version,sync_attempts').in('sync_status', ['pending', 'failed']).is('sync_claimed_at', null).order('updated_at').limit(Math.max(1, Math.min(limit, 50)));
  if (pending.error) throw pending.error;
  for (const row of (pending.data ?? []) as unknown as NewsletterRow[]) {
    // The old provider Contact must be opted out before consent moves to a replacement address.
    if (blockedUsers.has(row.user_id)) continue;
    const claimTime = new Date().toISOString();
    const claimed = await admin.from('newsletter_consents' as never).update({ sync_claimed_at: claimTime, sync_attempts: row.sync_attempts + 1 } as never).eq('user_id', row.user_id).eq('email_normalized', row.email_normalized).is('sync_claimed_at', null).select('user_id').maybeSingle();
    if (!claimed.data) continue;
    try {
      let contactId = row.provider_contact_id;
      if (!contactId) {
        try {
          const created = await resendRequest('/contacts', { method: 'POST', body: JSON.stringify({ email: row.email_normalized, unsubscribed: row.status === 'unsubscribed', topics: [{ id: topicId, subscription: row.status === 'subscribed' ? 'opt_in' : 'opt_out' }] }) });
          contactId = created.id ?? null;
        } catch (error) {
          if (!(error instanceof EmailProviderError) || error.status !== 409) throw error;
        }
      }
      await resendRequest(`/contacts/${encodeURIComponent(contactId ?? row.email_normalized)}`, { method: 'PATCH', body: JSON.stringify({ unsubscribed: row.status === 'unsubscribed' }) });
      await resendRequest(`/contacts/${encodeURIComponent(contactId ?? row.email_normalized)}/topics`, { method: 'PATCH', body: JSON.stringify({ topics: [{ id: topicId, subscription: row.status === 'subscribed' ? 'opt_in' : 'opt_out' }] }) });
      const completed = await admin.from('newsletter_consents' as never).update({ provider_contact_id: contactId, provider_topic_id: topicId, sync_status: 'synced', sync_claimed_at: null, last_sync_error: null, updated_at: new Date().toISOString() } as never)
        .eq('user_id', row.user_id)
        .eq('email_normalized', row.email_normalized)
        .eq('sync_claimed_at', claimTime)
        .select('user_id')
        .maybeSingle();
      if (completed.error) throw completed.error;
      // A concurrent secure account-email change leaves this old claim in
      // place until stale recovery, which orders the subsequent retirement.
      if (!completed.data) continue;
      await admin.from('newsletter_consent_events' as never).insert({ user_id: row.user_id, action: 'provider_synced', source: 'resend', policy_version: row.policy_version } as never);
      results.push({ userId: row.user_id, status: 'synced' });
    } catch (error) {
      const code = error instanceof EmailProviderError ? error.message : 'newsletter_sync_error';
      await admin.from('newsletter_consents' as never).update({ sync_status: 'failed', sync_claimed_at: null, last_sync_error: code.slice(0, 120), updated_at: new Date().toISOString() } as never)
        .eq('user_id', row.user_id)
        .eq('email_normalized', row.email_normalized)
        .eq('sync_claimed_at', claimTime);
      results.push({ userId: row.user_id, status: 'failed' });
    }
  }
  return results;
}

export async function reconcileResendNewsletterPreference(contactId: string, email: string, globallyUnsubscribed: boolean) {
  const topicId = process.env.RESEND_NEWSLETTER_TOPIC_ID?.trim();
  if (globallyUnsubscribed) return 'unsubscribed' as const;
  if (!topicId) throw new EmailConfigurationError('The Resend newsletter Topic is not configured.');
  const response = await resendRequest(`/contacts/${encodeURIComponent(contactId || email)}/topics`, { method: 'GET' }) as {
    data?: Array<{ id?: string; subscription?: string }>;
  };
  const topic = response.data?.find(item => item.id === topicId);
  return topic?.subscription === 'opt_out' ? 'unsubscribed' as const : 'unchanged' as const;
}

export function resendWebhookSecret() {
  return requiredSecret('RESEND_WEBHOOK_SECRET');
}
