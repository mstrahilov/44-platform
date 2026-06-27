'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Category, Service } from '@/lib/platform';
import { FALLBACK_CATEGORIES, FALLBACK_SERVICES, serviceHref } from '@/lib/platform';
import { PageShell, SectionHeader, ServiceCard } from '@/components/Ui';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetchServices() {
      const [{ data: serviceRows }, { data: categoryRows }] = await Promise.all([
        supabase
          .from('services')
          .select('*, creators(id, slug, name, avatar_url), categories(id, slug, name)')
          .eq('status', 'published')
          .order('featured', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('scope', 'services').order('sort_order'),
      ]);

      setServices((serviceRows as Service[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
    }

    fetchServices();
  }, []);

  const serviceCatalog = services.length > 0 ? services : FALLBACK_SERVICES;
  const categoryCatalog = categories.length > 0
    ? categories
    : FALLBACK_CATEGORIES.filter(category => category.scope === 'services');
  const featured = serviceCatalog.find(service => service.featured) ?? serviceCatalog[0];
  const categoryCards = useMemo(() => {
    return categoryCatalog.map(category => ({
      category,
      service: serviceCatalog.find(service => service.category_id === category.id || service.categories?.slug === category.slug),
    })).filter(item => item.service);
  }, [categoryCatalog, serviceCatalog]);

  return (
    <PageShell>
        {featured && (
          <section style={{ minHeight: 420, borderRadius: 30, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.035)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,8,14,0.86), rgba(8,8,14,0.36) 55%, rgba(8,8,14,0.08))' }} />
            <div style={{ position: 'relative', zIndex: 1, minHeight: 420, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', maxWidth: 760 }}>
              <h1 style={{ fontSize: 58, fontWeight: 780, letterSpacing: '-0.04em', lineHeight: 0.94, color: '#fff', marginBottom: 14 }}>{featured.title}</h1>
              <p style={{ maxWidth: 580, fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.58)', lineHeight: 1.65, marginBottom: 22 }}>{featured.feature_description || featured.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Link className="btn-primary" href={serviceHref(featured)}>Learn More</Link>
                <Link className="btn-ghost" href="/services/browse">Browse All</Link>
              </div>
            </div>
          </section>
        )}

        <section>
          <SectionHeader title="Explore Services" href="/services/browse" />
          <div className="store-category-grid">
            {categoryCards.map(({ category }) => (
              <Link key={category.id} href={`/services/browse?category=${category.slug}`} style={{ minHeight: 120, borderRadius: 20, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.035)', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,18,0.04), rgba(10,10,18,0.72))' }} />
                <div style={{ position: 'relative', zIndex: 1, fontSize: 18, fontWeight: 750, color: '#fff', letterSpacing: '-0.02em' }}>{category.name}</div>
              </Link>
            ))}
          </div>
        </section>

        {categoryCatalog.slice(0, 5).map(category => {
          const shelfServices = serviceCatalog.filter(service => service.category_id === category.id || service.categories?.slug === category.slug).slice(0, 8);
          if (shelfServices.length === 0) return null;

          return (
            <section key={category.id}>
              <SectionHeader title={category.name} href={`/services/browse?category=${category.slug}`} />
              <div className="service-shelf">
                {shelfServices.map(service => (
                  <div key={service.id} className="service-shelf-item">
                    <ServiceCard service={service} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
    </PageShell>
  );
}
