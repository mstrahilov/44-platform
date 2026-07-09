'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/lib/platform';
import { PageShell, HubHero, EmptyMessage, ServiceCard } from '@/components/Ui';
import { useServicesTopbarTabs } from '@/components/ServicesTopbarTabs';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    async function fetchServices() {
      const select = '*, creators:profiles!author_id(*, name:display_name), categories(id, slug, name, sort_order)';

      const publishedResult = await supabase
        .from('services')
        .select(select)
        .eq('is_published', true)
        .order('featured', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (!publishedResult.error) {
        setServices((publishedResult.data ?? []) as Service[]);
        return;
      }

      const fallbackResult = await supabase
        .from('services')
        .select(select)
        .order('created_at', { ascending: false });

      setServices((fallbackResult.data ?? []) as Service[]);
    }
    fetchServices();
  }, []);

  useServicesTopbarTabs('services');

  return (
    <PageShell>
      <div className="app-page">
        <HubHero
          title="Services"
          copy="Start a project with 44-operated creative services for audio, video, design, development, and campaign work."
        />

        {services.length === 0 ? (
          <EmptyMessage>No services here yet.</EmptyMessage>
        ) : (
          <div className="app-grid">
            {services.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
