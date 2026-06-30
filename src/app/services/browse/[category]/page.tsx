'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Service } from '@/lib/platform';
import { FALLBACK_CATEGORIES, FALLBACK_SERVICES } from '@/lib/platform';
import { matchesCategory } from '@/lib/taxonomy';
import { ServiceCard, PageShell } from '@/components/Ui';

export default function ServicesCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

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

  const serviceCatalog = services.length > 0 ? services : FALLBACK_SERVICES;
  const categoryCatalog = categories.length > 0
    ? categories
    : FALLBACK_CATEGORIES.filter(c => c.scope === 'services');

  const cat = categoryCatalog.find(c => c.slug === category || c.name.toLowerCase() === category);
  const label = cat?.name ?? category.charAt(0).toUpperCase() + category.slice(1);

  const visible = useMemo(() => {
    return serviceCatalog.filter(s => matchesCategory(s, cat));
  }, [serviceCatalog, cat]);

  return (
    <PageShell>
      <style>{`
        .browse-page { display: flex; flex-direction: column; gap: 20px; }
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
