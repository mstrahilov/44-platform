'use client';

import { PageShell, HubHero, HubSection, EmptyMessage } from '@/components/Ui';

export default function RadioPage() {
  return (
    <PageShell>
      <main className="app-page">
        <HubHero title="Radio" copy="Live mixes, creator stations, and listening rooms for 44." />
        <HubSection title="Stations">
          <EmptyMessage>Radio stations are coming into 44OS soon.</EmptyMessage>
        </HubSection>
      </main>
    </PageShell>
  );
}
