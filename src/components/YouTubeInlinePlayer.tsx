'use client';

/** Use YouTube's native embed so its default thumbnail and playback controls render. */
export function YouTubeInlinePlayer({
  videoId,
  title = 'YouTube video',
  className = '',
}: {
  videoId: string;
  title?: string;
  className?: string;
}) {
  return <div className={`youtube-inline-player ${className}`.trim()}>
    <iframe
      title={title}
      src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?playsinline=1&rel=0`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  </div>;
}
