/** Creator video titles are optional enrichment; URL saving and playback do
 * not depend on the metadata endpoint succeeding. */
export function CreatorVideoTitle({
  storedTitle,
  className,
}: {
  videoId: string;
  storedTitle: string;
  className?: string;
}) {
  const title = storedTitle.trim();
  const isPlaceholder = !title || /^youtube video(?:\s+\d+)?$/i.test(title);
  return <span className={className}>{isPlaceholder ? 'Video' : title}</span>;
}
