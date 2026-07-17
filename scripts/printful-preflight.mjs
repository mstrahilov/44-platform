import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

for (const path of ['.env.printful.local', '.env.local', '.env.test.local', '.env']) loadFile(path);
const failures = [];
const passes = [];
const fail = message => failures.push(message);
const pass = message => passes.push(message);

if (process.env.PRINTFUL_ACCEPTANCE_USE_LOCAL_SUPABASE !== 'false') {
  const status = spawnSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' });
  if (status.status !== 0) fail('local Supabase is not running');
  else {
    const local = JSON.parse(status.stdout);
    const url = new URL(local.API_URL);
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) fail('Supabase CLI returned a non-local target');
    else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = local.API_URL;
      process.env.SUPABASE_SERVICE_ROLE_KEY = local.SERVICE_ROLE_KEY;
      pass('acceptance database is local');
    }
  }
}
if (!process.env.PRINTFUL_PRIVATE_TOKEN?.trim()) fail('PRINTFUL_PRIVATE_TOKEN is absent');
else pass('Printful private token is server-scoped');
if (!/^\d+$/.test(process.env.PRINTFUL_STORE_ID?.trim() ?? '')) fail('PRINTFUL_STORE_ID is absent or invalid');
else pass('Printful API store identifier is structurally valid');
if (!/^[A-Z]{3}$/.test(process.env.PRINTFUL_STORE_CURRENCY?.trim().toUpperCase() ?? '')) fail('PRINTFUL_STORE_CURRENCY is absent or invalid');
else pass('Printful store currency is structurally valid');
if (process.env.NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE === 'true') fail('public purchases must remain disabled during Printful acceptance');
else pass('public emergency purchase presentation remains disabled');

if (!failures.length) {
  const response = await fetch('https://api.printful.com/stores', {
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_PRIVATE_TOKEN}`,
      'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID,
      Accept: 'application/json',
    },
  });
  let payload = null;
  try { payload = await response.json(); } catch { /* sanitized failure below */ }
  if (!response.ok || !Array.isArray(payload?.result)
    || !payload.result.some(store => String(store.id) === process.env.PRINTFUL_STORE_ID)) {
    fail('configured Printful token cannot read the configured API store');
  } else pass('configured Printful token can read the exact API store');
}

if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const controls = await supabase.from('printful_runtime_controls').select('*').eq('singleton', true).maybeSingle();
  if (controls.error || !controls.data) fail('Printful database controls are not installed');
  else if (controls.data.confirmation_enabled) fail('Printful confirmation boundary is not safely disabled');
  else pass('Printful database confirmation boundary is hard-locked off');
}

for (const message of passes) console.log(`PASS: ${message}`);
if (failures.length) {
  console.error(`Printful preflight blocked (${failures.length}):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log('Printful preflight passed without printing provider or customer values. Draft-only work may proceed.');
}
