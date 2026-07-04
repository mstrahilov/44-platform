'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Resource } from '@/lib/platform';
import { PageShell, HubHero, HubSection, Shelf, ResourceCard } from '@/components/Ui';
import { useResourcesTopbarTabs } from '@/components/ResourcesTopbarTabs';

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetchResources() {
      const [{ data: resourceRows }, { data: categoryRows }] = await Promise.all([
        supabase
          .from('resources')
          .select('*, creators:profiles!author_id(id, slug, name:display_name, avatar_url), categories(id, slug, name)')
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

  const resourceCatalog = resources;
  const categoryCatalog = categories.filter(category => resources.some(resource => (
    resource.category_id === category.id || resource.categories?.slug === category.slug
  )));

  useResourcesTopbarTabs('resources');

  return (
    <PageShell>
      <div className="app-page">
        <HubHero
          title="Resources"
          copy="Practical guides for music production, video production, design, and development. Start with the basics, then learn how to build, publish, and improve real projects."
        />

        {categoryCatalog.map(category => {
          const categoryResources = resourceCatalog
            .filter(r => r.category_id === category.id || r.categories?.slug === category.slug)
            .slice(0, 8);
          if (categoryResources.length === 0) return null;
          return (
            <HubSection key={category.slug} title={`Explore ${category.name}`} href={`/resources/browse/${category.slug}`}>
              <Shelf>
                {categoryResources.map(resource => (
                  <div key={resource.id} className="app-shelf-item">
                    <ResourceCard resource={resource} />
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
