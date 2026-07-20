import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

async function loadEnvironment() {
  for (const file of ['.env.local', '.env']) {
    try {
      for (const line of (await readFile(file, 'utf8')).split(/\r?\n/)) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!match || process.env[match[1]]) continue;
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
        process.env[match[1]] = value;
      }
    } catch { /* explicit environment variables remain supported */ }
  }
}
await loadEnvironment();

const args = new Set(process.argv.slice(2));
const manifestIndex = process.argv.indexOf('--manifest');
const manifestPath = resolve(manifestIndex >= 0 ? process.argv[manifestIndex + 1] : '/tmp/44os-audio-inventory.json');
const applyRepairs = args.has('--apply-repairs');
const register = args.has('--register');
const quarantineOrphans = args.has('--quarantine-orphans');
const confirmedWrite = args.has('--confirm-production-write');
if ((applyRepairs || register || quarantineOrphans) && !confirmedWrite) throw new Error('Production writes require --confirm-production-write. Inventory mode is read-only by default.');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !serviceKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const currentOrigin = new URL(supabaseUrl).origin;

async function listTree(bucket, prefix) {
  const output = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const result = await admin.storage.from(bucket).list(prefix, { limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } });
    if (result.error) throw result.error;
    const entries = result.data ?? [];
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) output.push({ path, size: Number(entry.metadata?.size ?? 0), contentType: String(entry.metadata?.mimetype ?? 'application/octet-stream'), createdAt: entry.created_at });
      else output.push(...await listTree(bucket, path));
    }
    if (entries.length < pageSize) break;
  }
  return output;
}

function currentUploadPath(url) {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== currentOrigin) return null;
    const marker = '/storage/v1/object/public/uploads/';
    const index = parsed.pathname.indexOf(marker);
    return index < 0 ? null : decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch { return null; }
}

async function loadAllAudioReferencePaths() {
  const [tracksResult, submissionTracksResult, assetsResult, submissionAssetsResult, sampleFilesResult] = await Promise.all([
    admin.from('tracks').select('audio_url,download_url'),
    admin.from('item_submission_tracks').select('audio_url,download_url'),
    admin.from('item_assets').select('file_url,storage_path'),
    admin.from('item_submission_assets').select('file_url,storage_path'),
    admin.from('sample_pack_files').select('preview_url'),
  ]);
  const error = tracksResult.error || submissionTracksResult.error || assetsResult.error || submissionAssetsResult.error || sampleFilesResult.error;
  if (error) throw error;
  const values = [
    ...(tracksResult.data ?? []).flatMap(row => [row.audio_url, row.download_url]),
    ...(submissionTracksResult.data ?? []).flatMap(row => [row.audio_url, row.download_url]),
    ...(assetsResult.data ?? []).flatMap(row => [row.file_url, row.storage_path]),
    ...(submissionAssetsResult.data ?? []).flatMap(row => [row.file_url, row.storage_path]),
    ...(sampleFilesResult.data ?? []).map(row => row.preview_url),
  ];
  return new Set(values.flatMap(value => {
    if (!value) return [];
    if (value.startsWith('tracks/audio/')) return [value];
    const parsed = currentUploadPath(value);
    return parsed ? [parsed] : [];
  }));
}

const [categoryResult, itemResult, trackResult, storedAudio] = await Promise.all([
  admin.from('item_categories').select('id').eq('slug', 'music').single(),
  admin.from('catalog_items').select('id,title,creator,status,download_purchase_enabled,item_category_id,author_id'),
  admin.from('tracks').select('id,item_id,title,number,duration_seconds,audio_url'),
  listTree('uploads', 'tracks/audio'),
]);
if (categoryResult.error || itemResult.error || trackResult.error) throw categoryResult.error || itemResult.error || trackResult.error;
const musicId = categoryResult.data.id;
const items = (itemResult.data ?? []).filter(item => item.item_category_id === musicId);
const itemById = new Map(items.map(item => [item.id, item]));
const tracks = (trackResult.data ?? []).filter(track => itemById.has(track.item_id));
const storedByPath = new Map(storedAudio.map(object => [object.path, object]));

const repairs = new Map([
  ['touch (feat. Kholor)', 'tracks/audio/1b902d98-d636-41e4-a7be-dae020240f4c/1783191107348-01-touch-feat.-kholor-.mp3'],
  ['Where You At?', 'tracks/audio/9350ba18-691b-4755-841f-15bd4c226b17/tellali-discography/07. Where You At'],
]);
const trackRows = tracks.map(track => {
  const normalPath = currentUploadPath(track.audio_url);
  const repairPath = repairs.get(track.title);
  const storagePath = storedByPath.has(normalPath) ? normalPath : repairPath && storedByPath.has(repairPath) ? repairPath : null;
  const stored = storagePath ? storedByPath.get(storagePath) : null;
  return { ...track, release: itemById.get(track.item_id), storagePath, stored, requiresRepair: Boolean(repairPath && storagePath === repairPath && normalPath !== repairPath) };
});
const referenced = await loadAllAudioReferencePaths();
for (const track of trackRows) if (track.storagePath) referenced.add(track.storagePath);
const orphanCandidates = storedAudio.filter(object => object.size > 0 && !referenced.has(object.path));
const byType = rows => rows.reduce((result, row) => {
  const type = row.stored?.contentType ?? row.contentType ?? 'unknown';
  result[type] ??= { count: 0, bytes: 0 };
  result[type].count += 1;
  result[type].bytes += Number(row.stored?.size ?? row.size ?? 0);
  return result;
}, {});
const manifest = {
  version: '2026-07-20-v1',
  generatedAt: new Date().toISOString(),
  sourceProjectOrigin: currentOrigin,
  releases: { total: items.length, published: items.filter(item => item.status === 'published').length, archived: items.filter(item => item.status === 'archived').length },
  tracks: { total: trackRows.length, formats: byType(trackRows), missingStoredObject: trackRows.filter(track => !track.stored).map(track => ({ trackId: track.id, title: track.title, release: track.release.title })) },
  repairs: trackRows.filter(track => track.requiresRepair).map(track => ({ trackId: track.id, title: track.title, release: track.release.title, storagePath: track.storagePath, durationSeconds: track.duration_seconds, byteSize: track.stored.size })),
  orphanCandidates: { count: orphanCandidates.length, bytes: orphanCandidates.reduce((sum, object) => sum + object.size, 0), formats: byType(orphanCandidates), objects: orphanCandidates },
};
const canonical = JSON.stringify(manifest, null, 2);
const manifestSha256 = createHash('sha256').update(canonical).digest('hex');
await writeFile(manifestPath, `${canonical}\n`);

let repairedCount = 0;
if (applyRepairs) {
  for (const track of trackRows.filter(row => row.requiresRepair)) {
    const publicUrl = admin.storage.from('uploads').getPublicUrl(track.storagePath).data.publicUrl;
    const updated = await admin.from('tracks').update({ audio_url: publicUrl }).eq('id', track.id);
    if (updated.error) throw updated.error;
    repairedCount += 1;
  }
}

let registeredCount = 0;
let queuedWavs = 0;
if (register) {
  for (const track of trackRows.filter(row => row.stored)) {
    const contentType = track.stored.contentType;
    const isMp3 = contentType === 'audio/mpeg' || contentType === 'audio/mp3';
    const existing = await admin.from('audio_assets').select('id').eq('track_id', track.id).maybeSingle();
    if (existing.error) throw existing.error;
    const assetId = existing.data?.id ?? randomUUID();
    const streamUrl = track.requiresRepair ? admin.storage.from('uploads').getPublicUrl(track.storagePath).data.publicUrl : track.audio_url;
    const retentionMode = isMp3 ? 'legacy_public' : track.release.download_purchase_enabled ? 'retain' : 'cleanup_after_grace';
    const payload = {
      id: assetId, owner_id: track.release.author_id, track_id: track.id,
      status: isMp3 ? 'ready' : 'uploaded', source_bucket: 'uploads', source_path: track.storagePath,
      original_filename: basename(track.storagePath).includes('.') ? basename(track.storagePath) : `${track.title}.mp3`,
      source_content_type: contentType, source_byte_size: track.stored.size,
      stream_bucket: isMp3 ? 'uploads' : null, stream_path: isMp3 ? track.storagePath : null,
      stream_public_url: isMp3 ? streamUrl : null, stream_content_type: isMp3 ? 'audio/mpeg' : null,
      stream_byte_size: isMp3 ? track.stored.size : null, stream_bitrate_kbps: isMp3 ? 320 : null,
      stream_duration_seconds: isMp3 ? track.duration_seconds : null, retention_mode: retentionMode,
      retain_reason: track.release.download_purchase_enabled ? 'paid_download_enabled' : null,
      legacy_audio_url: track.audio_url, ready_at: isMp3 ? new Date().toISOString() : null,
    };
    const saved = await admin.from('audio_assets').upsert(payload, { onConflict: 'id' });
    if (saved.error) throw saved.error;
    if (!isMp3) {
      const queued = await admin.from('audio_processing_jobs').upsert({ audio_asset_id: assetId }, { onConflict: 'audio_asset_id', ignoreDuplicates: true });
      if (queued.error) throw queued.error;
      queuedWavs += 1;
    }
    registeredCount += 1;
  }
}

let quarantinedCount = 0;
if (quarantineOrphans) {
  for (const object of orphanCandidates) {
    // Recheck the live track table immediately before each copy/removal. A new
    // reference aborts the candidate instead of racing with a creator edit.
    const latestReferences = await loadAllAudioReferencePaths();
    if (latestReferences.has(object.path)) continue;
    const downloaded = await admin.storage.from('uploads').download(object.path);
    if (downloaded.error || !downloaded.data) throw downloaded.error ?? new Error('Could not read an orphan candidate.');
    const bytes = Buffer.from(await downloaded.data.arrayBuffer());
    const sha = createHash('sha256').update(bytes).digest('hex');
    const quarantinePath = `legacy-orphans/${sha.slice(0, 2)}/${sha}-${basename(object.path).replace(/[^A-Za-z0-9._-]+/g, '-') || 'audio'}`;
    const copied = await admin.storage.from('audio-quarantine').upload(quarantinePath, bytes, {
      upsert: false, contentType: object.contentType, cacheControl: '3600', metadata: { sha256: sha, originalBucket: 'uploads', originalPath: object.path },
    });
    if (copied.error && !/already exists/i.test(copied.error.message)) throw copied.error;
    const verify = await admin.storage.from('audio-quarantine').download(quarantinePath);
    if (verify.error || !verify.data) throw verify.error ?? new Error('Could not verify a quarantined object.');
    const verifiedSha = createHash('sha256').update(Buffer.from(await verify.data.arrayBuffer())).digest('hex');
    if (verifiedSha !== sha) throw new Error(`Quarantine verification failed for ${object.path}.`);
    const finalReferences = await loadAllAudioReferencePaths();
    if (finalReferences.has(object.path)) continue;
    const removed = await admin.storage.from('uploads').remove([object.path]);
    if (removed.error) throw removed.error;
    const cleanup = await admin.from('audio_cleanup_queue').upsert({
      bucket_id: 'audio-quarantine', storage_path: quarantinePath, expected_sha256: sha,
      reason: 'quarantine_expired', not_before: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(),
    }, { onConflict: 'bucket_id,storage_path', ignoreDuplicates: true });
    if (cleanup.error) throw cleanup.error;
    quarantinedCount += 1;
  }
}

if (applyRepairs || register || quarantineOrphans) {
  const recorded = await admin.from('audio_reconciliation_runs').insert({
    mode: quarantineOrphans ? 'orphan_quarantine' : register ? 'legacy_registration' : 'inventory', dry_run: false, manifest_sha256: manifestSha256,
    scanned_count: trackRows.length, queued_count: queuedWavs, repaired_count: repairedCount,
    retained_count: trackRows.filter(track => track.release.download_purchase_enabled).length,
    notes: `Manifest ${manifestPath}; registered ${registeredCount}; quarantined ${quarantinedCount}.`, completed_at: new Date().toISOString(),
  });
  if (recorded.error) throw recorded.error;
}

console.log(JSON.stringify({
  manifestPath, manifestSha256, releases: manifest.releases, tracks: manifest.tracks.total,
  formats: manifest.tracks.formats, repairCandidates: manifest.repairs.length,
  missingStoredObjects: manifest.tracks.missingStoredObject.length,
  orphanCandidates: { count: manifest.orphanCandidates.count, bytes: manifest.orphanCandidates.bytes, formats: manifest.orphanCandidates.formats },
  applied: { repairedCount, registeredCount, queuedWavs, quarantinedCount },
}, null, 2));
