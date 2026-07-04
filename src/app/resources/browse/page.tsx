'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Resource } from '@/lib/platform';
import { matchesCategory, matchesQuery } from '@/lib/taxonomy';
import { ResourceCard, PageShell, HubHero, EmptyMessage } from '@/components/Ui';
import { useResourcesTopbarTabs } from '@/components/ResourcesTopbarTabs';

export default function ResourcesBrowsePage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory] = useState(() => {
    if (typeof window === 'undefined') return 'all';
    return new URLSearchParams(window.location.search).get('category') ?? 'all';
  });
  const [query] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('q') ?? '';
  });

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

  const visible = useMemo(() => {
    return resourceCatalog.filter(resource => {
      const cat = categoryCatalog.find(c => c.slug === activeCategory || c.name === activeCategory);
      const catMatch = activeCategory === 'all' || matchesCategory(resource, cat);
      const qMatch = !query.trim() || matchesQuery(resource, query);
      return catMatch && qMatch;
    });
  }, [activeCategory, categoryCatalog, query, resourceCatalog]);

  const label = activeCategory === 'all'
    ? 'All Resources'
    : (categoryCatalog.find(c => c.slug === activeCategory)?.name ?? activeCategory);

  useResourcesTopbarTabs('resources');

  return (
    <PageShell>
      <div className="app-page">
        <HubHero title={label} />
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
