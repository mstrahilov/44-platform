'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Category, CommunityPost, Creator, Tag } from '@/lib/platform';
import { creatorHref, FALLBACK_CATEGORIES, FALLBACK_TAGS } from '@/lib/platform';
import { matchesCategory, matchesQuery, matchesType, mergeTaxonomyCategories, mergeTaxonomyTypes, resolveCategory, typesForCategory } from '@/lib/taxonomy';
import { DockedContent, DockedLayout, DockedPanel, PostCard } from '@/components/Ui';

const FALLBACK_CREATORS: Creator[] = [
  {
    id: 'fallback-creator-a',
    profile_id: null,
    category_id: 'cat-creators-creators',
    slug: 'creator-a',
    name: 'Creator A',
    bio: 'Placeholder creator profile.',
    creator_type: 'Artist',
    hero_url: null,
    avatar_url: null,
    is_published: true,
    categories: { id: 'cat-creators-creators', slug: 'creators', name: 'Creators' },
  },
  {
    id: 'fallback-creator-b',
    profile_id: null,
    category_id: 'cat-creators-creators',
    slug: 'creator-b',
    name: 'Creator B',
    bio: 'Placeholder creator profile.',
    creator_type: 'Producer',
    hero_url: null,
    avatar_url: null,
    is_published: true,
    categories: { id: 'cat-creators-creators', slug: 'creators', name: 'Creators' },
  },
];

const FALLBACK_POSTS: CommunityPost[] = [
  {
    id: 'fallback-post-discussion',
    creator_id: null,
    category_id: 'cat-posts-discussions',
    title: 'Community Question',
    body: 'Generic discussion item for testing community browse.',
    post_type: 'Question',
    status: 'published',
    created_at: new Date().toISOString(),
    creators: { id: 'fallback-creator-a', slug: 'creator-a', name: 'Creator A', avatar_url: null },
    categories: { id: 'cat-posts-discussions', slug: 'discussions', name: 'Discussions' },
  },
  {
    id: 'fallback-post-update',
    creator_id: null,
    category_id: 'cat-posts-updates',
    title: 'Project Update',
    body: 'Generic update post for testing community browse.',
    post_type: 'Project Update',
    status: 'published',
    created_at: new Date().toISOString(),
    creators: { id: 'fallback-creator-b', slug: 'creator-b', name: 'Creator B', avatar_url: null },
    categories: { id: 'cat-posts-updates', slug: 'updates', name: 'Updates' },
  },
];

export default function CommunityBrowsePage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<Tag[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeType, setActiveType] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category') ?? params.get('view');
    const type = params.get('type');
    const q = params.get('q');

    Promise.resolve().then(() => {
      if (category && category !== 'feed') setActiveCategory(category);
      if (type) setActiveType(type);
      if (q) setQuery(q);
    });
  }, []);

  useEffect(() => {
    async function fetchCommunity() {
      const [{ data: creatorRows }, { data: postRows }, { data: categoryRows }, { data: typeRows }] = await Promise.all([
        supabase.from('creators').select('*').eq('is_published', true).order('name'),
        supabase.from('posts').select('*, creators(id, slug, name, avatar_url), categories(id, slug, name)').eq('status', 'published').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').in('scope', ['creators', 'posts']).order('sort_order'),
        supabase.from('tags').select('*').order('sort_order'),
      ]);

      setCreators((creatorRows as Creator[] | null) ?? []);
      setPosts((postRows as CommunityPost[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
      setTypes((typeRows as Tag[] | null) ?? []);
    }

    fetchCommunity();
  }, []);

  const creatorCatalog = creators.length > 0 ? creators : FALLBACK_CREATORS;
  const postCatalog = posts.length > 0 ? posts : FALLBACK_POSTS;
  const categoryCatalog = mergeTaxonomyCategories(
    categories,
    FALLBACK_CATEGORIES.filter(category => category.scope === 'creators' || category.scope === 'posts'),
  );
  const typeCatalog = mergeTaxonomyTypes(
    types,
    FALLBACK_TAGS.filter(type => categoryCatalog.some(category => category.id === type.category_id)),
  );

  const activeCategoryRow = resolveCategory(categoryCatalog, activeCategory);
  const activeTypeRow = resolveCategory(typeCatalog.map(type => ({ ...type, scope: 'posts' as const })), activeType) as Tag | undefined;

  const filteredCreators = creatorCatalog.filter(creator => {
    const categoryMatches = activeCategory === 'all' || activeCategoryRow?.scope === 'creators';
    return categoryMatches && matchesType(creator, activeTypeRow) && matchesQuery(creator, query);
  });

  const filteredPosts = postCatalog.filter(post => {
    const categoryMatches = activeCategory === 'all' || matchesCategory(post, activeCategoryRow);
    return categoryMatches && matchesType(post, activeTypeRow) && matchesQuery(post, query);
  });

  const visibleCount = filteredCreators.length + filteredPosts.length;

  function activateCategory(slug: string) {
    setActiveCategory(slug);
    setActiveType('');
  }

  return (
    <DockedLayout side="left">
      <DockedPanel>
        <div>
          <div style={{ fontSize: 26, fontWeight: 750, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>Browse Community</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.38)', marginTop: 6 }}>{visibleCount} community items</div>
        </div>
        <input className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search community..." />
        <div className="divider" />
        <FilterButton active={activeCategory === 'all'} onClick={() => activateCategory('all')}>All Community</FilterButton>
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
        {filteredCreators.length > 0 && (
          <div className="resource-grid">
            {filteredCreators.map(creator => <CreatorCard key={creator.id} creator={creator} />)}
          </div>
        )}
        {filteredPosts.length > 0 && (
          <div className="post-grid">
            {filteredPosts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        )}
      </DockedContent>
    </DockedLayout>
  );
}

function CreatorCard({ creator }: { creator: Creator }) {
  return (
    <Link className="resource-card" href={creatorHref(creator)}>
      <div className="chip">{creator.creator_type ?? 'Creator'}</div>
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
