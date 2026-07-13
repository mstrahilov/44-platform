import { supabase } from '@/lib/supabase';

const DEFAULT_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET ?? 'uploads';

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function uploadPublicFile(params: {
  file: File;
  folder: string;
  userId: string;
  bucket?: string;
}) {
  const { file, folder, userId, bucket = DEFAULT_BUCKET } = params;
  const safeName = sanitizeFileName(file.name || 'file');
  const path = `${folder}/${userId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl, bucket };
}

export async function uploadPrivateItemFile(params: { file: File; folder: string; userId: string }) {
  const { file, folder, userId } = params;
  const safeName = sanitizeFileName(file.name || 'file');
  const path = `${folder}/${userId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from('item-files').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return { path, bucket: 'item-files' };
}

export function getUploadErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'Upload failed. Make sure the Supabase uploads bucket exists and allows authenticated uploads.';
}
