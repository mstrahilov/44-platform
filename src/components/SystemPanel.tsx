'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const fallback = defaultTab ?? tabs[0]?.id ?? '';
    if (!tabs.some(tab => tab.id === activeTab) || !activeTab) {
      setActiveTab(fallback);
    }
  }, [activeTab, defaultTab, tabs]);

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
