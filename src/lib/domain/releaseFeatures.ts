import { supabase } from '@/lib/supabase';

export type CreatorVideoPage = {
  id: string;
  creator_id: string;
  title: string;
  youtube_video_id: string;
  youtube_published_at: string | null;
  created_at?: string;
};

export type ReleaseCreatorVideo = CreatorVideoPage & {
  sort_order: number;
};

export type SavedCreatorVideo = Pick<CreatorVideoPage, 'id' | 'title' | 'youtube_video_id' | 'youtube_published_at'>;

export type YouTubeVideoMetadata = {
  title: string | null;
  published_at: string | null;
};

export type VideoAttachmentTarget = {
  id: string;
  title: string;
  cover_url: string | null;
};

type CreatorVideoRpcRow = Pick<CreatorVideoPage, 'id' | 'title' | 'youtube_video_id' | 'youtube_published_at'>;

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Mirrors the accepted HTTPS video URL forms understood by the Supabase RPC. */
export function isSupportedYouTubeVideoUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();
  if (host === 'youtu.be') return YOUTUBE_VIDEO_ID.test(url.pathname.slice(1));
  if (host !== 'youtube.com' && host !== 'www.youtube.com') return false;

  if (url.pathname === '/watch') return YOUTUBE_VIDEO_ID.test(url.searchParams.get('v') ?? '');
  const path = url.pathname.match(/^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})$/);
  return Boolean(path && YOUTUBE_VIDEO_ID.test(path[1]));
}

export async function listCreatorVideos(limit = 200, creatorId?: string) {
  let query = supabase
    .from('creator_videos' as never)
    .select('id,creator_id,title,youtube_video_id,youtube_published_at,created_at')
    .order('youtube_published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (creatorId) query = query.eq('creator_id', creatorId);
  const result = await query;
  if (result.error) throw result.error;
  return (result.data as CreatorVideoPage[] | null) ?? [];
}

export async function listReleaseCreatorVideos(itemId: string) {
  const result = await supabase
    .from('item_video_attachments' as never)
    .select('sort_order,creator_videos!inner(id,creator_id,title,youtube_video_id,youtube_published_at,created_at)')
    .eq('item_id', itemId)
    .order('sort_order');
  if (result.error) throw result.error;
  return ((result.data ?? []) as unknown as Array<{
    sort_order: number;
    creator_videos: CreatorVideoPage | CreatorVideoPage[] | null;
  }>).flatMap(row => {
    if (!row.creator_videos) return [];
    const videos = Array.isArray(row.creator_videos) ? row.creator_videos : [row.creator_videos];
    return videos.map(video => ({ ...video, sort_order: row.sort_order }));
  }) satisfies ReleaseCreatorVideo[];
}

export async function replaceStudioReleaseVideoAttachments(itemId: string, videoIds: string[]) {
  const result = await supabase.rpc('replace_owned_item_video_attachments' as never, {
    target_item_id: itemId,
    target_video_ids: videoIds,
  } as never);
  if (result.error) throw result.error;
}

export async function getCreatorVideo(id: string) {
  const result = await supabase
    .from('creator_videos' as never)
    .select('id,creator_id,title,youtube_video_id,youtube_published_at')
    .eq('id', id)
    .maybeSingle();
  if (result.error) throw result.error;
  return (result.data as CreatorVideoPage | null) ?? null;
}

export async function lookupYouTubeVideoMetadata(url: string) {
  if (!isSupportedYouTubeVideoUrl(url)) return null;
  const result = await supabase.functions.invoke('youtube-video-lookup', { body: { url: url.trim() } });
  if (result.error) throw result.error;
  const value = result.data as Partial<YouTubeVideoMetadata> | null;
  return {
    title: typeof value?.title === 'string' ? value.title : null,
    published_at: typeof value?.published_at === 'string' ? value.published_at : null,
  } satisfies YouTubeVideoMetadata;
}

export async function saveCreatorVideo(title: string, url: string, publishedAt: string | null) {
  if (!isSupportedYouTubeVideoUrl(url)) throw new Error('Enter a valid HTTPS YouTube video link.');
  const result = await supabase.rpc('save_creator_video' as never, {
    p_title: title.trim(),
    p_url: url.trim(),
    p_published_at: publishedAt,
  } as never);
  if (result.error) throw result.error;
  const row = ((result.data ?? []) as unknown as CreatorVideoRpcRow[])[0];
  if (!row) throw new Error('The video could not be saved. Try again.');
  return row;
}

export async function updateCreatorVideo(videoId: string, title: string, url: string, publishedAt: string | null) {
  if (!isSupportedYouTubeVideoUrl(url)) throw new Error('Enter a valid HTTPS YouTube video link.');
  const result = await supabase.rpc('update_creator_video' as never, {
    target_video_id: videoId,
    p_title: title.trim(),
    p_url: url.trim(),
    p_published_at: publishedAt,
  } as never);
  if (result.error) throw result.error;
  const row = ((result.data ?? []) as unknown as CreatorVideoRpcRow[])[0];
  if (!row) throw new Error('The video could not be updated. Try again.');
  return row;
}

export async function deleteCreatorVideo(videoId: string) {
  const result = await supabase.rpc('delete_creator_video' as never, { target_video_id: videoId } as never);
  if (result.error) throw result.error;
}

export async function listVideoAttachedReleases(videoId: string) {
  const result = await supabase
    .from('item_video_attachments' as never)
    .select('catalog_items(id,title,cover_url)')
    .eq('video_id', videoId);
  if (result.error) throw result.error;
  return ((result.data ?? []) as unknown as Array<{ catalog_items: VideoAttachmentTarget | VideoAttachmentTarget[] | null }>)
    .flatMap(row => {
      if (!row.catalog_items) return [];
      return Array.isArray(row.catalog_items) ? row.catalog_items : [row.catalog_items];
    });
}

export async function attachCreatorVideoToRelease(videoId: string, itemId: string) {
  const result = await supabase.rpc('attach_creator_video_to_item' as never, {
    target_item_id: itemId,
    target_video_id: videoId,
  } as never);
  if (result.error) throw result.error;
}

export async function detachCreatorVideoFromRelease(videoId: string, itemId: string) {
  const result = await supabase.rpc('detach_creator_video_from_item' as never, {
    target_item_id: itemId,
    target_video_id: videoId,
  } as never);
  if (result.error) throw result.error;
}
