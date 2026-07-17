import { Webhook } from 'svix';
import { commerceAdminClient } from '@/lib/server/commerce';
import { reconcileResendNewsletterPreference, resendWebhookSecret } from '@/lib/server/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ResendEvent = { type?: string; created_at?: string; data?: Record<string, unknown> };
const HANDLED = new Set(['email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed','email.suppressed','contact.updated']);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const id = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');
  if (!id || !timestamp || !signature) return Response.json({ error: 'Webhook signature is required.' }, { status: 400 });
  let event: ResendEvent;
  try {
    event = new Webhook(resendWebhookSecret()).verify(rawBody, { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': signature }) as ResendEvent;
  } catch {
    return Response.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }
  if (!event.type || !HANDLED.has(event.type)) return Response.json({ received: true, ignored: true });
  const data = event.data ?? {};
  const recipients = Array.isArray(data.to) ? data.to.filter((value): value is string => typeof value === 'string') : [];
  const recipient = recipients[0] ?? (typeof data.email === 'string' ? data.email : '');
  const bounce = data.bounce && typeof data.bounce === 'object' ? data.bounce as Record<string, unknown> : {};
  const failureClass = event.type === 'email.complained' ? 'complaint'
    : event.type === 'email.bounced' ? (bounce.type === 'Permanent' ? 'hard_bounce' : 'transient')
      : event.type === 'email.failed' ? 'provider_rejection'
        : event.type === 'email.suppressed' ? 'hard_bounce' : null;
  const admin = commerceAdminClient();
  const recorded = await admin.rpc('record_email_provider_event' as never, {
    target_provider_event_id: id, target_event_type: event.type,
    target_provider_message_id: typeof data.email_id === 'string' ? data.email_id : null,
    target_occurred_at: event.created_at ?? null, target_failure_class: failureClass,
    target_recipient_email: recipient,
    target_metadata: { bounceType: typeof bounce.type === 'string' ? bounce.type : null, bounceSubType: typeof bounce.subType === 'string' ? bounce.subType : null },
  } as never);
  if (recorded.error) return Response.json({ received: true, processed: false }, { status: 500 });
  if (event.type === 'contact.updated' && recipient) {
    const contactId = typeof data.id === 'string' ? data.id : '';
    try {
      const preference = await reconcileResendNewsletterPreference(contactId, recipient, data.unsubscribed === true);
      if (preference === 'unsubscribed') {
        const unsubscribe = await admin.rpc('apply_newsletter_provider_unsubscribe' as never, {
          target_email: recipient,
          target_provider_contact_id: contactId || null,
        } as never);
        if (unsubscribe.error) return Response.json({ received: true, processed: false }, { status: 500 });
      }
    } catch {
      return Response.json({ received: true, processed: false }, { status: 500 });
    }
  }
  return Response.json({ received: true, processed: true });
}
