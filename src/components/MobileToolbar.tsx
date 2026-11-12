'use client';

import type { ReactNode } from 'react';

export function MobileToolbar({
  title,
  leading,
  trailing,
}: {
  title: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="os-mobile-toolbar" aria-label={`${title} toolbar`}>
      <div className="os-mobile-toolbar-slot os-mobile-toolbar-slot-leading">{leading}</div>
      <h1 className="os-mobile-toolbar-title">{title}</h1>
      <div className="os-mobile-toolbar-slot os-mobile-toolbar-slot-trailing">{trailing}</div>
    </div>
  );
}
