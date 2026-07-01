'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Service } from '@/lib/platform';
import { matchesCategory, matchesQuery } from '@/lib/taxonomy';
import { ServiceCard, PageShell } from '@/components/Ui';

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
          .select('*, creators(id, slug, name, avatar_url), categories(id, slug, name)')
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

  return (
    <PageShell>
      <style>{`
        .browse-page { display: flex; flex-direction: column; gap: 20px; }
        .browse-heading { display: flex; flex-direction: column; gap: 6px; }
        .service-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
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
