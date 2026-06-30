'use client';

import { useState } from 'react';

type Tab = { label: string; id: string };

interface Props {
  tabs: Tab[];
  defaultTab?: string;
  avatar?: React.ReactNode;
  children: (activeTab: string) => React.ReactNode;
}

export function SystemPanel({ tabs, defaultTab, avatar, children }: Props) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? '');

  return (
    <div className="system-panel">
      <div className="system-panel-header">
        <div className="system-panel-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              className={t.id === activeTab ? 'system-panel-tab system-panel-tab-active' : 'system-panel-tab'}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {avatar && <div className="system-panel-avatar">{avatar}</div>}
      </div>
      <div className="system-panel-content">
        {children(activeTab)}
      </div>
    </div>
  );
}
