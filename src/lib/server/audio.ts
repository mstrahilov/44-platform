import { commerceAdminClient, authenticateCommerceRequest } from '@/lib/server/commerce';

export const AUDIO_SOURCE_BUCKET = 'audio-sources';
export const AUDIO_STREAM_BUCKET = 'audio-streams';
export const MAX_AUDIO_SOURCE_BYTES = 500 * 1024 * 1024;

export const ALLOWED_AUDIO_CONTENT_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
  'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac', 'audio/aiff', 'audio/x-aiff',
  'audio/alac', 'audio/x-aac', 'application/octet-stream',
]);

export const ALLOWED_AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'aac', 'wav', 'flac', 'aif', 'aiff']);

export function safeAudioFilename(name: string) {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
  return normalized || 'audio-file';
}

export function validateAudioUpload(filename: string, contentType: string, byteSize: number) {
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  if (!Number.isSafeInteger(byteSize) || byteSize <= 0 || byteSize > MAX_AUDIO_SOURCE_BYTES) {
    return 'Audio files can be up to 500 MB per track.';
  }
  if (!ALLOWED_AUDIO_EXTENSIONS.has(extension)) {
    return 'Use an MP3, WAV, FLAC, AIFF, AAC, M4A, or ALAC audio file.';
  }
  if (contentType && !ALLOWED_AUDIO_CONTENT_TYPES.has(contentType)) {
    return 'This audio file type is not supported.';
  }
  return null;
}

export async function requireAudioCreator(request: Request) {
  const user = await authenticateCommerceRequest(request);
  const admin = commerceAdminClient();
  const profile = await admin.from('profiles').select('id,role').eq('id', user.id).maybeSingle();
  if (profile.error) throw profile.error;
  if (!profile.data || !['creator', 'admin'].includes(profile.data.role ?? '')) return null;
  return { admin, user, profile: profile.data };
}

export function audioApiError(error: unknown, fallback = 'Audio processing is unavailable.') {
  const status = typeof error === 'object' && error && 'status' in error && typeof error.status === 'number' ? error.status : 400;
  const message = error instanceof Error ? error.message : fallback;
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
