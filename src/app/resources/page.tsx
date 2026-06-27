'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Category, Resource } from '@/lib/platform';
import { FALLBACK_CATEGORIES, FALLBACK_RESOURCES } from '@/lib/platform';
import { PageShell, ResourceCard, SectionHeader } from '@/components/Ui';

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
          .limit(12),
        supabase.from('categories').select('*').eq('scope', 'resources').order('sort_order'),
      ]);

      setResources((resourceRows as Resource[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
    }

    fetchResources();
  }, []);

  const resourceCatalog = resources.length > 0 ? resources : FALLBACK_RESOURCES;
  const categoryCatalog = categories.length > 0
    ? categories
    : FALLBACK_CATEGORIES.filter(category => category.scope === 'resources');
  const featured = resourceCatalog[0];
  const categoryCards = useMemo(() => {
    return categoryCatalog.map(category => ({
      category,
      count: resourceCatalog.filter(resource => resource.category_id === category.id || resource.categories?.slug === category.slug).length,
    })).filter(item => item.count > 0);
  }, [categoryCatalog, resourceCatalog]);

  return (
    <PageShell>
      {featured && (
        <section className="store-hero-shell">
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.035)', minHeight: 420 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,8,14,0.86), rgba(8,8,14,0.38) 54%, rgba(8,8,14,0.10)), radial-gradient(circle at 78% 24%, rgba(147,255,0,0.18), transparent 34%)' }} />
            <div style={{ position: 'relative', zIndex: 1, minHeight: 420, padding: 34, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ maxWidth: 720 }}>
                <h1 style={{ fontSize: 58, maxWidth: 760, fontWeight: 750, letterSpacing: '-0.04em', lineHeight: 0.94, color: '#fff', marginBottom: 12 }}>Resources</h1>
                <p style={{ maxWidth: 590, fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.58)', lineHeight: 1.65, marginBottom: 22 }}>
                  Guides, templates, lessons, and tools for the DIY path. Start here, ask the community when you get stuck, and hire help when you need it.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Link className="btn-primary" href="/resources/browse">Browse Resources</Link>
                  <Link className="btn-ghost" href="/community">Ask Community</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="Explore Resources" href="/resources/browse" />
        <div className="store-category-grid">
          {categoryCards.map(({ category }) => (
            <Link key={category.id} href={`/resources/browse?category=${category.slug}`} style={{ minHeight: 120, borderRadius: 20, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.035)', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,18,0.04), rgba(10,10,18,0.72))' }} />
              <div style={{ position: 'relative', zIndex: 1, fontSize: 18, fontWeight: 750, color: '#fff', letterSpacing: '-0.02em' }}>{category.name}</div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="New Resources" href="/resources/browse" />
        <div className="resource-grid">
          {resourceCatalog.slice(0, 6).map(resource => <ResourceCard key={resource.id} resource={resource} />)}
        </div>
      </section>
    </PageShell>
  );
}
