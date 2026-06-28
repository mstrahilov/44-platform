'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Category, CommunityPost, Creator } from '@/lib/platform';
import { creatorHref, FALLBACK_CATEGORIES } from '@/lib/platform';
import { matchesCategory, matchesQuery, mergeTaxonomyCategories, resolveCategory } from '@/lib/taxonomy';
import { BrowsePanel, DockedContent, DockedLayout, PostCard } from '@/components/Ui';

const FALLBACK_CREATORS: Creator[] = [
  {
    id: 'fallback-creator-a',
    profile_id: null,
    category_id: 'cat-creators-members',
    slug: 'creator-a',
    name: 'Creator A',
    bio: 'Placeholder creator profile.',
    creator_type: 'Artist',
    hero_url: null,
    avatar_url: null,
    is_published: true,
    categories: { id: 'cat-creators-members', slug: 'members', name: 'Members' },
  },
  {
    id: 'fallback-creator-b',
    profile_id: null,
    category_id: 'cat-creators-members',
    slug: 'creator-b',
    name: 'Creator B',
    bio: 'Placeholder creator profile.',
    creator_type: 'Producer',
    hero_url: null,
    avatar_url: null,
    is_published: true,
    categories: { id: 'cat-creators-members', slug: 'members', name: 'Members' },
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
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category') ?? params.get('view');
    const q = params.get('q');

    Promise.resolve().then(() => {
      if (category && category !== 'feed') setActiveCategory(category);
      if (q) setQuery(q);
    });
  }, []);

  useEffect(() => {
    async function fetchCommunity() {
      const [{ data: creatorRows }, { data: postRows }, { data: categoryRows }] = await Promise.all([
        supabase.from('creators').select('*').eq('is_published', true).order('name'),
        supabase.from('posts').select('*, creators(id, slug, name, avatar_url), categories(id, slug, name)').eq('status', 'published').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').in('scope', ['creators', 'posts']).order('sort_order'),
      ]);

      setCreators((creatorRows as Creator[] | null) ?? []);
      setPosts((postRows as CommunityPost[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
    }

    fetchCommunity();
  }, []);

  const creatorCatalog = creators.length > 0 ? creators : FALLBACK_CREATORS;
  const postCatalog = posts.length > 0 ? posts : FALLBACK_POSTS;
  const categoryCatalog = mergeTaxonomyCategories(
    categories,
    FALLBACK_CATEGORIES.filter(category => category.scope === 'creators' || category.scope === 'posts'),
  );

  const activeCategoryRow = resolveCategory(categoryCatalog, activeCategory);

  const filteredCreators = creatorCatalog.filter(creator => {
    const categoryMatches = activeCategory === 'all' || activeCategoryRow?.scope === 'creators';
    return categoryMatches && matchesQuery(creator, query);
  });

  const filteredPosts = postCatalog.filter(post => {
    const categoryMatches = activeCategory === 'all' || matchesCategory(post, activeCategoryRow);
    return categoryMatches && matchesQuery(post, query);
  });

  const visibleCount = filteredCreators.length + filteredPosts.length;

  function activateCategory(slug: string) {
    setActiveCategory(slug);
  }

  function countForCategory(category: Category) {
    if (category.scope === 'creators') return creatorCatalog.length;
    return postCatalog.filter(post => matchesCategory(post, category)).length;
  }

  return (
    <DockedLayout side="left">
      <BrowsePanel
        title="Browse Community"
        totalCount={visibleCount}
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
