'use client';

import Link from 'next/link';
import { PageShell, HubHero, EmptyMessage } from '@/components/Ui';
import { useServicesTopbarTabs } from '@/components/ServicesTopbarTabs';

export default function ServicesProjectsPage() {
  useServicesTopbarTabs('projects');

  return (
    <PageShell>
      <div className="app-page">
        <HubHero
          title="Service Projects"
          copy="Active 44 service work will live here as the project workspace evolves."
        />
        <EmptyMessage>
          Project list coming soon.
          <div style={{ marginTop: 18 }}>
            <Link href="/services" className="os-button os-button-primary os-button-compact">Browse Services</Link>
          </div>
        </EmptyMessage>
      </div>
    </PageShell>
  );
}
