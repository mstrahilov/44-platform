'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Resource } from '@/lib/platform';
import { matchesCategory } from '@/lib/taxonomy';
import { ResourceCard, PageShell, HubHero, EmptyMessage } from '@/components/Ui';
import { useResourcesTopbarTabs } from '@/components/ResourcesTopbarTabs';

export default function ResourcesCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useResourcesTopbarTabs('resources');

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
  const description = RESOURCE_CATEGORY_DESCRIPTIONS[category.toLowerCase()]
    ?? `Guides, articles, and downloads about ${label}.`;

  const visible = useMemo(() => {
    return resourceCatalog.filter(r => matchesCategory(r, cat));
  }, [resourceCatalog, cat]);

  return (
    <PageShell>
      <div className="app-page">
        <HubHero title={label} copy={description} />
        {visible.length === 0 ? (
          <EmptyMessage>No resources here yet.</EmptyMessage>
        ) : (
          <div className="app-grid">
            {visible.map(resource => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

const RESOURCE_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  guides: 'Step-by-step guides and reference material from 44 creators.',
  articles: 'Essays and long-form writing from the 44 community.',
  templates: 'Reusable templates and starter files for your own projects.',
  downloads: 'Files, packs, and assets to grab and use.',
  lessons: 'Structured lessons that teach a specific skill or process.',
};
