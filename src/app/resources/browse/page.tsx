'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category, Resource, Tag } from '@/lib/platform';
import { FALLBACK_CATEGORIES, FALLBACK_RESOURCES, FALLBACK_TAGS } from '@/lib/platform';
import { matchesCategory, matchesQuery, matchesType, resolveCategory, typesForCategory } from '@/lib/taxonomy';
import { DockedContent, DockedLayout, DockedPanel, ResourceCard } from '@/components/Ui';

export default function ResourcesBrowsePage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<Tag[]>([]);
  const [savedResourceIds, setSavedResourceIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeType, setActiveType] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const type = params.get('type');
    const q = params.get('q');

    Promise.resolve().then(() => {
      if (category) setActiveCategory(category);
      if (type) setActiveType(type);
      if (q) setQuery(q);
    });
  }, []);

  useEffect(() => {
    async function fetchData() {
      const [{ data: resourceRows }, { data: categoryRows }, { data: typeRows }] = await Promise.all([
        supabase
          .from('resources')
          .select('*, creators(id, slug, name, avatar_url), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('scope', 'resources').order('sort_order'),
        supabase.from('tags').select('*').order('sort_order'),
      ]);

      setResources((resourceRows as Resource[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
      setTypes((typeRows as Tag[] | null) ?? []);
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
  const typeCatalog = types.length > 0
    ? types
    : FALLBACK_TAGS.filter(type => categoryCatalog.some(category => category.id === type.category_id));

  const visibleResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return resourceCatalog.filter(resource => {
      const category = categoryCatalog.find(item => item.slug === activeCategory || item.name === activeCategory);
      const type = resolveCategory(typeCatalog.map(item => ({ ...item, scope: 'resources' as const })), activeType) as Tag | undefined;
      const categoryMatches = activeCategory === 'all' || matchesCategory(resource, category);
      const queryMatches = !normalizedQuery || matchesQuery(resource, query);

      return categoryMatches && matchesType(resource, type) && queryMatches;
    });
  }, [activeCategory, activeType, categoryCatalog, query, resourceCatalog, typeCatalog]);

  function activateCategory(slug: string) {
    setActiveCategory(slug);
    setActiveType('');
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
      <DockedPanel>
        <div>
          <div style={{ fontSize: 26, fontWeight: 750, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>Browse Resources</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.38)', marginTop: 6 }}>{visibleResources.length} free resources</div>
        </div>
        <input className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search resources..." />
        <div className="divider" />
        <FilterButton active={activeCategory === 'all'} onClick={() => activateCategory('all')}>All Resources</FilterButton>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginBottom: 8 }}>Categories</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {categoryCatalog.map(category => {
              const categoryTypes = typesForCategory(typeCatalog, category.id);
              const active = activeCategory === category.slug || activeCategory === category.name;
              return (
                <div key={category.id}>
                  <FilterButton active={active} onClick={() => activateCategory(category.slug)}>{category.name}</FilterButton>
                  {active && categoryTypes.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 0 8px 12px' }}>
                      <FilterButton active={!activeType} onClick={() => setActiveType('')}>All Types</FilterButton>
                      {categoryTypes.map(type => (
                        <FilterButton key={type.id} active={activeType === type.name || activeType === type.slug} onClick={() => setActiveType(type.name)}>{type.name}</FilterButton>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DockedPanel>

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

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', background: active ? 'rgba(255,255,255,0.12)' : 'transparent', border: `1px solid ${active ? 'rgba(255,255,255,0.18)' : 'transparent'}`, borderRadius: 12, padding: '9px 11px', fontSize: 12, fontWeight: 650, color: active ? '#fff' : 'rgba(255,255,255,0.46)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
    >
      {children}
    </button>
  );
}
