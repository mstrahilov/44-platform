import { supabase } from '@/lib/supabase';

export type CreatorVideoPage = {
  id: string;
  creator_id: string;
  title: string;
  youtube_video_id: string;
  youtube_thumbnail_url?: string | null;
  youtube_published_at: string | null;
  youtube_metadata_checked_at?: string | null;
  created_at?: string;
};

export type HomeVideoPreview = Pick<CreatorVideoPage, 'id' | 'creator_id' | 'title' | 'youtube_video_id' | 'youtube_thumbnail_url'> & {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  slug: string | null;
};

export type CreatorVideoBrowseRow = CreatorVideoPage & {
  creator_profile: { display_name: string | null; username: string | null } | null;
};

export type ReleaseCreatorVideo = CreatorVideoPage & {
  sort_order: number;
};

export type SavedCreatorVideo = Pick<CreatorVideoPage, 'id' | 'title' | 'youtube_video_id' | 'youtube_published_at'>;

export type YouTubeVideoMetadata = {
  title: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  lookup_error?: string | null;
};

export type VideoAttachmentTarget = {
  id: string;
  title: string;
  cover_url: string | null;
  item_type?: string | null;
  experience_type?: string | null;
};

type CreatorVideoRpcRow = Pick<CreatorVideoPage, 'id' | 'title' | 'youtube_video_id' | 'youtube_published_at'>;

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const CREATOR_VIDEO_METADATA_UPDATED_EVENT = '44:creator-video-metadata-updated';
const creatorVideoMetadataRequests = new Map<string, Promise<CreatorVideoPage>>();
const youtubeMetadataLookups = new Map<string, Promise<YouTubeVideoMetadata | null>>();

export function isPlaceholderCreatorVideoTitle(title: string | null | undefined) {
  return !title?.trim() || /^(?:youtube\s+)?video(?:\s+\d+)?$/i.test(title.trim());
}

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

/** Return the stable YouTube ID used to build the public thumbnail URL. */
export function getYouTubeVideoId(value: string) {
  if (!isSupportedYouTubeVideoUrl(value)) return null;
  const url = new URL(value.trim());
  if (url.hostname.toLowerCase() === 'youtu.be') return url.pathname.slice(1);
  if (url.pathname === '/watch') return url.searchParams.get('v');
  return url.pathname.match(/^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})$/)?.[1] ?? null;
}

export async function listCreatorVideos(limit = 200, creatorId?: string) {
  let query = supabase
    .from('creator_videos' as never)
    .select('id,creator_id,title,youtube_video_id,youtube_published_at,youtube_metadata_checked_at,created_at')
    .order('youtube_published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (creatorId) query = query.eq('creator_id', creatorId);
  const result = await query;
  if (result.error) throw result.error;
  return (result.data as CreatorVideoPage[] | null) ?? [];
}

export async function listCreatorVideosForBrowse(limit = 200): Promise<CreatorVideoBrowseRow[]> {
  // Fetch recently added rows first so videos whose YouTube publish date is
  // still missing are not pushed out of the browse window by NULLS LAST.
  // The Videos tab applies the release-date sort with a created_at fallback.
  const result = await supabase
    .from('creator_videos' as never)
    .select('id,creator_id,title,youtube_video_id,youtube_published_at,youtube_metadata_checked_at,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (result.error) throw result.error;
  const videos = (result.data as CreatorVideoPage[] | null) ?? [];
  const creatorIds = Array.from(new Set(videos.map(video => video.creator_id)));
  if (creatorIds.length === 0) return [];

  const profiles = await supabase
    .from('profiles')
    .select('id,display_name,username')
    .in('id', creatorIds);
  if (profiles.error) throw profiles.error;
  const profilesById = new Map((profiles.data ?? []).map(profile => [profile.id, profile]));
  return videos.map(video => ({ ...video, creator_profile: profilesById.get(video.creator_id) ?? null }));
}

export async function listHomeVideoPreviews(limit = 4) {
  const result = await supabase.rpc('browse_videos_v1' as never, { cursor: null, limit } as never);
  if (result.error) throw result.error;
  const page = result.data as unknown as { contract_version?: number; items?: HomeVideoPreview[] } | null;
  if (page?.contract_version !== 1 || !Array.isArray(page.items)) return [];
  return page.items.slice(0, limit);
}

export async function listReleaseCreatorVideos(itemId: string) {
  const result = await supabase
    .from('item_video_attachments' as never)
    .select('sort_order,creator_videos!inner(id,creator_id,title,youtube_video_id,youtube_published_at,youtube_metadata_checked_at,created_at)')
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
    .select('id,creator_id,title,youtube_video_id,youtube_published_at,youtube_metadata_checked_at')
    .eq('id', id)
    .maybeSingle();
  if (result.error) throw result.error;
  return (result.data as CreatorVideoPage | null) ?? null;
}

export function lookupYouTubeVideoMetadata(url: string): Promise<YouTubeVideoMetadata | null> {
  if (!isSupportedYouTubeVideoUrl(url)) return Promise.resolve(null);
  const parsedUrl = new URL(url.trim());
  const videoId = parsedUrl.searchParams.get('v') ?? parsedUrl.pathname.split('/').filter(Boolean).at(-1) ?? '';
  const existingRequest = youtubeMetadataLookups.get(videoId);
  if (existingRequest) return existingRequest;
  const request = (async () => {
    const [dataApiResult, oEmbedResult] = await Promise.allSettled([
      supabase.functions.invoke('youtube-video-lookup', { body: { url: url.trim() } }),
      fetch(`/api/videos/metadata?videoId=${encodeURIComponent(videoId)}`).then(async response => {
        if (!response.ok) return null;
        const payload = await response.json() as { title?: unknown; thumbnail_url?: unknown };
        return {
          title: typeof payload.title === 'string' ? payload.title : null,
          thumbnail_url: typeof payload.thumbnail_url === 'string' ? payload.thumbnail_url : null,
        };
      }),
    ]);
    const value = dataApiResult.status === 'fulfilled' && !dataApiResult.value.error
      ? dataApiResult.value.data as Partial<YouTubeVideoMetadata> | null
      : null;
    const lookupError = dataApiResult.status === 'rejected'
      ? String(dataApiResult.reason)
      : dataApiResult.value.error?.message ?? (typeof value?.lookup_error === 'string' ? value.lookup_error : null);
    const oEmbedMetadata = oEmbedResult.status === 'fulfilled' ? oEmbedResult.value : null;
    if (lookupError) console.warn('YouTube upload-date lookup failed:', lookupError);
    return {
      title: typeof value?.title === 'string' ? value.title : oEmbedMetadata?.title ?? null,
      thumbnail_url: oEmbedMetadata?.thumbnail_url ?? (typeof value?.thumbnail_url === 'string' ? value.thumbnail_url : null),
      published_at: typeof value?.published_at === 'string' ? value.published_at : null,
      lookup_error: lookupError,
    } satisfies YouTubeVideoMetadata;
  })();
  youtubeMetadataLookups.set(videoId, request);
  const clearRequest = () => {
    if (youtubeMetadataLookups.get(videoId) === request) youtubeMetadataLookups.delete(videoId);
  };
  void request.then(clearRequest, clearRequest);
  return request;
}

/** Best-effort enrichment after the video row is safely saved. */
export async function updateCreatorVideoMetadata(videoId: string, metadata: YouTubeVideoMetadata) {
  const patch: { title?: string; youtube_thumbnail_url?: string; youtube_published_at?: string; youtube_metadata_checked_at: string } = {
    youtube_metadata_checked_at: new Date().toISOString(),
  };
  const title = metadata.title?.trim().slice(0, 120);
  if (title && !isPlaceholderCreatorVideoTitle(title)) patch.title = title;
  const thumbnailUrl = metadata.thumbnail_url?.trim();
  if (thumbnailUrl && /^https:\/\//i.test(thumbnailUrl)) patch.youtube_thumbnail_url = thumbnailUrl.slice(0, 500);
  if (metadata.published_at) patch.youtube_published_at = metadata.published_at;
  if (Object.keys(patch).length === 0) return;
  let result = await supabase.from('creator_videos' as never).update(patch as never).eq('id', videoId);
  // Keep metadata repair working while an older deployment is waiting for
  // the thumbnail-column migration. Title/date updates are still safe to
  // persist against that schema.
  if (result.error && 'youtube_thumbnail_url' in patch) {
    const { youtube_thumbnail_url: _thumbnail, ...legacyPatch } = patch;
    result = await supabase.from('creator_videos' as never).update(legacyPatch as never).eq('id', videoId);
  }
  if (result.error) throw result.error;
}

/** Fill missing YouTube title/date fields after save; lookup failures never hide the saved video. */
export function enrichCreatorVideoMetadata(video: CreatorVideoPage): Promise<CreatorVideoPage> {
  const needsTitle = isPlaceholderCreatorVideoTitle(video.title);
  if (video.youtube_metadata_checked_at || (!needsTitle && video.youtube_published_at)) return Promise.resolve(video);

  const existingRequest = creatorVideoMetadataRequests.get(video.id);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    try {
      const url = `https://www.youtube.com/watch?v=${encodeURIComponent(video.youtube_video_id)}`;
      let metadata = await lookupYouTubeVideoMetadata(url);
      // The first lookup may have returned a title from oEmbed while the
      // YouTube Data API request failed transiently. Retry the date lookup
      // once after saving, but never block the save itself.
      if (!metadata?.published_at) {
        await new Promise(resolve => window.setTimeout(resolve, 350));
        const retry = await lookupYouTubeVideoMetadata(url);
        if (retry) metadata = {
          title: retry.title || metadata?.title || null,
          thumbnail_url: retry.thumbnail_url || metadata?.thumbnail_url || null,
          published_at: retry.published_at,
        };
      }
      if (!metadata) {
        const checkedAt = new Date().toISOString();
        try {
          await updateCreatorVideoMetadata(video.id, { title: null, thumbnail_url: null, published_at: null });
        } catch {
          // Best effort. A later visit can retry if this row could not be updated.
        }
        return { ...video, youtube_metadata_checked_at: checkedAt };
      }
      const nextVideo = {
        ...video,
        title: metadata.title?.trim() && !isPlaceholderCreatorVideoTitle(metadata.title)
          ? metadata.title.trim().slice(0, 120)
          : video.title,
        youtube_thumbnail_url: metadata.thumbnail_url || video.youtube_thumbnail_url || null,
        youtube_published_at: metadata.published_at || video.youtube_published_at,
        youtube_metadata_checked_at: new Date().toISOString(),
      };
      try {
        await updateCreatorVideoMetadata(video.id, metadata);
      } catch {
        // Metadata display is useful even when persisting the best-effort lookup fails.
      }
      notifyCreatorVideoMetadataUpdated(nextVideo);
      return nextVideo;
    } catch {
      return video;
    } finally {
      creatorVideoMetadataRequests.delete(video.id);
    }
  })();
  creatorVideoMetadataRequests.set(video.id, request);
  return request;
}

/** Enrich a small bounded number of missing rows concurrently to avoid a lookup burst. */
export async function enrichCreatorVideoRows<T extends CreatorVideoPage>(videos: T[], concurrency = 4): Promise<T[]> {
  const enriched = videos.slice();
  let nextIndex = 0;
  const workerCount = Math.min(videos.length, Math.max(1, Math.floor(concurrency)));
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < videos.length) {
      const index = nextIndex++;
      enriched[index] = await enrichCreatorVideoMetadata(videos[index]) as T;
    }
  }));
  return enriched;
}

export function notifyCreatorVideoMetadataUpdated(video: CreatorVideoPage) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CREATOR_VIDEO_METADATA_UPDATED_EVENT, { detail: video }));
  }
}

export const creatorVideoMetadataUpdatedEvent = CREATOR_VIDEO_METADATA_UPDATED_EVENT;

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
    .select('catalog_items(id,title,cover_url,item_type,experience_type)')
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
