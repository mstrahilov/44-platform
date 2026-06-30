'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Resource } from '@/lib/platform';
import { FALLBACK_CATEGORIES, FALLBACK_RESOURCES } from '@/lib/platform';
import { matchesCategory } from '@/lib/taxonomy';
import { ResourceCard, PageShell } from '@/components/Ui';

export default function ResourcesCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [{ data: resourceRows }, { data: categoryRows }] = await Promise.all([
        supabase
          .from('resources')
          .select('*, creators(id, slug, name, avatar_url), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('scope', 'resources').order('sort_order'),
      ]);
      setResources((resourceRows as Resource[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
    }
    fetchData();
  }, []);

  const resourceCatalog = resources.length > 0 ? resources : FALLBACK_RESOURCES;
  const categoryCatalog = categories.length > 0
    ? categories
    : FALLBACK_CATEGORIES.filter(c => c.scope === 'resources');

  const cat = categoryCatalog.find(c => c.slug === category || c.name.toLowerCase() === category);
  const label = cat?.name ?? category.charAt(0).toUpperCase() + category.slice(1);

  const visible = useMemo(() => {
    return resourceCatalog.filter(r => matchesCategory(r, cat));
  }, [resourceCatalog, cat]);

  return (
    <PageShell>
      <style>{`
        .browse-page { display: flex; flex-direction: column; gap: 20px; }
        .resource-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 14px;
        }
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
