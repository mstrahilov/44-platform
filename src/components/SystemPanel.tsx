'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTopbarTabs } from './TopbarContext';

type Tab = { label: string; id: string; href?: string };

interface Props {
  tabs: Tab[];
  defaultTab?: string;
  avatar?: React.ReactNode;
  children: (activeTab: string) => React.ReactNode;
}

export function SystemPanel({ tabs, defaultTab, children }: Props) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? '');

  useTopbarTabs(
    tabs.map(t => ({
      id: t.id,
      label: t.label,
      href: t.href,
      onClick: t.href ? undefined : () => setActiveTab(t.id),
      active: t.id === activeTab,
    })),
  );

  return (
    <div className="system-panel">
      <div className="system-panel-content">
        {children(activeTab)}
      </div>
    </div>
  );
}
