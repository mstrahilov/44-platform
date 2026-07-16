'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

export function Ui44OverflowTrackTitle({
  title,
  active = false,
  className = '',
}: {
  title: string;
  active?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const innerRef = useRef<HTMLSpanElement | null>(null);
  const [overflow, setOverflow] = useState(0);
  const [engaged, setEngaged] = useState(false);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;
    setOverflow(Math.max(0, Math.ceil(inner.scrollWidth - container.clientWidth)));
  }, []);

  useEffect(() => {
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (containerRef.current) observer?.observe(containerRef.current);
    if (innerRef.current) observer?.observe(innerRef.current);
    return () => observer?.disconnect();
  }, [measure, title]);

  const isOverflowing = overflow > 2;
  const durationSeconds = Math.max(3.5, Math.min(9, 2.8 + overflow / 34));
  const style = {
    '--ui44-track-overflow': `${overflow}px`,
    '--ui44-track-scroll-duration': `${durationSeconds}s`,
  } as CSSProperties;

  return (
    <span
      ref={containerRef}
      className={['view-track-title', 'ui44-overflow-track-title', active ? 'view-track-title-active' : '', className].filter(Boolean).join(' ')}
      data-overflow={String(isOverflowing)}
      data-engaged={String(active || engaged)}
      onPointerEnter={() => setEngaged(true)}
      onPointerLeave={() => setEngaged(false)}
      onFocus={() => setEngaged(true)}
      onBlur={() => setEngaged(false)}
      onPointerUp={event => {
        if (event.pointerType === 'touch' && isOverflowing) setEngaged(current => !current);
      }}
      title={title}
      style={style}
    >
      <span ref={innerRef} className="ui44-overflow-track-title-inner">{title}</span>
    </span>
  );
}
