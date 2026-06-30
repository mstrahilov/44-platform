'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/lib/platform';
import { formatServicePrice, serviceHref } from '@/lib/platform';
import { PageShell } from '@/components/Ui';

type Category = {
  id: string;
  scope: string;
  slug: string;
  name: string;
  sort_order: number | null;
};

type ServiceWithExtras = Service & {
  featured?: boolean | null;
  category_id?: string | null;
  cover_url?: string | null;
  description?: string | null;
  categories?: {
    id?: string | null;
    slug?: string | null;
    name?: string | null;
    sort_order?: number | null;
  } | null;
  creators?: {
    id?: string | null;
    slug?: string | null;
    name?: string | null;
    avatar_url?: string | null;
  } | null;
};

const SERVICE_ICON_MAP: Record<string, string> = {
  Audio: '/icons/browse/music.svg',
  Video: '/icons/browse/video.svg',
  Design: '/icons/browse/design.svg',
  Development: '/icons/browse/development.svg',
  Marketing: '/icons/browse/marketing.svg',
  Business: '/icons/browse/assets.svg',
};

const FALLBACK_SERVICE_CATEGORIES: Category[] = [
  { id: 'audio', scope: 'services', slug: 'audio', name: 'Audio', sort_order: 10 },
  { id: 'design', scope: 'services', slug: 'design', name: 'Design', sort_order: 20 },
  { id: 'development', scope: 'services', slug: 'development', name: 'Development', sort_order: 30 },
  { id: 'video', scope: 'services', slug: 'video', name: 'Video', sort_order: 40 },
  { id: 'business', scope: 'services', slug: 'business', name: 'Business', sort_order: 50 },
];

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceWithExtras[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetchServices() {
      const select = '*, creators(id, slug, name, avatar_url), categories(id, slug, name, sort_order)';

      const publishedResult = await supabase
        .from('services')
        .select(select)
        .eq('is_published', true)
        .order('featured', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (!publishedResult.error) {
        setServices((publishedResult.data ?? []) as ServiceWithExtras[]);
        return;
      }

      const fallbackResult = await supabase
        .from('services')
        .select(select)
        .order('created_at', { ascending: false });

      setServices((fallbackResult.data ?? []) as ServiceWithExtras[]);
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
    const liveCategories = categories.length > 0 ? categories : FALLBACK_SERVICE_CATEGORIES;
    return [...liveCategories].sort((a, b) => {
      const aOrder = a.sort_order ?? 999;
      const bOrder = b.sort_order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });
  }, [categories]);

  const newest = services.slice(0, 10);

  const categoryTiles = useMemo(() => {
    return orderedCategories.map(category => {
      const count = services.filter(service => {
        const svc = service.categories;
        return (
          service.category_id === category.id ||
          svc?.slug === category.slug ||
          svc?.name === category.name
        );
      }).length;
      return { ...category, count };
    });
  }, [orderedCategories, services]);

  return (
    <PageShell>
      <style>{`
        .svc-page {
          display: grid;
          gap: var(--os-space-10);
        }

        .svc-hero {
          position: relative;
          min-height: 400px;
          border-radius: var(--os-radius-8);
          overflow: hidden;
          background: var(--os-paper-bg);
          border: 1px solid var(--os-paper-border);
          box-shadow: var(--os-paper-card-shadow), var(--os-paper-highlight);
          color: var(--os-color-ink);
          isolation: isolate;
        }

        .svc-hero-content {
          position: relative;
          z-index: 2;
          min-height: 400px;
          padding: var(--os-space-10);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: flex-start;
        }

        .svc-hero-title {
          max-width: 700px;
          margin: 0;
          color: var(--os-color-ink);
        }

        .svc-hero-copy {
          max-width: 620px;
          margin: var(--os-space-4) 0 0;
          color: var(--os-color-ink-secondary);
        }

        .svc-section {
          display: grid;
          gap: var(--os-space-5);
        }

        .svc-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--os-space-5);
        }

        .svc-section-title {
          margin: 0;
          color: var(--os-color-ink);
        }

        .svc-section-action {
          color: var(--os-color-ink);
          background: rgba(255,255,255,.10);
          border-color: rgba(255,255,255,.18);
          box-shadow: var(--os-shadow-2), var(--os-glass-highlight);
          backdrop-filter: blur(var(--os-glass-blur-soft)) saturate(1.22);
          -webkit-backdrop-filter: blur(var(--os-glass-blur-soft)) saturate(1.22);
        }

        .svc-category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--os-card-gap);
        }

        .svc-category-tile {
          width: 100%;
        }

        .svc-category-count {
          color: var(--os-color-ink-muted);
        }

        .svc-shelf {
          display: flex;
          gap: var(--os-card-gap);
          overflow-x: auto;
          padding: var(--os-space-2) 0 var(--os-space-5);
          scroll-snap-type: x proximity;
        }

        .svc-shelf::-webkit-scrollbar {
          height: 8px;
        }

        .svc-shelf::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.12);
          border-radius: var(--os-radius-pill);
        }

        .svc-shelf-item {
          flex: 0 0 auto;
          width: 280px;
          scroll-snap-align: start;
        }

        .svc-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-radius: var(--os-radius-5);
          overflow: hidden;
          background: var(--os-glass-panel-bg);
          border: 1px solid var(--os-glass-panel-border);
          box-shadow: var(--os-shadow-card), var(--os-glass-highlight);
          backdrop-filter: blur(var(--os-glass-blur)) saturate(1.6);
          -webkit-backdrop-filter: blur(var(--os-glass-blur)) saturate(1.6);
          text-decoration: none;
          color: var(--os-color-ink);
        }

        .svc-card-art {
          aspect-ratio: 3 / 2;
          overflow: hidden;
          position: relative;
          background: var(--os-glass-recessed-bg);
          border-bottom: 1px solid var(--os-glass-panel-border);
          flex-shrink: 0;
        }

        .svc-card-art img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .svc-card-body {
          padding: var(--os-space-4);
          display: flex;
          flex-direction: column;
          gap: var(--os-space-2);
          flex: 1;
        }

        .svc-card-title {
          color: var(--os-color-ink);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .svc-card-description {
          color: var(--os-color-ink-secondary);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .svc-card-footer {
          padding: var(--os-space-3) var(--os-space-4) var(--os-space-4);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--os-space-3);
          border-top: 1px solid var(--os-glass-panel-border);
        }

        .svc-card-price {
          color: var(--os-color-ink);
        }

        .svc-empty {
          padding: var(--os-space-7);
          border-radius: var(--os-radius-6);
          background: rgba(255,255,255,.06);
          border: 1px solid var(--os-panel-border);
          color: var(--os-color-ink-secondary);
        }

        @media (max-width: 760px) {
          .svc-hero {
            min-height: 340px;
          }
          .svc-hero-content {
            min-height: 340px;
            padding: var(--os-space-7);
          }
          .svc-section-head {
            align-items: flex-start;
            flex-direction: column;
          }
          .svc-category-grid {
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          }
          .svc-shelf-item {
            width: 240px;
          }
        }
      `}</style>

      <div className="svc-page">
        <ServiceHero />

        {categoryTiles.length > 0 && (
          <section className="svc-section" aria-label="Service categories">
            <div className="svc-section-head">
              <h2 className="svc-section-title os-type-panel-title">Browse by Category</h2>
            </div>
            <div className="svc-category-grid">
              {categoryTiles.map(category => (
                <CategoryTile key={category.slug} category={category} />
              ))}
            </div>
          </section>
        )}

        {newest.length > 0 && (
          <section className="svc-section">
            <SvcSectionHead title="Featured Services" href="/services/browse" />
            <ServiceShelf services={newest} />
          </section>
        )}

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
            <section key={category.slug} className="svc-section">
              <SvcSectionHead
                title={`Explore ${category.name}`}
                href={`/services/browse?category=${category.slug}`}
              />
              <ServiceShelf services={categoryServices} />
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}

function SvcSectionHead({ title, href }: { title: string; href?: string }) {
  return (
    <div className="svc-section-head">
      <h2 className="svc-section-title os-type-panel-title">{title}</h2>
      {href && (
        <Link className="os-button os-button-glass os-button-compact svc-section-action" href={href}>
          View All
        </Link>
      )}
    </div>
  );
}

function ServiceHero() {
  return (
    <section className="svc-hero">
      <div className="svc-hero-content">
        <h1 className="svc-hero-title os-type-display">Services</h1>
        <p className="svc-hero-copy os-type-body">
          Find people who can help with audio, video, design, development, and business work.
        </p>
      </div>
    </section>
  );
}

function CategoryTile({ category }: { category: Category & { count: number } }) {
  const icon = SERVICE_ICON_MAP[category.name] ?? '/icons/browse/grid.svg';

  return (
    <Link href={`/services/browse?category=${category.slug}`} className="os-category-icon-card svc-category-tile">
      <div className="os-category-icon">
        <img src={icon} alt="" />
      </div>
      <div className="os-category-card-title os-type-section-title">{category.name}</div>
    </Link>
  );
}

function ServiceShelf({ services }: { services: ServiceWithExtras[] }) {
  if (services.length === 0) {
    return (
      <div className="svc-empty os-type-body-small">
        No services available in this category yet.
      </div>
    );
  }

  return (
    <div className="svc-shelf">
      {services.map(service => (
        <div key={service.id} className="svc-shelf-item">
          <SvcCard service={service} />
        </div>
      ))}
    </div>
  );
}

function SvcCard({ service }: { service: ServiceWithExtras }) {
  const href = serviceHref(service);
  const price = formatServicePrice(service);
  const creatorName = service.creators?.name ?? null;

  return (
    <Link href={href} className="svc-card">
      <div className="svc-card-art">
        {service.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={service.cover_url} alt="" />
        )}
      </div>
      <div className="svc-card-body">
        <div className="svc-card-title os-type-card-title">{service.title}</div>
        {creatorName && (
          <div className="svc-card-description os-type-meta">{creatorName}</div>
        )}
        {service.description && (
          <div className="svc-card-description os-type-body-small">{service.description}</div>
        )}
      </div>
      <div className="svc-card-footer">
        <div className="svc-card-price os-type-section-title">{price}</div>
        <span className="os-product-card-pill-button os-product-card-pill-light">View</span>
      </div>
    </Link>
  );
}
