'use client';

import type { ReactNode } from 'react';

export function MobileToolbar({
  title,
  hideTitle = false,
  leading,
  trailing,
}: {
  title: string;
  hideTitle?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="os-mobile-toolbar" aria-label={`${title} toolbar`}>
      <div className="os-mobile-toolbar-slot os-mobile-toolbar-slot-leading">{leading}</div>
      <h1 className={`os-mobile-toolbar-title${hideTitle ? ' os-mobile-toolbar-title-hidden' : ''}`} aria-hidden={hideTitle || undefined}>{title}</h1>
      <div className="os-mobile-toolbar-slot os-mobile-toolbar-slot-trailing">{trailing}</div>
    </div>
  );
}
