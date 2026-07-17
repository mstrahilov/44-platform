import { spawn } from 'node:child_process';
import { loadStripeSandboxEnvironment } from './stripe-sandbox-environment.mjs';

const { useLocalSupabase } = loadStripeSandboxEnvironment();
if (!useLocalSupabase) throw new Error('The sandbox dev command is restricted to local Supabase.');
for (const name of ['STRIPE_SECRET_KEY', 'STRIPE_BOOK_TAX_CODE', 'STRIPE_MUSIC_TAX_CODE', 'STRIPE_SAMPLE_PACK_TAX_CODE']) {
  if (!process.env[name]?.trim()) throw new Error(`${name} is required in .env.stripe-sandbox.local.`);
}
if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) throw new Error('The sandbox dev command requires a Stripe test-mode secret.');

const handledEvents = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
  'payment_intent.payment_failed',
  'charge.refunded',
  'refund.created',
  'charge.dispute.created',
  'charge.dispute.closed',
  'charge.dispute.funds_reinstated',
  'account.updated',
];

let app;
let shuttingDown = false;
let listenerReady = false;

const listener = spawn('stripe', [
  'listen',
  '--events', handledEvents.join(','),
  '--forward-to', 'http://127.0.0.1:3000/api/stripe/webhook',
  '--skip-update',
  '--color', 'off',
], {
  env: { ...process.env, STRIPE_API_KEY: process.env.STRIPE_SECRET_KEY },
  stdio: ['ignore', 'pipe', 'pipe'],
});

function stop(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (app && !app.killed) app.kill('SIGTERM');
  if (!listener.killed) listener.kill('SIGTERM');
  setTimeout(() => process.exit(exitCode), 250).unref();
}

function startApp(webhookSecret) {
  if (listenerReady) return;
  listenerReady = true;
  console.log('Stripe sandbox webhook listener connected with an ephemeral signing secret.');
  app = spawn(process.execPath, ['./node_modules/next/dist/bin/next', 'dev'], {
    env: {
      ...process.env,
      STRIPE_WEBHOOK_SECRET: webhookSecret,
      STRIPE_AUTOMATIC_TAX_ENABLED: 'true',
      NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE: 'true',
    },
    stdio: 'inherit',
  });
  app.on('error', () => stop(1));
  app.on('exit', code => stop(code ?? 1));
}

function inspectListenerOutput(chunk) {
  const output = chunk.toString();
  const secret = output.match(/whsec_[A-Za-z0-9]+/)?.[0];
  if (secret) startApp(secret);
  if (/\b(error|failed|unauthorized|invalid)\b/i.test(output)) {
    const sanitized = output
      .replace(/whsec_[A-Za-z0-9]+/g, '[webhook secret]')
      .replace(/sk_(?:test|live)_[A-Za-z0-9]+/g, '[Stripe key]')
      .trim();
    if (sanitized) console.error(`Stripe listener: ${sanitized}`);
  }
}

listener.stdout.on('data', inspectListenerOutput);
listener.stderr.on('data', inspectListenerOutput);
listener.on('error', () => {
  console.error('Stripe CLI could not start.');
  stop(1);
});
listener.on('exit', code => {
  if (!shuttingDown) {
    console.error(listenerReady ? 'Stripe sandbox webhook listener stopped.' : 'Stripe sandbox webhook listener could not connect.');
    stop(code ?? 1);
  }
});

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
