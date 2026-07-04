'use client';

import Link from 'next/link';
import { PageShell, HubHero, EmptyMessage } from '@/components/Ui';
import { useServicesTopbarTabs } from '@/components/ServicesTopbarTabs';

export default function ServicesRequestsPage() {
  useServicesTopbarTabs('requests');

  return (
    <PageShell>
      <div className="app-page">
        <HubHero
          title="Service Requests"
          copy="Draft briefs, submitted requests, and project intake history will collect here."
        />
        <EmptyMessage>
          Requests workspace coming soon.
          <div style={{ marginTop: 18 }}>
            <Link href="/services" className="os-button os-button-primary os-button-compact">Start With Services</Link>
          </div>
        </EmptyMessage>
      </div>
    </PageShell>
  );
}
