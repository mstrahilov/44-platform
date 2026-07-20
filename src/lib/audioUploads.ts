'use client';

import { supabase } from '@/lib/supabase';

const AUDIO_SOURCE_BUCKET = 'audio-sources';
const TUS_CHUNK_BYTES = 6 * 1024 * 1024;

export type ProcessedAudioResult = {
  assetId: string;
  streamUrl: string;
  durationSeconds: number | null;
  bitrateKbps: number | null;
};

type UploadIntent = { assetId: string; path: string; token: string; error?: string };
type AudioStatus = {
  status: 'pending_upload' | 'uploaded' | 'processing' | 'ready' | 'failed';
  stream_public_url: string | null;
  stream_duration_seconds: number | string | null;
  stream_bitrate_kbps: number | null;
  failure_message: string | null;
  error?: string;
};

function directStorageEndpoint() {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configured) throw new Error('Audio upload configuration is missing.');
  const url = new URL(configured);
  const project = url.hostname.match(/^([^.]+)\.supabase\.co$/)?.[1];
  return `${project ? `https://${project}.storage.supabase.co` : url.origin}/storage/v1/upload/resumable`;
}

async function authToken() {
  const session = await supabase.auth.getSession();
  if (session.error) throw session.error;
  const token = session.data.session?.access_token;
  if (!token) throw new Error('Sign in again before uploading this track.');
  return token;
}

async function apiJson<T>(url: string, token: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || 'Audio processing is unavailable.');
  return body;
}

function uploadToSignedTus(file: File, intent: UploadIntent, onStatus?: (message: string) => void) {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const { Upload } = await import('tus-js-client');
      const upload = new Upload(file, {
        endpoint: directStorageEndpoint(),
        retryDelays: [0, 1_000, 3_000, 5_000, 10_000],
        chunkSize: TUS_CHUNK_BYTES,
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        headers: { 'x-signature': intent.token, 'x-upsert': 'false' },
        metadata: {
          bucketName: AUDIO_SOURCE_BUCKET,
          objectName: intent.path,
          contentType: file.type || 'application/octet-stream',
          cacheControl: '3600',
        },
        onProgress(uploaded, total) {
          const percent = total > 0 ? Math.min(100, Math.round((uploaded / total) * 100)) : 0;
          onStatus?.(`Uploading audio… ${percent}%`);
        },
        onError: reject,
        onSuccess: () => resolve(),
      });
      const previous = await upload.findPreviousUploads();
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    } catch (error) {
      reject(error);
    }
  });
}

async function waitForReady(assetId: string, token: string, onStatus?: (message: string) => void) {
  for (let attempt = 0; attempt < 960; attempt += 1) {
    const result = await apiJson<AudioStatus>(`/api/studio/audio/${assetId}`, token);
    if (result.status === 'ready' && result.stream_public_url) return result;
    if (result.status === 'failed') throw new Error(result.failure_message || 'This audio file could not be prepared.');
    onStatus?.(result.status === 'processing' ? 'Preparing 320 kbps streaming audio…' : 'Waiting for audio processing…');
    await new Promise(resolve => window.setTimeout(resolve, 2_500));
  }
  throw new Error('Audio processing is taking longer than expected. It is safe to return to this form later.');
}

export async function uploadProcessedAudio(file: File, onStatus?: (message: string) => void): Promise<ProcessedAudioResult> {
  const token = await authToken();
  const intent = await apiJson<UploadIntent>('/api/studio/audio', token, {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', byteSize: file.size }),
  });
  await uploadToSignedTus(file, intent, onStatus);
  onStatus?.('Upload complete. Queuing audio processing…');
  await apiJson(`/api/studio/audio/${intent.assetId}`, token, { method: 'POST', body: '{}' });
  const ready = await waitForReady(intent.assetId, token, onStatus);
  return {
    assetId: intent.assetId,
    streamUrl: ready.stream_public_url as string,
    durationSeconds: ready.stream_duration_seconds === null ? null : Number(ready.stream_duration_seconds),
    bitrateKbps: ready.stream_bitrate_kbps,
  };
}

export function audioPipelineEnabled() {
  return process.env.NEXT_PUBLIC_AUDIO_PIPELINE_ENABLED === 'true';
}
