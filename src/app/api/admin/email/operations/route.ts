import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { authenticateEmailRequest, emailConfigurationPresence, inspectResendWebhookConfiguration } from '@/lib/server/email';
import { commerceAdminClient } from '@/lib/server/commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTROLS = {
  delivery_enabled: 'EMAIL DELIVERY',
  support_intake_enabled: 'SUPPORT INTAKE',
  newsletter_sync_enabled: 'NEWSLETTER SYNC',
} as const;

type EmailControl = keyof typeof CONTROLS;
type ReconciliationResolution = 'provider_sent' | 'retry_approved' | 'event_suppressed';

const RECONCILIATION_CONFIRMATIONS: Record<ReconciliationResolution, string> = {
  provider_sent: 'MARK EMAIL SENT',
  retry_approved: 'RETRY EMAIL',
  event_suppressed: 'SUPPRESS EMAIL',
};

async function requireAdmin(request: Request) {
  const user = await authenticateEmailRequest(request);
  const admin = commerceAdminClient();
  const profile = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile.error) throw profile.error;
  if (profile.data?.role !== 'admin') return null;
  return { admin, user };
}

function authenticatedClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authorization = request.headers.get('authorization');
  if (!url || !anonKey || !authorization) throw new Error('Authenticated database access is not configured.');
  return createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
}

function responseError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : 'Email operations are unavailable.';
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function exactCount(query: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

export async function GET(request: Request) {
  try {
    const access = await requireAdmin(request);
    if (!access) return responseError(new Error('Administrator access required.'), 403);
    const [
      controls,
      history,
      reconciliationRequired,
      reconciliationHistory,
      pending,
      failed,
      sent,
      suppressed,
      providerFailures,
      newsletterPending,
      newsletterRetirements,
      openSupport,
      webhook,
    ] = await Promise.all([
      access.admin.from('email_delivery_controls' as never)
        .select('delivery_enabled,support_intake_enabled,newsletter_sync_enabled,approved_at,approved_by,updated_at')
        .eq('singleton', true).single(),
      access.admin.from('email_control_events' as never)
        .select('id,control_name,previous_enabled,new_enabled,changed_by,reason,created_at')
        .order('created_at', { ascending: false }).limit(20),
      access.admin.from('email_outbox_events' as never)
        .select('id,event_key,template_key,recipient_email,attempt_count,created_at,last_error_code,last_error_at')
        .eq('status', 'failed')
        .in('last_error_code', ['stale_claim_reconciliation_required', 'provider_rejection_review_required'])
        .order('last_error_at', { ascending: true }).limit(50),
      access.admin.from('email_reconciliation_events' as never)
        .select('id,outbox_event_id,resolution,provider_message_id,reconciled_by,reason,created_at')
        .order('created_at', { ascending: false }).limit(20),
      exactCount(access.admin.from('email_outbox_events' as never).select('id', { head: true, count: 'exact' }).eq('status', 'pending')),
      exactCount(access.admin.from('email_outbox_events' as never).select('id', { head: true, count: 'exact' }).eq('status', 'failed')),
      exactCount(access.admin.from('email_outbox_events' as never).select('id', { head: true, count: 'exact' }).eq('status', 'sent')),
      exactCount(access.admin.from('email_outbox_events' as never).select('id', { head: true, count: 'exact' }).eq('status', 'suppressed')),
      exactCount(access.admin.from('email_provider_events' as never).select('id', { head: true, count: 'exact' }).in('event_type', ['email.bounced', 'email.complained', 'email.failed', 'email.suppressed'])),
      exactCount(access.admin.from('newsletter_consents' as never).select('user_id', { head: true, count: 'exact' }).in('sync_status', ['pending', 'failed'])),
      exactCount(access.admin.from('newsletter_contact_retirements' as never).select('id', { head: true, count: 'exact' }).in('sync_status', ['pending', 'claimed', 'failed'])),
      exactCount(access.admin.from('support_cases' as never).select('id', { head: true, count: 'exact' }).in('status', ['open', 'waiting_on_support'])),
      inspectResendWebhookConfiguration(),
    ]);
    if (controls.error) throw controls.error;
    if (history.error) throw history.error;
    if (reconciliationRequired.error) throw reconciliationRequired.error;
    if (reconciliationHistory.error) throw reconciliationHistory.error;
    return Response.json({
      controls: controls.data,
      history: history.data ?? [],
      reconciliationRequired: reconciliationRequired.data ?? [],
      reconciliationHistory: reconciliationHistory.data ?? [],
      configuration: emailConfigurationPresence(),
      webhook,
      counts: { pending, failed, sent, suppressed, providerFailures, newsletterPending, newsletterRetirements, openSupport },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireAdmin(request);
    if (!access) return responseError(new Error('Administrator access required.'), 403);
    const body = await request.json() as {
      action?: unknown;
      eventId?: unknown;
      resolution?: unknown;
      providerMessageId?: unknown;
      control?: unknown;
      enabled?: unknown;
      reason?: unknown;
      confirmation?: unknown;
    };
    if (body.action === 'reconcile') {
      if (typeof body.eventId !== 'string' || !body.eventId) throw new Error('Choose an email event to reconcile.');
      if (typeof body.resolution !== 'string' || !(body.resolution in RECONCILIATION_CONFIRMATIONS)) {
        throw new Error('Choose an exact reconciliation outcome.');
      }
      const resolution = body.resolution as ReconciliationResolution;
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if (reason.length < 8 || reason.length > 500) throw new Error('Provide an 8–500 character reconciliation reason.');
      const expectedConfirmation = RECONCILIATION_CONFIRMATIONS[resolution];
      if (body.confirmation !== expectedConfirmation) throw new Error(`Type ${expectedConfirmation} exactly.`);
      const providerMessageId = typeof body.providerMessageId === 'string' ? body.providerMessageId.trim() : '';
      if (resolution === 'provider_sent' && !providerMessageId) {
        throw new Error('Enter the Resend message ID that proves this email was sent.');
      }
      if (resolution !== 'provider_sent' && providerMessageId) {
        throw new Error('A Resend message ID is only valid when marking an email as sent.');
      }
      const result = await authenticatedClient(request).rpc('reconcile_application_email' as never, {
        target_event_id: body.eventId,
        target_resolution: resolution,
        target_provider_message_id: providerMessageId || null,
        target_reason: reason,
      } as never);
      if (result.error) throw result.error;
      return Response.json({ reconciliation: result.data }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (typeof body.control !== 'string' || !(body.control in CONTROLS)) throw new Error('Choose an exact email control.');
    if (typeof body.enabled !== 'boolean') throw new Error('Choose whether the control is enabled.');
    const control = body.control as EmailControl;
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (reason.length < 8 || reason.length > 500) throw new Error('Provide an 8–500 character operational reason.');
    const expectedConfirmation = `${body.enabled ? 'ENABLE' : 'DISABLE'} ${CONTROLS[control]}`;
    if (body.confirmation !== expectedConfirmation) throw new Error(`Type ${expectedConfirmation} exactly.`);
    const configuration = emailConfigurationPresence();
    if (body.enabled && control === 'delivery_enabled'
      && !(configuration.resendApiKey && configuration.cronSecret && configuration.webhookSecret)) {
      throw new Error('Application delivery requires the Resend key, worker secret, and webhook secret.');
    }
    if (body.enabled && control === 'newsletter_sync_enabled'
      && !(configuration.resendApiKey && configuration.cronSecret && configuration.webhookSecret && configuration.newsletterTopic)) {
      throw new Error('Newsletter synchronization requires the Resend key, worker secret, webhook secret, and reviewed Topic.');
    }
    const result = await authenticatedClient(request).rpc('set_email_delivery_control' as never, {
      target_control: control,
      target_enabled: body.enabled,
      target_reason: reason,
    } as never);
    if (result.error) throw result.error;
    return Response.json({ controls: result.data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return responseError(error);
  }
}
