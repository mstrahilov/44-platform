'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Service } from '@/lib/platform';
import { matchesCategory, matchesQuery } from '@/lib/taxonomy';
import { ServiceCard, PageShell, HubHero, EmptyMessage } from '@/components/Ui';
import { useServicesTopbarTabs } from '@/components/ServicesTopbarTabs';

export default function ServicesBrowsePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory] = useState(() => {
    if (typeof window === 'undefined') return 'all';
    return new URLSearchParams(window.location.search).get('category') ?? 'all';
  });
  const [query] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('q') ?? '';
  });

  useEffect(() => {
    async function fetchData() {
      const [{ data: serviceRows }, { data: categoryRows }] = await Promise.all([
        supabase
          .from('services')
          .select('*, creators:profiles!author_id(*, name:display_name), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('scope', 'services').order('sort_order'),
      ]);
      setServices((serviceRows as Service[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
    }
    fetchData();
  }, []);

  const serviceCatalog = services;
  const categoryCatalog = categories;

  const visible = useMemo(() => {
    return serviceCatalog.filter(service => {
      const cat = categoryCatalog.find(c => c.slug === activeCategory || c.name === activeCategory);
      const catMatch = activeCategory === 'all' || matchesCategory(service, cat);
      const qMatch = !query.trim() || matchesQuery(service, query);
      return catMatch && qMatch;
    });
  }, [activeCategory, categoryCatalog, query, serviceCatalog]);

  const label = activeCategory === 'all'
    ? 'All Services'
    : (categoryCatalog.find(c => c.slug === activeCategory)?.name ?? activeCategory);

  useServicesTopbarTabs('services');

  return (
    <PageShell>
      <div className="app-page">
        <HubHero title={label} />
        {visible.length === 0 ? (
          <EmptyMessage>No services here yet.</EmptyMessage>
        ) : (
          <div className="app-grid">
            {visible.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
