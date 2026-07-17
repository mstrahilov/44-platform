import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { EMAIL_TEMPLATE_VERSIONS, type EmailTemplateKey } from '../src/emails/contracts';
import { EMAIL_PREVIEW_FIXTURES } from '../src/emails/fixtures';
import { renderEmail } from '../src/emails/render';

async function main() {
  const keys = Object.keys(EMAIL_TEMPLATE_VERSIONS) as EmailTemplateKey[];
  assert.deepEqual(keys.sort(), ['fulfillment_tracking','purchase_confirmation','refund_cancellation','support_acknowledgement','welcome']);

  for (const key of keys) {
    const rendered = await renderEmail(key, EMAIL_PREVIEW_FIXTURES[key] as never);
    assert.ok(rendered.subject.length >= 3, `${key} has a subject`);
    assert.ok(rendered.preview.length >= 3, `${key} has preview text`);
    assert.match(rendered.html, /^<!doctype html\b/i, `${key} renders a complete HTML document`);
    assert.match(rendered.html, /<meta charSet="utf-8"\/>/i, `${key} declares UTF-8 for non-ASCII names and punctuation`);
    assert.match(rendered.html, /name="color-scheme" content="light"/i, `${key} declares its reviewed light color scheme`);
    assert.match(rendered.html, /max-width:600px/, `${key} has the shared desktop-safe frame`);
    assert.match(rendered.html, /44OS/, `${key} is branded`);
    assert.ok(rendered.text.length >= 40, `${key} has explicit plain text`);
    assert.doesNotMatch(`${rendered.html}\n${rendered.text}`, /undefined|null@|SUPABASE|RESEND_API_KEY|STRIPE_SECRET/i, `${key} does not leak missing values or secret labels`);
    assert.doesNotMatch(rendered.html, /<script|javascript:/i, `${key} has no executable content`);
  }

  const purchase = await renderEmail('purchase_confirmation', EMAIL_PREVIEW_FIXTURES.purchase_confirmation);
  assert.match(purchase.text, /44 Hoodie/);
  assert.match(purchase.html, /1 × ØLSTEN — North Star/, 'receipt preserves reviewed Unicode item text');
  assert.match(purchase.text, /Total: \$116\.91/);
  const support = await renderEmail('support_acknowledgement', EMAIL_PREVIEW_FIXTURES.support_acknowledgement);
  assert.match(support.text, /support@44os\.com/);
  await assert.rejects(
    renderEmail('fulfillment_tracking', { ...EMAIL_PREVIEW_FIXTURES.fulfillment_tracking, trackingUrl: 'javascript:alert(1)' }),
    /valid HTTPS URL/,
    'provider-controlled tracking links fail closed unless they are HTTPS',
  );

  const authDirectory = path.join(process.cwd(), 'supabase', 'templates');
  const authTemplates = (await readdir(authDirectory)).filter(file => file.endsWith('.html')).sort();
  const requiredAuthTemplates: Record<string, RegExp> = {
    'confirmation.html': /\{\{ \.ConfirmationURL \}\}/,
    'email_change.html': /\{\{ \.ConfirmationURL \}\}[\s\S]*\{\{ \.NewEmail \}\}|\{\{ \.NewEmail \}\}[\s\S]*\{\{ \.ConfirmationURL \}\}/,
    'email_changed.html': /\{\{ \.OldEmail \}\}[\s\S]*\{\{ \.Email \}\}/,
    'invite.html': /\{\{ \.ConfirmationURL \}\}/,
    'magic_link.html': /\{\{ \.ConfirmationURL \}\}/,
    'password_changed.html': /\{\{ \.SiteURL \}\}\/account\/recovery/,
    'reauthentication.html': /\{\{ \.Token \}\}/,
    'recovery.html': /\{\{ \.ConfirmationURL \}\}/,
  };
  assert.deepEqual(authTemplates, Object.keys(requiredAuthTemplates).sort(), 'exactly eight reviewed Supabase Auth templates exist');

  for (const file of authTemplates) {
    const html = await readFile(path.join(authDirectory, file), 'utf8');
    assert.match(html, /^<!doctype html\b/i, `${file} renders a complete HTML document`);
    assert.match(html, /max-width:600px/, `${file} matches the shared desktop-safe frame`);
    assert.match(html, />44OS</, `${file} is branded`);
    assert.match(html, /mailto:support@44os\.com/, `${file} directs help to the monitored mailbox`);
    assert.match(html, requiredAuthTemplates[file], `${file} retains its required Supabase variable`);
    assert.doesNotMatch(html, /<script|javascript:|accounts@auth\.44os\.com|RESEND_|SUPABASE_/i, `${file} has no executable content, retired sender, or secret label`);
  }

  const localAuthConfig = await readFile(path.join(process.cwd(), 'supabase', 'config.toml'), 'utf8');
  assert.match(localAuthConfig, /otp_length = 8/, 'local Auth configuration matches the captured hosted 8-digit OTP policy');
  assert.match(localAuthConfig, /admin_email = "accounts@44os\.com"/, 'local SMTP target uses the reviewed root-domain Auth sender');

  const serverAdapter = await readFile(path.join(process.cwd(), 'src', 'lib', 'server', 'email.ts'), 'utf8');
  assert.match(serverAdapter, /^import 'server-only';/m, 'Resend adapter is server-only');
  assert.match(serverAdapter, /'Idempotency-Key': row\.event_key/, 'provider send uses the durable event key for idempotency');
  assert.match(serverAdapter, /ambiguous \|\| response\.status === 429/, 'only ambiguous failures and rate limits enter automatic provider retry');
  assert.match(serverAdapter, /target_retryable: providerError\.retryable/, 'provider retry classification reaches the durable outbox');
  assert.match(serverAdapter, /email_render_validation_failed[\s\S]*422, false, false/, 'deterministic template/payload failures freeze before any provider retry');
  assert.match(serverAdapter, /from: '44OS <support@44os\.com>'/, 'application mail uses the reviewed operational sender');
  assert.doesNotMatch(serverAdapter, /NEXT_PUBLIC_(?:RESEND|EMAIL)/, 'email provider secrets are never public variables');

  const emailMigration = await readFile(path.join(process.cwd(), 'supabase', 'migrations', '20260716034000_m13_email_system.sql'), 'utf8');
  assert.match(emailMigration, /delivery_enabled boolean not null default false/, 'application delivery defaults off');
  assert.match(emailMigration, /newsletter_sync_enabled boolean not null default false/, 'newsletter synchronization defaults off');
  assert.match(emailMigration, /target_ambiguous and now\(\)<created_at\+interval '23 hours'/, 'ambiguous provider retries stop before the idempotency window expires');
  assert.match(emailMigration, /recover_stale_application_email_claims/, 'interrupted provider claims have an explicit recovery path');
  assert.match(emailMigration, /stale_claim_reconciliation_required[\s\S]*'infinity'::timestamptz/, 'stale claims outside the provider idempotency window require reconciliation');
  assert.match(emailMigration, /create table public\.email_reconciliation_events/, 'manual ambiguous-send decisions have append-only evidence');
  assert.match(emailMigration, /create table public\.newsletter_contact_retirements/, 'old newsletter Contacts have a durable retirement queue');
  assert.match(emailMigration, /auth_users_rotate_newsletter_contact after update of email on auth\.users/, 'secure account email changes rotate the newsletter Contact');
  assert.match(emailMigration, /reconcile_application_email/, 'expired ambiguous sends have an administrator-only resolution path');
  assert.match(emailMigration, /target_ambiguous and now\(\)>=created_at\+interval '23 hours' then 'stale_claim_reconciliation_required'/, 'a final ambiguous provider failure enters the visible reconciliation queue');
  assert.match(emailMigration, /when not target_retryable then 'provider_rejection_review_required'[\s\S]*when not target_retryable then 'infinity'::timestamptz/, 'known provider rejections freeze instead of retrying forever');
  assert.match(emailMigration, /known provider rejection cannot be marked sent/i, 'known provider rejections cannot be misrepresented as delivery');
  assert.match(emailMigration, /target_resolution='retry_approved'[\s\S]*last_error_code='manual_retry_approved'/, 'only an explicit administrator decision releases a frozen event for retry');
  assert.match(emailMigration, /provider='printful'[\s\S]*signature_verified[\s\S]*processing_status='processed'/, 'fulfillment mail requires a processed verified Printful event');
  assert.match(emailMigration, /commerce_orders_queue_verified_email after update of status,paid_at,refunded_cents/, 'commerce mail is queued from authoritative order-state transitions');
  assert.match(emailMigration, /Support request rate limit exceeded/, 'durable support intake has a database-enforced abuse ceiling');

  const stripeWebhook = await readFile(path.join(process.cwd(), 'src', 'app', 'api', 'stripe', 'webhook', 'route.ts'), 'utf8');
  assert.ok(
    stripeWebhook.indexOf('webhooks.constructEvent') < stripeWebhook.indexOf("rpc('process_stripe_webhook_event'"),
    'Stripe signature verification precedes the authoritative payment-state transition',
  );
  const checkoutPage = await readFile(path.join(process.cwd(), 'src', 'app', 'checkout', 'page.tsx'), 'utf8');
  assert.doesNotMatch(checkoutPage, /\/api\/email|queue_(?:application|verified_commerce)_email/, 'browser checkout and success UI cannot enqueue receipts');

  const emailWebhook = await readFile(path.join(process.cwd(), 'src', 'app', 'api', 'email', 'webhook', 'route.ts'), 'utf8');
  assert.doesNotMatch(emailWebhook, /email\.(?:opened|clicked|received)/, 'tracking and inbound-receiving events are not handled');
  assert.match(emailWebhook, /new Webhook\(resendWebhookSecret\(\)\)\.verify/, 'Resend events require raw-body signature verification');
  const emailWorkerRoute = await readFile(path.join(process.cwd(), 'src', 'app', 'api', 'email', 'process', 'route.ts'), 'utf8');
  assert.match(emailWorkerRoute, /newsletterError/, 'worker response exposes a sanitized newsletter-sync failure signal');
  assert.match(serverAdapter, /stale_sync_claim_recovered/, 'interrupted newsletter synchronization claims are recoverable');
  assert.ok(
    serverAdapter.indexOf('processNewsletterContactRetirements(admin, topicId, limit)')
      < serverAdapter.indexOf("from('newsletter_consents' as never).select"),
    'old provider Contacts are retired before explicit consent moves to a replacement address',
  );
  assert.match(serverAdapter, /subscription: 'opt_out'/, 'retired newsletter Contacts are explicitly opted out of the Topic');
  assert.match(serverAdapter, /blockedUsers\.has\(row\.user_id\)/, 'an unresolved old Contact blocks synchronization to the replacement address');
  assert.match(serverAdapter, /activeConsentClaim[\s\S]*if \(activeConsentClaim\.data\) continue/, 'old-Contact retirement waits for an in-flight consent sync');
  assert.match(serverAdapter, /\.eq\('email_normalized', row\.email_normalized\)[\s\S]*\.eq\('sync_claimed_at', claimTime\)/, 'a stale provider result cannot complete a replacement-address consent row');
  assert.match(serverAdapter, /newsletter_sync_enabled\) return \[\]/, 'an intentionally disabled newsletter control is a clean worker no-op');

  const newsletterRoute = await readFile(path.join(process.cwd(), 'src', 'app', 'api', 'email', 'newsletter', 'route.ts'), 'utf8');
  assert.match(newsletterRoute, /typeof body\.subscribed !== 'boolean'/, 'newsletter preference requires an explicit boolean choice');
  assert.match(newsletterRoute, /target_source: 'settings'/, 'self-service consent records its explicit source');

  const supportPage = await readFile(path.join(process.cwd(), 'src', 'app', 'support', 'page.tsx'), 'utf8');
  assert.match(supportPage, /fetch\('\/api\/email\/support'/, 'signed-in Support intake reaches the durable support-case API');
  assert.match(supportPage, /mailto:support@44os\.com/, 'signed-out Support retains the monitored mailbox fallback');

  const emailOperationsRoute = await readFile(path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'email', 'operations', 'route.ts'), 'utf8');
  assert.match(emailOperationsRoute, /set_email_delivery_control/, 'owner-facing activation uses the audited database control function');
  assert.match(emailOperationsRoute, /body\.confirmation !== expectedConfirmation/, 'activation requires an exact typed confirmation');
  assert.match(emailOperationsRoute, /configuration\.resendApiKey && configuration\.cronSecret && configuration\.webhookSecret/, 'delivery activation requires all provider/worker/webhook credentials');
  assert.match(emailOperationsRoute, /configuration\.newsletterTopic/, 'newsletter activation also requires the reviewed Topic');
  assert.match(emailOperationsRoute, /reconcile_application_email/, 'owner-facing reconciliation uses the audited database function');
  assert.match(emailOperationsRoute, /provider_rejection_review_required/, 'owner-facing reconciliation includes known provider rejections');
  assert.match(emailOperationsRoute, /MARK EMAIL SENT[\s\S]*RETRY EMAIL[\s\S]*SUPPRESS EMAIL/, 'every reconciliation outcome requires its own exact typed phrase');
  assert.match(emailOperationsRoute, /resolution === 'provider_sent' && !providerMessageId/, 'marking sent requires Resend message evidence');
  assert.doesNotMatch(emailOperationsRoute, /return Response\.json\([^)]*(?:RESEND_API_KEY|EMAIL_CRON_SECRET|RESEND_WEBHOOK_SECRET)/, 'operations API never returns secret values');
  const emailOperationsPage = await readFile(path.join(process.cwd(), 'src', 'app', 'admin', 'email', 'page.tsx'), 'utf8');
  assert.match(emailOperationsPage, /All controls begin off/, 'Admin Email explains the fail-closed activation boundary');
  assert.match(emailOperationsPage, /Inspect the Resend email log/, 'Admin Email requires provider inspection before ambiguous-send resolution');
  assert.match(emailOperationsPage, /Neither retries automatically/, 'Admin Email explains that frozen failures never retry automatically');
  assert.match(emailOperationsPage, /Append-only activation history/, 'Admin Email exposes durable control-change history');

  console.log(`Email contract passed for ${keys.length} versioned application templates and ${authTemplates.length} branded Supabase Auth templates.`);
}

void main();
