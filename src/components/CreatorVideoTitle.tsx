'use client';

import { useEffect, useRef, useState } from 'react';

const titleLookups = new Map<string, Promise<string | null>>();

function placeholderTitle(value: string) {
  const title = value.trim().toLowerCase();
  return !title || /^youtube video(?:\s+\d+)?$/.test(title);
}

async function resolveTitle(videoId: string) {
  let lookup = titleLookups.get(videoId);
  if (!lookup) {
    lookup = fetch(`/api/videos/metadata?videoId=${encodeURIComponent(videoId)}`)
      .then(response => response.ok ? response.json() as Promise<{ title?: unknown }> : null)
      .then(payload => typeof payload?.title === 'string' ? payload.title.trim() || null : null)
      .catch(() => null);
    titleLookups.set(videoId, lookup);
  }
  return lookup;
}

export function CreatorVideoTitle({
  videoId,
  storedTitle,
  className,
}: {
  videoId: string;
  storedTitle: string;
  className?: string;
}) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [resolvedTitle, setResolvedTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!placeholderTitle(storedTitle)) return;
    const element = elementRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '120px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [storedTitle]);

  useEffect(() => {
    if (!visible || !placeholderTitle(storedTitle)) return;
    let active = true;
    void resolveTitle(videoId).then(title => { if (active) setResolvedTitle(title); });
    return () => { active = false; };
  }, [storedTitle, videoId, visible]);

  const title = resolvedTitle || (placeholderTitle(storedTitle) ? 'Video' : storedTitle);
  return <span ref={elementRef} className={className}>{title}</span>;
}
