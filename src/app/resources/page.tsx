'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Category, Resource } from '@/lib/platform';
import { FALLBACK_CATEGORIES, FALLBACK_RESOURCES, resourceHref } from '@/lib/platform';
import { PageShell } from '@/components/Ui';

const RESOURCE_ICON_MAP: Record<string, string> = {
  Guides: '/icons/browse/books.svg',
  Templates: '/icons/browse/assets.svg',
  Lessons: '/icons/browse/music.svg',
  Tools: '/icons/browse/development.svg',
  Videos: '/icons/browse/video.svg',
  Articles: '/icons/browse/discussion.svg',
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetchResources() {
      const [{ data: resourceRows }, { data: categoryRows }] = await Promise.all([
        supabase
          .from('resources')
          .select('*, creators(id, slug, name, avatar_url), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(60),
        supabase.from('categories').select('*').eq('scope', 'resources').order('sort_order'),
      ]);
      setResources((resourceRows as Resource[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
    }
    fetchResources();
  }, []);

  const resourceCatalog = resources.length > 0 ? resources : FALLBACK_RESOURCES;
  const categoryCatalog =
    categories.length > 0
      ? categories
      : FALLBACK_CATEGORIES.filter(c => c.scope === 'resources');


  const categoryTiles = useMemo(() => {
    return categoryCatalog;
  }, [categoryCatalog]);

  return (
    <PageShell>
      <style>{`
        .res-page { display: grid; gap: var(--os-space-10); }

        .res-hero {
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

        .res-hero-content {
          position: relative;
          z-index: 2;
          min-height: 400px;
          padding: var(--os-space-10);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: flex-start;
        }

        .res-hero-title {
          max-width: 700px;
          margin: 0;
          color: var(--os-color-ink);
        }

        .res-hero-copy {
          max-width: 620px;
          margin: var(--os-space-4) 0 var(--os-space-6);
          color: var(--os-color-ink-secondary);
        }

        .res-hero-actions {
          display: flex;
          align-items: center;
          gap: var(--os-space-4);
          flex-wrap: wrap;
        }

        .res-hero-pill {
          min-width: 190px;
          justify-content: center;
        }

        .res-section { display: grid; gap: var(--os-space-5); }
        .res-section-head { display: flex; align-items: center; justify-content: space-between; gap: var(--os-space-5); }
        .res-section-title { margin: 0; color: var(--os-color-ink); }
        .res-section-action {
          color: var(--os-color-ink); background: rgba(255,255,255,.10);
          border-color: rgba(255,255,255,.18);
          box-shadow: var(--os-shadow-2), var(--os-glass-highlight);
          backdrop-filter: blur(var(--os-glass-blur-soft)) saturate(1.22);
          -webkit-backdrop-filter: blur(var(--os-glass-blur-soft)) saturate(1.22);
        }

        .res-category-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--os-card-gap);
        }
        .res-category-tile { width: 100%; }
        .res-shelf {
          display: flex; gap: var(--os-card-gap); overflow-x: auto;
          padding: var(--os-space-2) 0 var(--os-space-5);
          scroll-snap-type: x proximity;
        }
        .res-shelf::-webkit-scrollbar { height: 8px; }
        .res-shelf::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: var(--os-radius-pill); }
        .res-shelf-item { flex: 0 0 auto; width: 280px; scroll-snap-align: start; }

        .res-card {
          display: flex; flex-direction: column; height: 100%;
          border-radius: var(--os-radius-5); overflow: hidden;
          background: var(--os-glass-panel-bg);
          border: 1px solid var(--os-glass-panel-border);
          box-shadow: var(--os-glass-shadow), var(--os-glass-highlight);
          backdrop-filter: blur(var(--os-glass-blur)) saturate(1.6);
          -webkit-backdrop-filter: blur(var(--os-glass-blur)) saturate(1.6);
          text-decoration: none; color: var(--os-color-ink);
        }

        .res-card-art {
          aspect-ratio: 3 / 2; overflow: hidden; flex-shrink: 0;
          background: var(--os-glass-recessed-bg);
          border-bottom: 1px solid var(--os-glass-panel-border);
        }
        .res-card-art img { width: 100%; height: 100%; object-fit: cover; display: block; }

        .res-card-body { padding: var(--os-space-4); display: flex; flex-direction: column; gap: var(--os-space-2); flex: 1; }
        .res-card-title { color: var(--os-color-ink); }
        .res-card-summary {
          color: var(--os-color-ink-secondary);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .res-card-footer {
          padding: var(--os-space-3) var(--os-space-4) var(--os-space-4);
          border-top: 1px solid var(--os-glass-panel-border);
          display: flex; justify-content: flex-end;
        }

        .res-empty {
          padding: var(--os-space-7); border-radius: var(--os-radius-6);
          background: rgba(255,255,255,.06); border: 1px solid var(--os-glass-panel-border);
          color: var(--os-color-ink-secondary);
        }

        @media (max-width: 760px) {
          .res-hero { min-height: 340px; }
          .res-hero-content { min-height: 340px; padding: var(--os-space-7); }
          .res-section-head { align-items: flex-start; flex-direction: column; }
          .res-category-grid { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
          .res-shelf-item { width: 240px; }
        }
      `}</style>

      <div className="res-page">
        <section className="res-hero">
          <div className="res-hero-content">
            <h1 className="res-hero-title os-type-display">Resources</h1>
            <p className="res-hero-copy os-type-body">
              Practical guides for music production, video production, design, and development. Start with the basics, then learn how to build, publish, and improve real projects.
            </p>
          </div>
        </section>

        {categoryTiles.length > 0 && (
          <section className="res-section" aria-label="Resource categories">
            <div className="res-section-head">
              <h2 className="res-section-title os-type-panel-title">Browse by Category</h2>
            </div>
            <div className="res-category-grid">
              {categoryTiles.map(category => (
                <Link
                  key={category.id}
                  href={`/resources/browse?category=${category.slug}`}
                  className="os-category-icon-card res-category-tile"
                >
                  <div className="os-category-icon">
                    <img src={RESOURCE_ICON_MAP[category.name] ?? '/icons/browse/grid.svg'} alt="" />
                  </div>
                  <div className="os-category-card-title os-type-section-title">{category.name}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {categoryCatalog.map(category => {
          const categoryResources = resourceCatalog
            .filter(r => r.category_id === category.id || r.categories?.slug === category.slug)
            .slice(0, 8);
          if (categoryResources.length === 0) return null;
          return (
            <section key={category.slug} className="res-section">
              <div className="res-section-head">
                <h2 className="res-section-title os-type-panel-title">Explore {category.name}</h2>
                <Link className="os-button os-button-glass os-button-compact res-section-action" href={`/resources/browse?category=${category.slug}`}>
                  View All
                </Link>
              </div>
              <div className="res-shelf">
                {categoryResources.map(resource => (
                  <div key={resource.id} className="res-shelf-item">
                    <ResourceCard resource={resource} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {resourceCatalog.length > 0 && categoryCatalog.every(cat =>
          resourceCatalog.filter(r => r.category_id === cat.id || r.categories?.slug === cat.slug).length === 0
        ) && (
          <section className="res-section">
            <div className="res-section-head">
              <h2 className="res-section-title os-type-panel-title">New Resources</h2>
              <Link className="os-button os-button-glass os-button-compact res-section-action" href="/resources/browse">
                View All
              </Link>
            </div>
            <div className="res-shelf">
              {resourceCatalog.slice(0, 8).map(resource => (
                <div key={resource.id} className="res-shelf-item">
                  <ResourceCard resource={resource} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const href = resourceHref(resource);

  return (
    <Link href={href} className="res-card">
      <div className="res-card-art">
        {resource.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resource.cover_url} alt="" />
        )}
      </div>
      <div className="res-card-body">
        <div className="res-card-title os-type-card-title">{resource.title}</div>
        {resource.summary && (
          <div className="res-card-summary os-type-body-small">{resource.summary}</div>
        )}
      </div>
      <div className="res-card-footer">
        <span className="os-product-card-pill-button os-product-card-pill-light">Read</span>
      </div>
    </Link>
  );
}
