import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

const apiUrl = process.env.API_URL?.trim();
const serviceKey = process.env.SERVICE_ROLE_KEY?.trim();
if (!apiUrl || !serviceKey) {
  throw new Error('Run with API_URL and SERVICE_ROLE_KEY from `supabase status -o env`.');
}

const admin = createClient(apiUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const runId = randomUUID();
const email = `audio-integration-${runId}@example.test`;
const createdObjectPaths = [];
let userId;

function wavFixture(seconds = 2) {
  const sampleRate = 44_100;
  const channels = 2;
  const bytesPerSample = 2;
  const frames = sampleRate * seconds;
  const pcmBytes = frames * channels * bytesPerSample;
  const output = Buffer.alloc(44 + pcmBytes);
  output.write('RIFF', 0);
  output.writeUInt32LE(36 + pcmBytes, 4);
  output.write('WAVEfmt ', 8);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(channels, 22);
  output.writeUInt32LE(sampleRate, 24);
  output.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  output.writeUInt16LE(channels * bytesPerSample, 32);
  output.writeUInt16LE(bytesPerSample * 8, 34);
  output.write('data', 36);
  output.writeUInt32LE(pcmBytes, 40);
  for (let frame = 0; frame < frames; frame += 1) {
    const sample = Math.round(Math.sin((frame / sampleRate) * Math.PI * 2 * 440) * 8_000);
    const offset = 44 + frame * channels * bytesPerSample;
    output.writeInt16LE(sample, offset);
    output.writeInt16LE(sample, offset + 2);
  }
  return output;
}

function run(program, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${program} exited with status ${code}.`)));
  });
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function insertFixture(filename, contentType, bytes) {
  const assetId = randomUUID();
  const sourcePath = `${userId}/${assetId}/${filename}`;
  const uploaded = await admin.storage.from('audio-sources').upload(sourcePath, bytes, { contentType, upsert: false });
  if (uploaded.error) throw uploaded.error;
  createdObjectPaths.push({ bucket: 'audio-sources', path: sourcePath });
  const asset = await admin.from('audio_assets').insert({
    id: assetId,
    owner_id: userId,
    status: 'uploaded',
    source_bucket: 'audio-sources',
    source_path: sourcePath,
    original_filename: filename,
    source_content_type: contentType,
    source_byte_size: bytes.length,
  });
  if (asset.error) throw asset.error;
  const job = await admin.from('audio_processing_jobs').insert({ audio_asset_id: assetId });
  if (job.error) throw job.error;
  return { assetId, sourceSha: sha256(bytes) };
}

async function cleanup() {
  for (const { bucket, path } of createdObjectPaths) await admin.storage.from(bucket).remove([path]);
  if (userId) {
    const assets = await admin.from('audio_assets').select('stream_bucket,stream_path').eq('owner_id', userId);
    for (const asset of assets.data ?? []) {
      if (asset.stream_bucket && asset.stream_path) await admin.storage.from(asset.stream_bucket).remove([asset.stream_path]);
    }
    await admin.from('audio_assets').delete().eq('owner_id', userId);
    await admin.auth.admin.deleteUser(userId);
  }
}

try {
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: randomUUID(),
    user_metadata: { display_name: 'Audio Integration', username: `audio_${runId.slice(0, 8)}` },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error('Could not create integration user.');
  userId = created.data.user.id;
  const profile = await admin.from('profiles').update({ role: 'creator' }).eq('id', userId);
  if (profile.error) throw profile.error;

  const wav = await insertFixture('integration-source.wav', 'audio/wav', wavFixture());
  const dockerApiUrl = apiUrl.replace('127.0.0.1', 'host.docker.internal').replace('localhost', 'host.docker.internal');
  await run('docker', [
    'run', '--rm',
    '-e', `SUPABASE_URL=${dockerApiUrl}`,
    '-e', `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
    '-e', 'AUDIO_BATCH_SIZE=2',
    '-e', 'AUDIO_CLEANUP_ENABLED=false',
    '44-audio-transcoder:local',
  ]);

  const result = await admin.from('audio_assets')
    .select('status,source_sha256,source_codec,stream_bucket,stream_path,stream_sha256,stream_bitrate_kbps,stream_duration_seconds')
    .eq('id', wav.assetId).single();
  if (result.error) throw result.error;
  if (result.data.status !== 'ready') throw new Error(`WAV asset ended in ${result.data.status}.`);
  if (result.data.source_codec !== 'pcm_s16le') throw new Error(`Unexpected WAV codec ${result.data.source_codec}.`);
  if (result.data.source_sha256 !== wav.sourceSha) throw new Error('Source checksum did not match the uploaded WAV.');
  if (result.data.stream_bucket !== 'audio-streams' || !result.data.stream_path) throw new Error('Streaming output was not registered.');
  if (result.data.stream_bitrate_kbps < 300 || result.data.stream_bitrate_kbps > 330) {
    throw new Error(`Expected an approximately 320 kbps stream, received ${result.data.stream_bitrate_kbps}.`);
  }
  createdObjectPaths.push({ bucket: result.data.stream_bucket, path: result.data.stream_path });

  const preparedMp3 = await admin.storage.from('audio-streams').download(result.data.stream_path);
  if (preparedMp3.error) throw preparedMp3.error;
  const mp3Bytes = Buffer.from(await preparedMp3.data.arrayBuffer());
  const mp3 = await insertFixture('integration-source.mp3', 'audio/mpeg', mp3Bytes);
  await run('docker', [
    'run', '--rm',
    '-e', `SUPABASE_URL=${dockerApiUrl}`,
    '-e', `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
    '-e', 'AUDIO_BATCH_SIZE=2',
    '-e', 'AUDIO_CLEANUP_ENABLED=false',
    '44-audio-transcoder:local',
  ]);
  const mp3Result = await admin.from('audio_assets')
    .select('status,source_sha256,source_codec,stream_bucket,stream_path,stream_sha256')
    .eq('id', mp3.assetId).single();
  if (mp3Result.error) throw mp3Result.error;
  if (mp3Result.data.status !== 'ready' || mp3Result.data.source_codec !== 'mp3') {
    throw new Error(`MP3 asset was not copied successfully (${mp3Result.data.status}/${mp3Result.data.source_codec}).`);
  }
  if (mp3Result.data.source_sha256 !== mp3.sourceSha || mp3Result.data.stream_sha256 !== mp3.sourceSha) {
    throw new Error('MP3 processing was not byte-identical.');
  }
  if (!mp3Result.data.stream_bucket || !mp3Result.data.stream_path) throw new Error('MP3 stream output was not registered.');
  createdObjectPaths.push({ bucket: mp3Result.data.stream_bucket, path: mp3Result.data.stream_path });
  console.log(JSON.stringify({
    event: 'audio_integration_passed',
    sourceCodec: result.data.source_codec,
    streamBitrateKbps: result.data.stream_bitrate_kbps,
    streamDurationSeconds: result.data.stream_duration_seconds,
    mp3ByteIdentical: true,
  }));
} finally {
  await cleanup();
}
