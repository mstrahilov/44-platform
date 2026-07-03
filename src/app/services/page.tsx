'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/lib/platform';
import { PageShell, HubHero, HubSection, Shelf, ServiceCard } from '@/components/Ui';
import { useTopbarTabs } from '@/components/TopbarContext';

type Category = {
  id: string;
  scope: string;
  slug: string;
  name: string;
  sort_order: number | null;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

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

    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('id, scope, slug, name, sort_order')
        .eq('scope', 'services')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      setCategories((data ?? []) as Category[]);
    }

    fetchServices();
    fetchCategories();
  }, []);

  const orderedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const aOrder = a.sort_order ?? 999;
      const bOrder = b.sort_order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    }).filter(category => services.some(service => {
      const svc = service.categories;
      return (
        service.category_id === category.id ||
        svc?.slug === category.slug ||
        svc?.name === category.name
      );
    }));
  }, [categories, services]);

  useTopbarTabs(
    orderedCategories.length > 0
      ? [
          { id: 'all', label: 'All', href: '/services', active: true },
          ...orderedCategories.slice(0, 5).map(c => ({
            id: c.slug,
            label: c.name,
            href: `/services/browse/${c.slug}`,
          })),
        ]
      : undefined,
  );

  return (
    <PageShell>
      <div className="app-page">
        <HubHero
          title="Services"
          copy="Find people who can help with audio, video, design, development, and business work."
        />

        {orderedCategories.map(category => {
          const categoryServices = services
            .filter(service => {
              const svc = service.categories;
              return (
                service.category_id === category.id ||
                svc?.slug === category.slug ||
                svc?.name === category.name
              );
            })
            .slice(0, 8);

          if (categoryServices.length === 0) return null;

          return (
            <HubSection key={category.slug} title={`Explore ${category.name}`} href={`/services/browse/${category.slug}`}>
              <Shelf>
                {categoryServices.map(service => (
                  <div key={service.id} className="app-shelf-item">
                    <ServiceCard service={service} />
                  </div>
                ))}
              </Shelf>
            </HubSection>
          );
        })}
      </div>
    </PageShell>
  );
}
