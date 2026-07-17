import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
  createPendingPrintfulProduct,
  listPrintfulCatalogProducts,
  verifyPrintfulConnection,
} from '@/lib/server/printful';

function loadFile(path: string) {
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
if (!process.argv.includes('--confirm-local-only')) {
  throw new Error('Refusing catalog import without --confirm-local-only.');
}

async function main() {
const local = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' })) as {
  API_URL: string;
  SERVICE_ROLE_KEY: string;
};
if (!['127.0.0.1', 'localhost'].includes(new URL(local.API_URL).hostname)) {
  throw new Error('Catalog import is restricted to disposable local Supabase.');
}
process.env.NEXT_PUBLIC_SUPABASE_URL = local.API_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = local.SERVICE_ROLE_KEY;
process.env.NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE = 'false';

const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let seller = await admin.from('commerce_runtime_controls')
  .select('platform_seller_id').eq('singleton', true).single();
if (seller.error) throw seller.error;
let operatorId = seller.data.platform_seller_id;
if (!operatorId) {
  const created = await admin.auth.admin.createUser({
    email: 'local-printful-operator@example.test',
    password: randomBytes(24).toString('base64url'),
    email_confirm: true,
    user_metadata: { username: 'local_printful_operator' },
  });
  if (created.error) throw created.error;
  operatorId = created.data.user.id;
  const profile = await admin.from('profiles').update({
    role: 'admin',
    display_name: 'Local Printful Operator',
  }).eq('id', operatorId);
  if (profile.error) throw profile.error;
  const controls = await admin.from('commerce_runtime_controls')
    .update({ platform_seller_id: operatorId }).eq('singleton', true);
  if (controls.error) throw controls.error;
  seller = await admin.from('commerce_runtime_controls')
    .select('platform_seller_id').eq('singleton', true).single();
  if (seller.error || seller.data.platform_seller_id !== operatorId) {
    throw new Error('Local platform seller could not be established.');
  }
}

const provider = await verifyPrintfulConnection();
const printfulControls = await admin.from('printful_runtime_controls').update({
  store_id: provider.storeId,
  provider_connected: true,
  catalog_import_enabled: true,
  shipping_quotes_enabled: true,
  draft_orders_enabled: true,
  confirmation_enabled: false,
  verified_at: new Date().toISOString(),
  approved_by: operatorId,
}).eq('singleton', true);
if (printfulControls.error) throw printfulControls.error;

const [providerProducts, existingMappings] = await Promise.all([
  listPrintfulCatalogProducts(),
  admin.from('printful_product_mappings').select('sync_product_id,item_id'),
]);
if (existingMappings.error) throw existingMappings.error;
const existingByProvider = new Map(existingMappings.data.map(mapping => [Number(mapping.sync_product_id), mapping.item_id]));
const results: Array<{ name: string; itemId: string; status: string }> = [];
for (const product of providerProducts) {
  if (product.ignored) continue;
  const existingItemId = existingByProvider.get(product.syncProductId);
  if (existingItemId) {
    results.push({ name: product.name, itemId: existingItemId, status: 'already pending' });
    continue;
  }
  const imported = await createPendingPrintfulProduct(product.syncProductId);
  results.push({ name: product.name, itemId: imported.itemId, status: imported.status });
}

const localMerch = await admin.from('catalog_items')
  .select('id,title,status,price_cents')
  .eq('experience_type', 'merch')
  .order('title');
if (localMerch.error) throw localMerch.error;
if (localMerch.data.length !== providerProducts.filter(product => !product.ignored).length) {
  throw new Error('Local pending catalog count does not match the active Printful catalog.');
}

console.log(JSON.stringify({
  database: 'local only',
  providerWrites: 0,
  publicPurchases: false,
  confirmationEnabled: false,
  imported: results,
}, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Local Printful catalog import failed.');
  process.exitCode = 1;
});
