'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Service } from '@/lib/platform';
import { matchesCategory } from '@/lib/taxonomy';
import { ServiceCard, PageShell } from '@/components/Ui';
import { useTopbarTabs } from '@/components/TopbarContext';

export default function ServicesCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useTopbarTabs(
    categories.length > 0
      ? [
          { id: 'all', label: 'All', href: '/services' },
          ...categories.slice(0, 5).map(c => ({
            id: c.slug,
            label: c.name,
            href: `/services/browse/${c.slug}`,
            active: c.slug === category,
          })),
        ]
      : undefined,
  );

  useEffect(() => {
    async function fetchData() {
      const [{ data: serviceRows }, { data: categoryRows }] = await Promise.all([
        supabase
          .from('services')
          .select('*, creators:profiles!author_id(id, slug, name:display_name, avatar_url), categories(id, slug, name)')
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

  const visible = useMemo(() => {
    return serviceCatalog.filter(s => matchesCategory(s, cat));
  }, [serviceCatalog, cat]);

  return (
    <PageShell>
      <style>{`
        .browse-page { display: flex; flex-direction: column; gap: var(--os-space-7); }
      `}</style>
      <div className="browse-page">
        <h1 className="browse-page-title os-type-display">{label}</h1>
        <div className="service-grid">
          {visible.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
