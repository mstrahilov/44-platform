import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { spawn } from 'node:child_process';

const url = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const workerId = randomUUID();
const batchSize = Math.max(1, Math.min(10, Number(process.env.AUDIO_BATCH_SIZE || 4)));
const deadline = Date.now() + Math.max(5, Number(process.env.AUDIO_JOB_DEADLINE_MINUTES || 25)) * 60_000;
const supportedCodecs = new Set(['mp3', 'pcm_s16le', 'pcm_s24le', 'pcm_s32le', 'pcm_f32le', 'flac', 'aac', 'alac']);

function command(program, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += String(chunk); });
    child.stderr.on('data', chunk => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${program} exited ${code}: ${stderr.slice(-500)}`)));
  });
}

async function probe(path) {
  const result = await command('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name,channels,sample_rate,bit_rate:format=duration', '-of', 'json', path]);
  const parsed = JSON.parse(result.stdout);
  const stream = parsed.streams?.[0];
  const duration = Number(parsed.format?.duration);
  if (!stream?.codec_name || !Number.isFinite(duration) || duration <= 0) throw new PermanentAudioError('invalid_audio', 'The uploaded file does not contain readable audio.');
  if (!supportedCodecs.has(stream.codec_name)) throw new PermanentAudioError('unsupported_codec', `Unsupported audio codec: ${stream.codec_name}.`);
  return { codec: stream.codec_name, duration, bitrateKbps: stream.bit_rate ? Math.round(Number(stream.bit_rate) / 1000) : null };
}

async function sha256(path) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(path), hash);
  return hash.digest('hex');
}

async function downloadStorageObject(bucket, path, destination) {
  const signed = await admin.storage.from(bucket).createSignedUrl(path, 1800);
  if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error('Could not sign the source object.');
  const response = await fetch(signed.data.signedUrl);
  if (!response.ok || !response.body) throw new Error(`Source download failed with ${response.status}.`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
}

async function uploadAndVerifyPrivateMaster(job, sourceFile, sourceSha) {
  const safeName = basename(job.original_filename).replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 180) || 'master-audio';
  const path = `${job.owner_id}/legacy/${job.asset_id}/${safeName}`;
  const bytes = await readFile(sourceFile);
  const upload = await admin.storage.from('audio-sources').upload(path, bytes, {
    upsert: true,
    contentType: job.source_content_type || 'application/octet-stream',
    cacheControl: '3600',
    metadata: { sha256: sourceSha, migratedFrom: `${job.source_bucket}/${job.source_path}` },
  });
  if (upload.error) throw upload.error;
  const info = await admin.storage.from('audio-sources').info(path);
  if (info.error || Number(info.data?.size ?? 0) !== Number(job.source_byte_size)) throw new Error('Private master size verification failed.');
  const verifyFile = `${sourceFile}.private-verify`;
  await downloadStorageObject('audio-sources', path, verifyFile);
  const verifiedSha = await sha256(verifyFile);
  await rm(verifyFile, { force: true });
  if (verifiedSha !== sourceSha) throw new Error('Private master checksum verification failed.');
  return path;
}

async function transcode(job) {
  const work = await mkdtemp(join(tmpdir(), '44-audio-'));
  const sourceFile = join(work, 'source');
  const outputFile = join(work, 'stream.mp3');
  let heartbeat;
  try {
    heartbeat = setInterval(() => {
      void admin.rpc('heartbeat_audio_processing_job', { target_job_id: job.job_id, target_claim_token: job.claim_token });
    }, 60_000);
    await downloadStorageObject(job.source_bucket, job.source_path, sourceFile);
    const sourceStats = await stat(sourceFile);
    if (sourceStats.size !== Number(job.source_byte_size)) throw new PermanentAudioError('source_size_mismatch', 'Stored source size does not match the upload record.');
    const sourceSha = await sha256(sourceFile);
    const source = await probe(sourceFile);

    if (source.codec === 'mp3') {
      await copyFile(sourceFile, outputFile);
    } else {
      await command('ffmpeg', ['-hide_banner', '-nostdin', '-y', '-i', sourceFile, '-map', '0:a:0', '-vn', '-c:a', 'libmp3lame', '-b:a', '320k', '-ar', '44100', '-ac', '2', '-map_metadata', '0', outputFile]);
    }
    await command('ffmpeg', ['-v', 'error', '-nostdin', '-i', outputFile, '-f', 'null', '-']);
    const stream = await probe(outputFile);
    const tolerance = Math.max(1, source.duration * 0.005);
    if (Math.abs(source.duration - stream.duration) > tolerance) throw new PermanentAudioError('duration_mismatch', 'Prepared audio duration did not match the original.');
    const streamSha = await sha256(outputFile);
    const streamStats = await stat(outputFile);
    const streamPath = `${job.owner_id}/${job.asset_id}/${sourceSha.slice(0, 20)}.mp3`;
    const outputBytes = await readFile(outputFile);
    const uploaded = await admin.storage.from('audio-streams').upload(streamPath, outputBytes, {
      upsert: true, contentType: 'audio/mpeg', cacheControl: '31536000', metadata: { sha256: streamSha, sourceSha256: sourceSha },
    });
    if (uploaded.error) throw uploaded.error;
    const outputInfo = await admin.storage.from('audio-streams').info(streamPath);
    if (outputInfo.error || Number(outputInfo.data?.size ?? 0) !== streamStats.size) throw new Error('Streaming object size verification failed.');
    const streamUrl = admin.storage.from('audio-streams').getPublicUrl(streamPath).data.publicUrl;

    let finalSourceBucket = null;
    let finalSourcePath = null;
    let privateVerified = false;
    if (job.retention_mode === 'retain' && job.source_bucket === 'uploads') {
      finalSourcePath = await uploadAndVerifyPrivateMaster(job, sourceFile, sourceSha);
      finalSourceBucket = 'audio-sources';
      privateVerified = true;
    }
    const completed = await admin.rpc('complete_audio_processing_job', {
      target_job_id: job.job_id,
      target_claim_token: job.claim_token,
      target_source_sha256: sourceSha,
      target_source_codec: source.codec,
      target_source_duration_seconds: source.duration,
      target_stream_bucket: 'audio-streams',
      target_stream_path: streamPath,
      target_stream_public_url: streamUrl,
      target_stream_byte_size: streamStats.size,
      target_stream_sha256: streamSha,
      target_stream_bitrate_kbps: source.codec === 'mp3' ? (stream.bitrateKbps || 320) : 320,
      target_stream_duration_seconds: stream.duration,
      target_final_source_bucket: finalSourceBucket,
      target_final_source_path: finalSourcePath,
      target_private_source_verified: privateVerified,
    });
    if (completed.error) throw completed.error;
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    await rm(work, { recursive: true, force: true });
  }
}

class PermanentAudioError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function safeError(error) {
  const message = error instanceof Error ? error.message : 'Audio processing failed.';
  return message.replace(/https?:\/\/\S+/g, '[url]').replace(/[A-Za-z0-9_-]{30,}/g, '[identifier]').slice(0, 500);
}

async function processOne() {
  const claimed = await admin.rpc('claim_audio_processing_job', { target_worker_id: workerId });
  if (claimed.error) throw claimed.error;
  const job = claimed.data?.[0];
  if (!job) return false;
  try {
    await transcode(job);
    console.log(JSON.stringify({ event: 'audio_completed', jobId: job.job_id, assetId: job.asset_id }));
  } catch (error) {
    const permanent = error instanceof PermanentAudioError;
    const failed = await admin.rpc('fail_audio_processing_job', {
      target_job_id: job.job_id,
      target_claim_token: job.claim_token,
      target_error_code: permanent ? error.code : 'worker_failure',
      target_error_message: safeError(error),
      target_retryable: !permanent,
    });
    if (failed.error) console.error(JSON.stringify({ event: 'audio_failure_record_failed', jobId: job.job_id, error: safeError(failed.error) }));
    console.error(JSON.stringify({ event: 'audio_failed', jobId: job.job_id, retryable: !permanent, error: safeError(error) }));
  }
  return true;
}

async function processCleanupOne() {
  const claimed = await admin.rpc('claim_audio_cleanup_entry', { target_worker_id: workerId });
  if (claimed.error) throw claimed.error;
  const entry = claimed.data?.[0];
  if (!entry) return false;
  try {
    const authorized = await admin.rpc('audio_cleanup_entry_can_run', { target_entry_id: entry.entry_id });
    if (authorized.error) throw authorized.error;
    if (!authorized.data || !entry.expected_sha256) {
      await admin.rpc('complete_audio_cleanup_entry', {
        target_entry_id: entry.entry_id, target_claim_token: entry.claim_token,
        target_result: 'retained', target_error: !entry.expected_sha256 ? 'Retained: cleanup checksum is missing.' : 'Retained: database references or entitlements changed.',
      });
      return true;
    }
    const work = await mkdtemp(join(tmpdir(), '44-audio-cleanup-'));
    const candidate = join(work, 'candidate');
    try {
      await downloadStorageObject(entry.bucket_id, entry.storage_path, candidate);
      const candidateSha = await sha256(candidate);
      if (candidateSha !== entry.expected_sha256) {
        await admin.rpc('complete_audio_cleanup_entry', {
          target_entry_id: entry.entry_id, target_claim_token: entry.claim_token,
          target_result: 'retained', target_error: 'Retained: stored object checksum changed.',
        });
        return true;
      }
      const reauthorized = await admin.rpc('audio_cleanup_entry_can_run', { target_entry_id: entry.entry_id });
      if (reauthorized.error || !reauthorized.data) {
        await admin.rpc('complete_audio_cleanup_entry', {
          target_entry_id: entry.entry_id, target_claim_token: entry.claim_token,
          target_result: 'retained', target_error: 'Retained: final reference check did not authorize deletion.',
        });
        return true;
      }
      const removed = await admin.storage.from(entry.bucket_id).remove([entry.storage_path]);
      if (removed.error) throw removed.error;
      const completed = await admin.rpc('complete_audio_cleanup_entry', {
        target_entry_id: entry.entry_id, target_claim_token: entry.claim_token,
        target_result: 'completed', target_error: null,
      });
      if (completed.error) throw completed.error;
      console.log(JSON.stringify({ event: 'audio_cleanup_completed', entryId: entry.entry_id }));
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  } catch (error) {
    const failed = await admin.rpc('complete_audio_cleanup_entry', {
      target_entry_id: entry.entry_id, target_claim_token: entry.claim_token,
      target_result: 'failed', target_error: safeError(error),
    });
    if (failed.error) console.error(JSON.stringify({ event: 'audio_cleanup_failure_record_failed', entryId: entry.entry_id, error: safeError(failed.error) }));
  }
  return true;
}

let processed = 0;
while (processed < batchSize && Date.now() < deadline) {
  const found = await processOne();
  if (!found) break;
  processed += 1;
}
let cleaned = 0;
if (process.env.AUDIO_CLEANUP_ENABLED === 'true') {
  while (cleaned < 20 && Date.now() < deadline) {
    const found = await processCleanupOne();
    if (!found) break;
    cleaned += 1;
  }
}
console.log(JSON.stringify({ event: 'audio_worker_finished', workerId, processed, cleaned, cleanupEnabled: process.env.AUDIO_CLEANUP_ENABLED === 'true' }));
