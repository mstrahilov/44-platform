'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category, Resource } from '@/lib/platform';
import { FALLBACK_CATEGORIES, FALLBACK_RESOURCES } from '@/lib/platform';
import { FilterSidebar, ResourceCard, SurfaceBar } from '@/components/Ui';

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savedResourceIds, setSavedResourceIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');

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
      const matchesCategory = activeCategory === 'all' || (category && (resource.category_id === category.id || resource.categories?.slug === category.slug));
      const matchesQuery = !normalizedQuery
        || resource.title.toLowerCase().includes(normalizedQuery)
        || (resource.summary ?? '').toLowerCase().includes(normalizedQuery)
        || resource.resource_type.toLowerCase().includes(normalizedQuery)
        || (resource.creators?.name ?? '').toLowerCase().includes(normalizedQuery)
        || (resource.categories?.name ?? '').toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, categoryCatalog, query, resourceCatalog]);

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
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 56px' }}>
      <div className="browse-shell">
        <FilterSidebar>
          <div>
            <div style={{ fontSize: 26, fontWeight: 750, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>Resources</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.38)', marginTop: 6 }}>{visibleResources.length} free resources</div>
          </div>
          <input className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search resources..." />
          <div className="divider" />
          <FilterButton active={activeCategory === 'all'} onClick={() => setActiveCategory('all')}>All Resources</FilterButton>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginBottom: 8 }}>Categories</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {categoryCatalog.map(category => (
                <FilterButton key={category.id} active={activeCategory === category.slug} onClick={() => setActiveCategory(category.slug)}>{category.name}</FilterButton>
              ))}
            </div>
          </div>
        </FilterSidebar>

        <main style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <SurfaceBar>
            <div>
              <div className="surface-eyebrow">Community Resources</div>
              <div className="surface-title">Free knowledge, tools, and templates</div>
            </div>
            <Link className="btn-ghost" href="/community">Back to Community</Link>
          </SurfaceBar>

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
        </main>
      </div>
    </div>
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
