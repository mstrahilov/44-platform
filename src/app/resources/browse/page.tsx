'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category, Resource } from '@/lib/platform';
import { FALLBACK_CATEGORIES, FALLBACK_RESOURCES } from '@/lib/platform';
import { matchesCategory, matchesQuery } from '@/lib/taxonomy';
import { BrowsePanel, DockedContent, DockedLayout, ResourceCard } from '@/components/Ui';

export default function ResourcesBrowsePage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savedResourceIds, setSavedResourceIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const q = params.get('q');

    Promise.resolve().then(() => {
      if (category) setActiveCategory(category);
      if (q) setQuery(q);
    });
  }, []);

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

  useEffect(() => {
    async function fetchSaved(userId: string) {
      const { data } = await supabase
        .from('saved_resources')
        .select('resource_id')
        .eq('user_id', userId);

      setSavedResourceIds((data ?? []).map(item => item.resource_id).filter(Boolean));
    }

    if (user) {
      fetchSaved(user.id);
    } else {
      Promise.resolve().then(() => setSavedResourceIds([]));
    }
  }, [user]);

  const resourceCatalog = resources.length > 0 ? resources : FALLBACK_RESOURCES;
  const categoryCatalog = categories.length > 0
    ? categories
    : FALLBACK_CATEGORIES.filter(category => category.scope === 'resources');

  const visibleResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return resourceCatalog.filter(resource => {
      const category = categoryCatalog.find(item => item.slug === activeCategory || item.name === activeCategory);
      const categoryMatches = activeCategory === 'all' || matchesCategory(resource, category);
      const queryMatches = !normalizedQuery || matchesQuery(resource, query);

      return categoryMatches && queryMatches;
    });
  }, [activeCategory, categoryCatalog, query, resourceCatalog]);

  function activateCategory(slug: string) {
    setActiveCategory(slug);
  }

  function countForCategory(category: Category) {
    return resourceCatalog.filter(resource => matchesCategory(resource, category)).length;
  }

  async function saveResource(resource: Resource) {
    if (!user) {
      alert('Sign in first, then save this resource to your library.');
      return;
    }

    if (resource.id.startsWith('fallback-')) {
      alert('Run the platform architecture SQL first, then saved resources can be stored.');
      return;
    }

    const { error } = await supabase
      .from('saved_resources')
      .upsert({ user_id: user.id, resource_id: resource.id }, { onConflict: 'user_id,resource_id' });

    if (error) {
      alert(error.message);
      return;
    }

    setSavedResourceIds(current => [...new Set([...current, resource.id])]);
  }

  return (
    <DockedLayout side="left">
      <BrowsePanel
        title="Browse Resources"
        totalCount={resourceCatalog.length}
        activeId={activeCategory}
        onSelect={activateCategory}
        onClear={() => {
          setActiveCategory('all');
          setQuery('');
        }}
        categories={categoryCatalog.map(category => ({
          id: category.slug,
          label: category.name,
          icon: category.slug,
          count: countForCategory(category),
        }))}
      />

      <DockedContent>
        <div className="resource-grid">
          {visibleResources.map(resource => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              saved={savedResourceIds.includes(resource.id)}
              onSave={saveResource}
            />
          ))}
        </div>
      </DockedContent>
    </DockedLayout>
  );
}
