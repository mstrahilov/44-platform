'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Category, CommunityPost, Creator, Resource } from '@/lib/platform';
import { creatorHref, FALLBACK_CATEGORIES, FALLBACK_RESOURCES } from '@/lib/platform';
import { DockedContent, DockedLayout, DockedPanel, PostCard, ResourceCard } from '@/components/Ui';

type CommunityView = 'creators' | 'feed' | 'resources';

const FALLBACK_CREATORS: Creator[] = [
  { id: 'fallback-creator-a', profile_id: null, slug: 'creator-a', name: 'Creator A', bio: 'Placeholder creator profile.', hero_url: null, avatar_url: null, is_published: true },
  { id: 'fallback-creator-b', profile_id: null, slug: 'creator-b', name: 'Creator B', bio: 'Placeholder creator profile.', hero_url: null, avatar_url: null, is_published: true },
];

const FALLBACK_POSTS: CommunityPost[] = [
  {
    id: 'fallback-post-a',
    creator_id: null,
    category_id: null,
    title: 'Post A',
    body: 'Generic community feed post for testing.',
    post_type: 'feed',
    status: 'published',
    created_at: new Date().toISOString(),
    creators: { id: 'fallback-creator-a', slug: 'creator-a', name: 'Creator A', avatar_url: null },
    categories: { id: 'fallback-post-feed', slug: 'feed', name: 'Feed' },
  },
];

export default function CommunityBrowsePage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [view, setView] = useState<CommunityView>('creators');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentView = params.get('view');
    const q = params.get('q');

    Promise.resolve().then(() => {
      if (currentView === 'feed' || currentView === 'resources' || currentView === 'creators') setView(currentView);
      if (q) setQuery(q);
    });
  }, []);

  useEffect(() => {
    async function fetchCommunity() {
      const [{ data: creatorRows }, { data: postRows }, { data: resourceRows }, { data: categoryRows }] = await Promise.all([
        supabase.from('creators').select('*').eq('is_published', true).order('name'),
        supabase.from('posts').select('*, creators(id, slug, name, avatar_url), categories(id, slug, name)').eq('status', 'published').order('created_at', { ascending: false }),
        supabase.from('resources').select('*, creators(id, slug, name, avatar_url), categories(id, slug, name)').eq('status', 'published').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').in('scope', ['posts', 'resources']).order('sort_order'),
      ]);

      setCreators((creatorRows as Creator[] | null) ?? []);
      setPosts((postRows as CommunityPost[] | null) ?? []);
      setResources((resourceRows as Resource[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
    }

    fetchCommunity();
  }, []);

  const creatorCatalog = creators.length > 0 ? creators : FALLBACK_CREATORS;
  const postCatalog = posts.length > 0 ? posts : FALLBACK_POSTS;
  const resourceCatalog = resources.length > 0 ? resources : FALLBACK_RESOURCES;
  const categoryCatalog = categories.length > 0
    ? categories
    : FALLBACK_CATEGORIES.filter(category => category.scope === 'posts' || category.scope === 'resources');

  const filteredCreators = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return creatorCatalog.filter(creator => !normalizedQuery || creator.name.toLowerCase().includes(normalizedQuery) || (creator.bio ?? '').toLowerCase().includes(normalizedQuery));
  }, [creatorCatalog, query]);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return postCatalog.filter(post => !normalizedQuery || post.title.toLowerCase().includes(normalizedQuery) || (post.body ?? '').toLowerCase().includes(normalizedQuery) || (post.creators?.name ?? '').toLowerCase().includes(normalizedQuery));
  }, [postCatalog, query]);

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return resourceCatalog.filter(resource => !normalizedQuery || resource.title.toLowerCase().includes(normalizedQuery) || (resource.summary ?? '').toLowerCase().includes(normalizedQuery));
  }, [query, resourceCatalog]);

  return (
    <DockedLayout side="left">
      <DockedPanel>
        <div>
          <div style={{ fontSize: 26, fontWeight: 750, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>Browse Community</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.38)', marginTop: 6 }}>Creators, posts, and resources</div>
        </div>
        <input className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search community..." />
        <div className="divider" />
        <FilterButton active={view === 'creators'} onClick={() => setView('creators')}>Creators</FilterButton>
        <FilterButton active={view === 'feed'} onClick={() => setView('feed')}>Feed</FilterButton>
        <FilterButton active={view === 'resources'} onClick={() => setView('resources')}>Resources</FilterButton>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginBottom: 8 }}>Categories</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {categoryCatalog.slice(0, 8).map(category => (
              <FilterButton key={category.id} active={false} onClick={() => setQuery(category.name)}>{category.name}</FilterButton>
            ))}
          </div>
        </div>
      </DockedPanel>

      <DockedContent>
        {view === 'creators' && (
          <div className="resource-grid">
            {filteredCreators.map(creator => <CreatorCard key={creator.id} creator={creator} />)}
          </div>
        )}
        {view === 'feed' && (
          <div className="post-grid">
            {filteredPosts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        )}
        {view === 'resources' && (
          <div className="resource-grid">
            {filteredResources.map(resource => <ResourceCard key={resource.id} resource={resource} />)}
          </div>
        )}
      </DockedContent>
    </DockedLayout>
  );
}

function CreatorCard({ creator }: { creator: Creator }) {
  return (
    <Link className="resource-card" href={creatorHref(creator)}>
      <div className="panel-list-thumb" style={{ width: 54, height: 54, borderRadius: '50%', marginBottom: 18 }}>
        {creator.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creator.avatar_url} alt="" />
        )}
      </div>
      <div className="resource-card-title">{creator.name}</div>
      <div className="resource-card-description">{creator.bio ?? 'Creator profile, posts, resources, products, and services will live here.'}</div>
      <div className="service-card-footer">
        <div className="btn-ghost service-card-button">View Creator</div>
      </div>
    </Link>
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
