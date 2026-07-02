'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Resource } from '@/lib/platform';
import { matchesCategory } from '@/lib/taxonomy';
import { ResourceCard, PageShell } from '@/components/Ui';
import { useTopbarTabs } from '@/components/TopbarContext';

export default function ResourcesCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useTopbarTabs(
    categories.length > 0
      ? [
          { id: 'all', label: 'All', href: '/resources' },
          ...categories.slice(0, 5).map(c => ({
            id: c.slug,
            label: c.name,
            href: `/resources/browse/${c.slug}`,
            active: c.slug === category,
          })),
        ]
      : undefined,
  );

  useEffect(() => {
    async function fetchData() {
      const [{ data: resourceRows }, { data: categoryRows }] = await Promise.all([
        supabase
          .from('resources')
          .select('*, creators:profiles!author_id(id, slug, name:display_name, avatar_url), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('scope', 'resources').order('sort_order'),
      ]);
      setResources((resourceRows as Resource[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
    }
    fetchData();
  }, []);

  const resourceCatalog = resources;
  const categoryCatalog = categories;

  const cat = categoryCatalog.find(c => c.slug === category || c.name.toLowerCase() === category);
  const label = cat?.name ?? category.charAt(0).toUpperCase() + category.slice(1);

  const visible = useMemo(() => {
    return resourceCatalog.filter(r => matchesCategory(r, cat));
  }, [resourceCatalog, cat]);

  return (
    <PageShell>
      <style>{`
        .browse-page { display: flex; flex-direction: column; gap: var(--os-space-7); }
      `}</style>
      <div className="browse-page">
        <h1 className="browse-page-title os-type-display">{label}</h1>
        <div className="resource-grid">
          {visible.map(resource => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
