import 'server-only';

import { commerceAdminClient } from '@/lib/server/commerce';

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const PLACEHOLDER_TITLE = /^(?:youtube\s+)?video(?:\s+\d+)?$/i;

type VideoRow = {
  id: string;
  title: string;
  youtube_video_id: string;
  youtube_published_at: string | null;
  youtube_metadata_checked_at: string | null;
};

type Metadata = {
  title: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
};

function isUsefulTitle(value: string | null | undefined) {
  return Boolean(value?.trim()) && !PLACEHOLDER_TITLE.test(value!.trim());
}

async function fetchMetadata(videoId: string): Promise<Metadata> {
  const oEmbedUrl = new URL('https://www.youtube.com/oembed');
  oEmbedUrl.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`);
  oEmbedUrl.searchParams.set('format', 'json');
  const oEmbedResponse = await fetch(oEmbedUrl, { signal: AbortSignal.timeout(10_000), cache: 'no-store' });
  const oEmbed = oEmbedResponse.ok
    ? await oEmbedResponse.json() as { title?: unknown; thumbnail_url?: unknown }
    : {};

  let api: { title?: unknown; publishedAt?: unknown; thumbnails?: Record<string, { url?: unknown }> } = {};
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (apiKey) {
    const apiUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    apiUrl.searchParams.set('part', 'snippet');
    apiUrl.searchParams.set('id', videoId);
    apiUrl.searchParams.set('key', apiKey);
    const apiResponse = await fetch(apiUrl, { signal: AbortSignal.timeout(10_000), cache: 'no-store' });
    if (apiResponse.ok) {
      const payload = await apiResponse.json() as { items?: Array<{ snippet?: typeof api }> };
      api = payload.items?.[0]?.snippet ?? {};
    }
  }

  const thumbnailFromApi = Object.values(api.thumbnails ?? {})
    .map(value => value.url)
    .find((value): value is string => typeof value === 'string' && value.startsWith('https://')) ?? null;
  return {
    title: typeof api.title === 'string' ? api.title : typeof oEmbed.title === 'string' ? oEmbed.title : null,
    // oEmbed intentionally wins here: it returns YouTube's stable HQ
    // thumbnail, while maxresdefault can be an HTTP-200 generic placeholder.
    thumbnail_url: typeof oEmbed.thumbnail_url === 'string' ? oEmbed.thumbnail_url : thumbnailFromApi,
    published_at: typeof api.publishedAt === 'string' ? api.publishedAt : null,
  };
}

export async function refreshCreatorVideoMetadata(limit = 100) {
  const admin = commerceAdminClient();
  const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const result = await admin
    .from('creator_videos' as never)
    .select('id,title,youtube_video_id,youtube_published_at,youtube_metadata_checked_at')
    .or(`youtube_metadata_checked_at.is.null,youtube_metadata_checked_at.lt.${staleBefore}`)
    .order('youtube_metadata_checked_at', { ascending: true, nullsFirst: true })
    .limit(Math.min(Math.max(limit, 1), 250));
  if (result.error) throw result.error;

  const rows = (result.data ?? []) as unknown as VideoRow[];
  let updated = 0;
  let failed = 0;
  for (const row of rows) {
    if (!YOUTUBE_VIDEO_ID.test(row.youtube_video_id)) { failed += 1; continue; }
    try {
      const metadata = await fetchMetadata(row.youtube_video_id);
      const patch: Record<string, string> = { youtube_metadata_checked_at: new Date().toISOString() };
      if (isUsefulTitle(metadata.title)) patch.title = metadata.title!.trim().slice(0, 120);
      if (metadata.thumbnail_url?.startsWith('https://')) patch.youtube_thumbnail_url = metadata.thumbnail_url.slice(0, 500);
      if (metadata.published_at) patch.youtube_published_at = metadata.published_at;
      const update = await admin.from('creator_videos' as never).update(patch as never).eq('id', row.id);
      if (update.error) throw update.error;
      updated += 1;
    } catch (error) {
      failed += 1;
      console.warn(`[video-metadata-refresh] failed ${row.id}:`, error instanceof Error ? error.message : 'unknown_error');
    }
  }
  return { scanned: rows.length, updated, failed };
}
