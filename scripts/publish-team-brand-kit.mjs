import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();
assert.ok(process.argv.includes('--confirm-production-write'), 'Production Brand Kit publication requires --confirm-production-write.');

const version = '1.0';
const filename = `forty-four-brand-kit-${version}.zip`;
const storagePath = `brand-kits/${version}/${filename}`;
const archivePath = path.join(root, 'artifacts', 'team-brand-kit', filename);
const projectRef = (await readFile(path.join(root, 'supabase', '.temp', 'project-ref'), 'utf8')).trim();
assert.match(projectRef, /^[a-z0-9]{20}$/, 'The linked Supabase project ref is invalid.');

const keyResult = spawnSync('npx', [
  'supabase', 'projects', 'api-keys', '--project-ref', projectRef, '--reveal', '--output', 'json',
], { cwd: root, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
if (keyResult.status !== 0) throw new Error(keyResult.stderr || 'The linked Supabase API keys could not be read.');
const keys = JSON.parse(keyResult.stdout);
const serviceKey = keys.find(key => key.name === 'service_role' && key.type === 'legacy')?.api_key
  ?? keys.find(key => key.type === 'secret')?.api_key;
assert.ok(typeof serviceKey === 'string' && serviceKey.length > 20, 'A production service key was not available.');

const archive = await readFile(archivePath);
const checksum = createHash('sha256').update(archive).digest('hex');
const admin = createClient(`https://${projectRef}.supabase.co`, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let creator = await admin.from('profiles').select('id,username').eq('role', 'admin').eq('username', 'olsten44').maybeSingle();
if (creator.error) throw creator.error;
if (!creator.data) creator = await admin.from('profiles').select('id,username').eq('role', 'admin').order('created_at').limit(1).maybeSingle();
if (creator.error || !creator.data) throw creator.error ?? new Error('An Administrator profile is required to register the Brand Kit.');

const existing = await admin.from('team_brand_kits').select('id,checksum_sha256,storage_path').eq('version', version).maybeSingle();
if (existing.error) throw existing.error;
if (existing.data && (existing.data.checksum_sha256 !== checksum || existing.data.storage_path !== storagePath)) {
  throw new Error(`Brand Kit ${version} is already registered with different content. Publish a new version instead.`);
}

const upload = await admin.storage.from('team-brand').upload(storagePath, archive, {
  contentType: 'application/zip', cacheControl: '3600', upsert: Boolean(existing.data),
});
if (upload.error) throw upload.error;
const stored = await admin.storage.from('team-brand').download(storagePath);
if (stored.error) throw stored.error;
const storedChecksum = createHash('sha256').update(Buffer.from(await stored.data.arrayBuffer())).digest('hex');
assert.equal(storedChecksum, checksum, 'The private stored archive failed checksum verification.');

const unset = await admin.from('team_brand_kits').update({ is_current: false }).eq('is_current', true).neq('version', version);
if (unset.error) throw unset.error;
const row = {
  version,
  filename,
  storage_path: storagePath,
  checksum_sha256: checksum,
  byte_size: archive.length,
  contents: ['logos', '44os-icons', 'fonts/inter', 'tokens', 'LOGO-USAGE.md', 'README.md', 'manifest-sha256.json'],
  is_current: true,
  created_by: creator.data.id,
};
const registered = existing.data
  ? await admin.from('team_brand_kits').update({ ...row, created_by: creator.data.id }).eq('id', existing.data.id).select('version,filename,checksum_sha256,byte_size,is_current').single()
  : await admin.from('team_brand_kits').insert(row).select('version,filename,checksum_sha256,byte_size,is_current').single();
if (registered.error) throw registered.error;

console.log(JSON.stringify({
  projectRef,
  registeredBy: creator.data.username ?? 'Administrator',
  storagePath,
  ...registered.data,
  checksumVerified: true,
}, null, 2));
