'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Service } from '@/lib/platform';
import { FALLBACK_CATEGORIES, FALLBACK_SERVICES } from '@/lib/platform';
import { matchesCategory, matchesQuery } from '@/lib/taxonomy';
import { BrowsePanel, DockedContent, DockedLayout, ServiceCard } from '@/components/Ui';

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
      const categoryMatches = activeCategory === 'all' || matchesCategory(service, category);
      const queryMatches = !normalizedQuery || matchesQuery(service, query);

      return categoryMatches && queryMatches;
    });
  }, [activeCategory, categoryCatalog, query, serviceCatalog]);

  function activateCategory(slug: string) {
    setActiveCategory(slug);
  }

  function countForCategory(category: Category) {
    return serviceCatalog.filter(service => matchesCategory(service, category)).length;
  }

  return (
    <DockedLayout side="left">
        <BrowsePanel
          title="Browse Services"
          totalCount={serviceCatalog.length}
          activeId={activeCategory}
          onSelect={activateCategory}
          onClear={() => {
            setActiveCategory('all');
            setQuery('');
          }}
          categories={categoryCatalog.map(category => ({
            id: category.slug,
            label: category.name,
            icon: category.slug,
            count: countForCategory(category),
          }))}
        />

        <DockedContent>
          <div className="service-grid">
            {visibleServices.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </DockedContent>
    </DockedLayout>
  );
}
