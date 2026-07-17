import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

export const STRIPE_SANDBOX_STATE_PATH = '.stripe-sandbox-state.json';

function parseEnvironmentFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

function readState() {
  if (!existsSync(STRIPE_SANDBOX_STATE_PATH)) return null;
  try {
    const state = JSON.parse(readFileSync(STRIPE_SANDBOX_STATE_PATH, 'utf8'));
    return state && typeof state === 'object' ? state : null;
  } catch {
    throw new Error(`${STRIPE_SANDBOX_STATE_PATH} is not valid JSON.`);
  }
}

export function loadStripeSandboxEnvironment() {
  for (const path of ['.env.stripe-sandbox.local', '.env.local', '.env.test.local', '.env']) parseEnvironmentFile(path);
  const useLocalSupabase = process.env.STRIPE_ACCEPTANCE_USE_LOCAL_SUPABASE !== 'false';
  if (useLocalSupabase) {
    const statusResult = spawnSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' });
    if (statusResult.status !== 0) throw new Error('Local Supabase is not running.');
    const status = JSON.parse(statusResult.stdout);
    const apiUrl = new URL(status.API_URL);
    if (!['localhost', '127.0.0.1'].includes(apiUrl.hostname)) throw new Error('Supabase CLI returned a non-local API URL.');
    process.env.NEXT_PUBLIC_SUPABASE_URL = status.API_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = status.ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = status.SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
    process.env.STRIPE_ACCEPTANCE_ALLOW_REMOTE = 'false';
  }
  const state = readState();
  if (state?.buyerId && !process.env.STRIPE_ACCEPTANCE_BUYER_ID) process.env.STRIPE_ACCEPTANCE_BUYER_ID = state.buyerId;
  if (state?.itemId && !process.env.STRIPE_ACCEPTANCE_ITEM_ID) process.env.STRIPE_ACCEPTANCE_ITEM_ID = state.itemId;
  if (state?.sessionId && !process.env.STRIPE_ACCEPTANCE_SESSION_ID) process.env.STRIPE_ACCEPTANCE_SESSION_ID = state.sessionId;
  return { state, useLocalSupabase };
}
