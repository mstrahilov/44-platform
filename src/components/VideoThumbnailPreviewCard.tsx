'use client';

import { useEffect, useState } from 'react';
import type { CreatorVideoPage } from '@/lib/domain/releaseFeatures';

type VideoThumbnailPreviewCardProps = {
  video: Pick<CreatorVideoPage, 'id' | 'title' | 'youtube_video_id'> & { youtube_thumbnail_url?: string | null };
  className?: string;
};

export function VideoThumbnailPreviewCard({ video, className = '' }: VideoThumbnailPreviewCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const placeholderTitle = !video.title.trim() || /^(?:youtube\s+)?video(?:\s+\d+)?$/i.test(video.title.trim());
  const [metadataTitle, setMetadataTitle] = useState<string | null>(null);
  const storedThumbnailIsMaxRes = Boolean(video.youtube_thumbnail_url && /\/maxresdefault\.jpg(?:$|\?)/i.test(video.youtube_thumbnail_url));
  const needsMetadata = placeholderTitle || !video.youtube_thumbnail_url || storedThumbnailIsMaxRes;
  const [metadataThumbnail, setMetadataThumbnail] = useState<string | null>(needsMetadata ? null : video.youtube_thumbnail_url ?? null);
  const [thumbnailQuality, setThumbnailQuality] = useState<'maxresdefault' | 'hqdefault' | 'default' | null>(needsMetadata ? null : 'maxresdefault');
  const [thumbnailUnavailable, setThumbnailUnavailable] = useState(false);
  useEffect(() => {
    if (!needsMetadata) return;
    const controller = new AbortController();
    void fetch(`/api/videos/metadata?videoId=${encodeURIComponent(video.youtube_video_id)}`, {
      signal: controller.signal,
      cache: 'force-cache',
    }).then(async response => {
      if (!response.ok) return null;
      return await response.json() as { title?: unknown; thumbnail_url?: unknown; thumbnail_available?: unknown };
    }).then(payload => {
      if (!payload) return;
      if (typeof payload.title === 'string' && payload.title.trim() && !/^(?:youtube\s+)?video(?:\s+\d+)?$/i.test(payload.title.trim())) {
        setMetadataTitle(payload.title.trim().slice(0, 120));
      }
      if (typeof payload.thumbnail_url === 'string' && /^https:\/\//i.test(payload.thumbnail_url)) setMetadataThumbnail(payload.thumbnail_url);
      else if (payload.thumbnail_available === false) setThumbnailUnavailable(true);
      else setThumbnailQuality('maxresdefault');
    }).catch(() => {
      // The card remains playable with its stable YouTube ID even when oEmbed is unavailable.
    });
    return () => controller.abort();
  }, [needsMetadata, placeholderTitle, video.youtube_video_id]);

  const title = metadataTitle ?? (placeholderTitle ? 'Video' : video.title.trim());
  const thumbnailUrl = !thumbnailUnavailable ? metadataThumbnail ?? (thumbnailQuality
    ? `https://i.ytimg.com/vi/${encodeURIComponent(video.youtube_video_id)}/${thumbnailQuality}.jpg`
    : null) : null;

  return <article className={`video-thumbnail-preview-card ${className}`.trim()}>
    <div className="video-thumbnail-preview-frame">
      {isPlaying ? <iframe
        title={`YouTube video: ${title}`}
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtube_video_id)}?playsinline=1&rel=0&autoplay=1`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      /> : <button
        type="button"
        className="video-thumbnail-preview-trigger"
        onClick={() => setIsPlaying(true)}
        aria-label={`Play ${title}`}
      >
        {thumbnailUrl ? <img // eslint-disable-line @next/next/no-img-element
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => {
            if (metadataThumbnail) {
              setMetadataThumbnail(null);
              setThumbnailQuality('maxresdefault');
            }
            else setThumbnailQuality(current => current === 'maxresdefault' ? 'hqdefault' : current === 'hqdefault' ? 'default' : null);
          }}
        /> : null}
        <span className="video-thumbnail-preview-play" aria-hidden="true"><span /></span>
      </button>}
    </div>
    <div className="video-thumbnail-preview-title" title={title}>{title}</div>
  </article>;
}
