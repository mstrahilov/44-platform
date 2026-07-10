'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Service } from '@/lib/platform';
import { matchesCategory } from '@/lib/taxonomy';
import { ServiceCard, PageShell, HubHero, EmptyMessage } from '@/components/Ui';
import { useServicesTopbarTabs } from '@/components/ServicesTopbarTabs';

export default function ServicesCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useServicesTopbarTabs('services');

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

  const cat = categoryCatalog.find(c => c.slug === category || c.name.toLowerCase() === category);
  const label = cat?.name ?? category.charAt(0).toUpperCase() + category.slice(1);
  const description = SERVICE_CATEGORY_DESCRIPTIONS[category.toLowerCase()]
    ?? `Services from creators in ${label}.`;

  const visible = useMemo(() => {
    return serviceCatalog.filter(s => matchesCategory(s, cat));
  }, [serviceCatalog, cat]);

  return (
    <PageShell>
      <div className="app-page">
        <HubHero title={label} copy={description} />
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

const SERVICE_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  audio: 'Mixing, mastering, recording, and audio production from creators.',
  video: 'Editing, motion, color, and video production from creators.',
  design: 'Brand, graphic, web, and product design from creators.',
  development: 'Web, app, and software engineering from creators.',
  business: 'Strategy, marketing, and operations help from creators.',
};
