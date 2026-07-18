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

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function contentTypeForFile(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPES_BY_EXTENSION[extension] ?? 'application/octet-stream';
}

function resumableUploadEndpoint() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl) throw new Error('Supabase upload configuration is missing.');
  const url = new URL(configuredUrl);
  const cloudProject = url.hostname.match(/^([^.]+)\.supabase\.co$/)?.[1];
  const origin = cloudProject ? `https://${cloudProject}.storage.supabase.co` : url.origin;
  return `${origin}/storage/v1/upload/resumable`;
}

async function uploadFile({ bucket, path, file }: { bucket: string; path: string; file: File }) {
  if (file.size <= RESUMABLE_UPLOAD_THRESHOLD_BYTES) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      contentType: contentTypeForFile(file),
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
        contentType: contentTypeForFile(file),
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
  const safeName = sanitizeFileName(file.name || 'file') || 'file';
  const path = `${folder}/${userId}/${Date.now()}-${safeName}`;

  await uploadFile({ bucket, path, file });

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
