import type { Database, Json } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type BookContent = Database['public']['Tables']['book_contents']['Row'];
export type SamplePackFile = Database['public']['Tables']['sample_pack_files']['Row'];
export type ReadingProgress = Database['public']['Tables']['reading_progress']['Row'];
export type ReadingBookmark = Database['public']['Tables']['reading_bookmarks']['Row'];
export type SamplePlaybackProgress = Database['public']['Tables']['sample_playback_progress']['Row'];

export async function getPublicNativeContent(itemId: string) {
  const [bookResult, samplesResult] = await Promise.all([
    supabase.from('book_contents').select('*').eq('item_id', itemId).maybeSingle(),
    supabase.from('sample_pack_files').select('*').eq('item_id', itemId).order('sort_order'),
  ]);
  const error = bookResult.error || samplesResult.error;
  if (error) throw error;
  return {
    book: bookResult.data as BookContent | null,
    samples: (samplesResult.data ?? []) as SamplePackFile[],
  };
}

export async function getReadingSession(itemId: string, mode: 'sample' | 'full') {
  const bookResult = await supabase.from('book_contents').select('*').eq('item_id', itemId).maybeSingle();
  if (bookResult.error) throw bookResult.error;
  const book = bookResult.data as BookContent | null;
  if (!book) return null;

  if (mode === 'sample') {
    return { book, url: book.preview_url, progress: null as ReadingProgress | null };
  }

  const [assetResult, progressResult] = await Promise.all([
    supabase.rpc('list_item_asset_manifest', { target_item_id: itemId }),
    supabase.from('reading_progress').select('*').eq('item_id', itemId).maybeSingle(),
  ]);
  const error = assetResult.error || progressResult.error;
  if (error) throw error;
  const asset = (assetResult.data ?? []).find(row => row.id === book.file_asset_id && row.is_unlocked && row.storage_path);
  if (!asset?.storage_path) return { book, url: null, progress: progressResult.data as ReadingProgress | null };
  const signed = await supabase.storage.from('item-files').createSignedUrl(asset.storage_path, 900);
  if (signed.error) throw signed.error;
  return { book, url: signed.data.signedUrl, progress: progressResult.data as ReadingProgress | null };
}

export async function saveReadingProgress(params: {
  itemId: string;
  page: number;
  totalPages: number;
  appearance: { theme: 'system' | 'light' | 'dark' | 'sepia'; fit: 'width' | 'page'; zoom: number };
}) {
  const result = await supabase.rpc('save_reading_progress', {
    target_item_id: params.itemId,
    target_page: params.page,
    target_total_pages: params.totalPages,
    target_appearance: params.appearance as unknown as Json,
  });
  if (result.error) throw result.error;
  return result.data as ReadingProgress;
}

export async function listReadingBookmarks(itemId: string) {
  const result = await supabase.from('reading_bookmarks').select('*').eq('item_id', itemId).order('page_number');
  if (result.error) throw result.error;
  return (result.data ?? []) as ReadingBookmark[];
}

export async function toggleReadingBookmark(itemId: string, page: number) {
  const result = await supabase.rpc('toggle_reading_bookmark', { target_item_id: itemId, target_page: page });
  if (result.error) throw result.error;
  return result.data as boolean;
}

export async function listSampleProgress(itemId: string) {
  const result = await supabase.from('sample_playback_progress').select('*').eq('item_id', itemId);
  if (result.error) throw result.error;
  return (result.data ?? []) as SamplePlaybackProgress[];
}

export async function saveSampleProgress(sampleFileId: string, positionSeconds: number, durationSeconds: number | null) {
  const result = await supabase.rpc('save_sample_playback_progress', {
    target_sample_file_id: sampleFileId,
    target_position_seconds: positionSeconds,
    ...(durationSeconds === null ? {} : { target_duration_seconds: durationSeconds }),
  });
  if (result.error) throw result.error;
  return result.data as SamplePlaybackProgress;
}

export async function saveStudioBookContent(params: {
  itemId: string;
  fileAssetId: string;
  previewUrl: string | null;
  totalPages?: number | null;
  samplePageLimit?: number | null;
  languageCode?: string | null;
}) {
  const result = await supabase.from('book_contents').upsert({
    item_id: params.itemId,
    file_asset_id: params.fileAssetId,
    preview_url: params.previewUrl,
    total_pages: params.totalPages ?? null,
    sample_page_limit: params.samplePageLimit ?? null,
    language_code: params.languageCode ?? null,
    format: 'pdf',
  });
  if (result.error) throw result.error;
}

export async function replaceStudioSampleFiles(itemId: string, files: Array<{
  title: string;
  previewUrl: string | null;
  durationSeconds: number | null;
  waveformPeaks: number[];
  mimeType?: string | null;
  fileSizeBytes?: number | null;
}>) {
  const removed = await supabase.from('sample_pack_files').delete().eq('item_id', itemId);
  if (removed.error) throw removed.error;
  if (files.length === 0) return;
  const inserted = await supabase.from('sample_pack_files').insert(files.map((file, index) => ({
    item_id: itemId,
    title: file.title,
    preview_url: file.previewUrl,
    duration_seconds: file.durationSeconds,
    waveform_peaks: file.waveformPeaks,
    mime_type: file.mimeType ?? null,
    file_size_bytes: file.fileSizeBytes ?? null,
    sort_order: index,
  })));
  if (inserted.error) throw inserted.error;
}
