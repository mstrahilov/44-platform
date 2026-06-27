'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Category, Service } from '@/lib/platform';
import { FALLBACK_CATEGORIES, FALLBACK_SERVICES } from '@/lib/platform';
import { FilterSidebar, ServiceCard, SurfaceBar } from '@/components/Ui';

export default function ServicesBrowsePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const q = params.get('q');
    Promise.resolve().then(() => {
      if (category) setActiveCategory(category);
      if (q) setQuery(q);
    });
  }, []);

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
    : FALLBACK_CATEGORIES.filter(category => category.scope === 'services');

  const visibleServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return serviceCatalog.filter(service => {
      const category = categoryCatalog.find(item => item.slug === activeCategory || item.name === activeCategory);
      const matchesCategory = activeCategory === 'all' || (category && (service.category_id === category.id || service.categories?.slug === category.slug));
      const matchesQuery = !normalizedQuery
        || service.title.toLowerCase().includes(normalizedQuery)
        || (service.description ?? '').toLowerCase().includes(normalizedQuery)
        || (service.creators?.name ?? '').toLowerCase().includes(normalizedQuery)
        || (service.categories?.name ?? '').toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, categoryCatalog, query, serviceCatalog]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 56px' }}>
      <div className="browse-shell">
        <FilterSidebar>
          <div>
            <div style={{ fontSize: 26, fontWeight: 750, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>Browse Services</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.38)', marginTop: 6 }}>{visibleServices.length} services</div>
          </div>
          <input className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search services..." />
          <div className="divider" />
          <FilterButton active={activeCategory === 'all'} onClick={() => setActiveCategory('all')}>All Services</FilterButton>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginBottom: 8 }}>Categories</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {categoryCatalog.map(category => (
                <FilterButton key={category.id} active={activeCategory === category.slug} onClick={() => setActiveCategory(category.slug)}>{category.name}</FilterButton>
              ))}
            </div>
          </div>
        </FilterSidebar>

        <main style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <SurfaceBar>
            <div>
              <div className="surface-eyebrow">Services</div>
              <div className="surface-title">Find expert help</div>
            </div>
            <Link className="btn-ghost" href="/services">Back to Services</Link>
          </SurfaceBar>

          <div className="service-grid">
            {visibleServices.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', background: active ? 'rgba(255,255,255,0.12)' : 'transparent', border: `1px solid ${active ? 'rgba(255,255,255,0.18)' : 'transparent'}`, borderRadius: 12, padding: '9px 11px', fontSize: 12, fontWeight: 650, color: active ? '#fff' : 'rgba(255,255,255,0.46)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
    >
      {children}
    </button>
  );
}
