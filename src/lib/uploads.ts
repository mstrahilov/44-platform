import { supabase } from '@/lib/supabase';

const DEFAULT_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET ?? 'uploads';
const RESUMABLE_UPLOAD_THRESHOLD_BYTES = 6 * 1024 * 1024;

const CONTENT_TYPES_BY_EXTENSION: Record<string, string> = {
  aac: 'audio/aac',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
};

const AUDIO_EXTENSIONS = new Set(Object.keys(CONTENT_TYPES_BY_EXTENSION));

type DetectedAudio = {
  contentType: string;
  extension: keyof typeof CONTENT_TYPES_BY_EXTENSION;
};

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function contentTypeForFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  // Browsers report vendor-specific audio MIME types (notably
  // `audio/x-m4a`) inconsistently. Storage metadata is sent back to native
  // players, so prefer the canonical type for known audio extensions instead
  // of trusting `File.type`. This keeps M4A streams as `audio/mp4` and MP3
  // streams as `audio/mpeg` across web and iOS.
  return CONTENT_TYPES_BY_EXTENSION[extension] ?? file.type ?? 'application/octet-stream';
}

function replaceFileExtension(name: string, extension: string) {
  const withoutExtension = name.replace(/\.[^./\\]+$/, '');
  return `${withoutExtension}.${extension}`;
}

/**
 * Browsers and file pickers can preserve a misleading filename/MIME pair.
 * Read only the small container signature so a mislabeled M4A/MP4 uploaded as
 * `.mp3` is stored with the metadata native players expect. If the signature
 * is unknown, the extension/MIME fallback remains unchanged.
 */
async function detectAudioContainer(file: File): Promise<DetectedAudio | null> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!AUDIO_EXTENSIONS.has(extension)) return null;

  try {
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (bytes.length >= 12) {
      const riff = String.fromCharCode(...bytes.slice(0, 4));
      const wave = String.fromCharCode(...bytes.slice(8, 12));
      if (riff === 'RIFF' && wave === 'WAVE') return { contentType: 'audio/wav', extension: 'wav' };

      const ftyp = String.fromCharCode(...bytes.slice(4, 8));
      if (ftyp === 'ftyp') return { contentType: 'audio/mp4', extension: 'm4a' };
    }

    if (bytes.length >= 4 && String.fromCharCode(...bytes.slice(0, 4)) === 'fLaC') {
      return { contentType: 'audio/flac', extension: 'flac' };
    }

    if (bytes.length >= 3 && String.fromCharCode(...bytes.slice(0, 3)) === 'ID3') {
      return { contentType: 'audio/mpeg', extension: 'mp3' };
    }

    // MPEG audio frames may not carry an ID3 header. This checks the sync word
    // without attempting to parse the full stream.
    if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
      return { contentType: 'audio/mpeg', extension: 'mp3' };
    }
  } catch {
    // Some browser/File implementations do not expose a readable slice. The
    // extension-based fallback below is still safe for ordinary uploads.
  }

  return null;
}

function resumableUploadEndpoint() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl) throw new Error('Supabase upload configuration is missing.');
  const url = new URL(configuredUrl);
  const cloudProject = url.hostname.match(/^([^.]+)\.supabase\.co$/)?.[1];
  const origin = cloudProject ? `https://${cloudProject}.storage.supabase.co` : url.origin;
  return `${origin}/storage/v1/upload/resumable`;
}

async function uploadFile({ bucket, path, file, contentType }: { bucket: string; path: string; file: File; contentType?: string }) {
  const resolvedContentType = contentType ?? contentTypeForFile(file);
  if (file.size <= RESUMABLE_UPLOAD_THRESHOLD_BYTES) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      contentType: resolvedContentType,
      upsert: false,
    });
    if (error) throw error;
    return;
  }

  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) throw sessionResult.error;
  const accessToken = sessionResult.data.session?.access_token;
  if (!accessToken) throw new Error('Sign in again before uploading this file.');
  const { Upload } = await import('tus-js-client');

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: resumableUploadEndpoint(),
      retryDelays: [0, 1_000, 3_000, 5_000, 10_000],
      chunkSize: RESUMABLE_UPLOAD_THRESHOLD_BYTES,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-upsert': 'false',
      },
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: resolvedContentType,
        cacheControl: '3600',
      },
      onError: reject,
      onSuccess: () => resolve(),
    });
    upload.start();
  });
}

export async function uploadPublicFile(params: {
  file: File;
  folder: string;
  userId: string;
  bucket?: string;
}) {
  const { file, folder, userId, bucket = DEFAULT_BUCKET } = params;
  const detectedAudio = await detectAudioContainer(file);
  const sourceName = detectedAudio
    ? replaceFileExtension(file.name || 'audio-file', detectedAudio.extension)
    : file.name || 'file';
  const safeName = sanitizeFileName(sourceName) || 'file';
  const path = `${folder}/${userId}/${Date.now()}-${safeName}`;

  await uploadFile({ bucket, path, file, contentType: detectedAudio?.contentType });

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl, bucket };
}

export async function uploadPrivateItemFile(params: { file: File; folder: string; userId: string }) {
  const { file, folder, userId } = params;
  const safeName = sanitizeFileName(file.name || 'file') || 'file';
  const path = `${folder}/${userId}/${crypto.randomUUID()}-${safeName}`;
  await uploadFile({ bucket: 'item-files', path, file });
  return { path, bucket: 'item-files' };
}

export function getUploadErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const message = error.message;
    if (/row-level security|unauthorized|jwt|session|403/i.test(message)) {
      return 'Your upload session expired. Sign in again, then retry the file.';
    }
    if (/mime|content.?type|file type|unsupported/i.test(message)) {
      return 'This file type is not supported for this upload.';
    }
    if (/too large|maximum|size limit|payload too large|413/i.test(message)) {
      return 'This file is larger than the current upload limit.';
    }
    if (/network|fetch|connection|offline|timeout|aborted/i.test(message)) {
      return 'The upload was interrupted. Check your connection and retry; your other form fields are still saved.';
    }
    return message;
  }

  return 'Upload failed. Make sure the Supabase uploads bucket exists and allows authenticated uploads.';
}
