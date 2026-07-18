import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [analytics, consent, config, layout, privacy, envExample] = await Promise.all([
  readFile(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/AnalyticsConsent.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/analyticsConfig.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/layout.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/legal/privacy/page.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../.env.example', import.meta.url), 'utf8'),
]);

for (const event of ['page_view','view_item','select_item','add_to_cart','remove_from_cart','begin_checkout','content_engagement']) {
  assert.match(analytics, new RegExp(`\\b${event}:`), `typed browser contract includes ${event}`);
}
assert.match(analytics, /VerifiedCommerceAnalyticsEvent[\s\S]*name: 'purchase'[\s\S]*verification: 'signed_webhook'/, 'purchase remains signed-webhook authoritative');
assert.match(analytics, /VerifiedCommerceAnalyticsEvent[\s\S]*name: 'refund'[\s\S]*verification: 'signed_webhook'/, 'refund remains signed-webhook authoritative');
assert.doesNotMatch(analytics, /gtag\('event',\s*'(?:purchase|refund)'/, 'browser emitter never claims purchase or refund truth');
assert.match(analytics, /page_path: pagePath/, 'page paths are sanitized before emission');
assert.match(analytics, /const safePayload = sanitizeEventPayload/, 'runtime event payloads are allowlisted');

for (const consentType of ['analytics_storage','ad_storage','ad_user_data','ad_personalization']) {
  assert.match(consent, new RegExp(`${consentType}: 'denied'`), `${consentType} defaults denied`);
}
assert.match(consent, /if \(!measurementId \|\| consent !== 'unset'\) return null/, 'banner and tag stay absent without configuration or after a choice');
assert.match(consent, /if \(!measurementId\) return/, 'tag loader fails closed without a measurement ID');
assert.match(consent, /allow_google_signals: false/, 'Google signals remain disabled');
assert.match(consent, /allow_ad_personalization_signals: false/, 'ad personalization signals remain disabled');
assert.match(consent, /name === '_ga' \|\| name\.startsWith\('_ga_'\)/, 'revocation removes accessible analytics cookies');
assert.match(config, /\^G-\[A-Z0-9\]\{4,20\}\$/, 'only a valid GA4 measurement ID activates the boundary');
assert.match(layout, /AnalyticsConsentBoundary measurementId=\{analyticsMeasurementId\}/, 'root layout owns one consent boundary');
assert.match(privacy, /AnalyticsPrivacyControls measurementId=\{analyticsMeasurementId\}/, 'Privacy exposes a durable preference control');
assert.match(privacy, /We do not send your[\s\S]*email address[\s\S]*private messages[\s\S]*Creator tax information/, 'Privacy records excluded direct and sensitive data');
assert.match(envExample, /NEXT_PUBLIC_GA_MEASUREMENT_ID=\s*$/m, 'analytics configuration defaults empty');

console.log('Analytics consent and event contract passed.');
