'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Category, CommunityPost, Resource } from '@/lib/platform';
import { FALLBACK_CATEGORIES, FALLBACK_RESOURCES } from '@/lib/platform';
import { mergeTaxonomyCategories } from '@/lib/taxonomy';
import { PageShell, PostCard, ResourceCard, SectionHeader } from '@/components/Ui';

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
  {
    id: 'fallback-post-b',
    creator_id: null,
    category_id: null,
    title: 'Post B',
    body: 'Generic update post for testing.',
    post_type: 'update',
    status: 'published',
    created_at: new Date().toISOString(),
    creators: { id: 'fallback-creator-b', slug: 'creator-b', name: 'Creator B', avatar_url: null },
    categories: { id: 'fallback-post-updates', slug: 'updates', name: 'Updates' },
  },
];

const COMMUNITY_TILES = [
  { title: 'Discussions', href: '/community/browse?category=discussions' },
  { title: 'Members', href: '/community/browse?category=members' },
  { title: 'Reviews', href: '/community/browse?category=reviews' },
  { title: 'News', href: '/community/browse?category=news' },
];

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetchCommunity() {
      const [{ data: postRows }, { data: resourceRows }, { data: categoryRows }] = await Promise.all([
        supabase
          .from('posts')
          .select('*, creators(id, slug, name, avatar_url), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(12),
        supabase
          .from('resources')
          .select('*, creators(id, slug, name, avatar_url), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.from('categories').select('*').in('scope', ['creators', 'posts']).order('sort_order'),
      ]);

      setPosts((postRows as CommunityPost[] | null) ?? []);
      setResources((resourceRows as Resource[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
    }

    fetchCommunity();
  }, []);

  const communityPosts = posts.length > 0 ? posts : FALLBACK_POSTS;
  const resourceList = resources.length > 0 ? resources : FALLBACK_RESOURCES;
  const categoryTiles = useMemo(() => {
    const communityCategories = mergeTaxonomyCategories(
      categories,
      FALLBACK_CATEGORIES.filter(category => category.scope === 'creators' || category.scope === 'posts'),
    );
    const postCategories = communityCategories.filter(category => category.scope === 'posts' || category.scope === 'creators');
    if (postCategories.length === 0) return COMMUNITY_TILES;

    const tiles = postCategories
      .filter(category => ['discussions', 'members', 'reviews', 'news'].includes(category.slug))
      .map(category => ({ title: category.name, href: `/community/browse?category=${category.slug}` }));

    return tiles.length > 0 ? tiles : COMMUNITY_TILES;
  }, [categories]);

  return (
    <PageShell>
      <section className="store-hero-shell">
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.035)', minHeight: 420 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,8,14,0.86), rgba(8,8,14,0.40) 52%, rgba(8,8,14,0.10)), radial-gradient(circle at 76% 22%, rgba(147,255,0,0.18), transparent 34%)' }} />
          <div style={{ position: 'relative', zIndex: 1, minHeight: 420, padding: 34, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ maxWidth: 720 }}>
              <h1 style={{ fontSize: 58, maxWidth: 760, fontWeight: 750, letterSpacing: '-0.04em', lineHeight: 0.94, color: '#fff', marginBottom: 12 }}>Community</h1>
              <p style={{ maxWidth: 590, fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.58)', lineHeight: 1.65, marginBottom: 22 }}>
                Creator updates, resources, discussions, and practical knowledge for building without the noise.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Link className="btn-primary" href="/community/browse">Browse Community</Link>
                <Link className="btn-ghost" href="/community/creator-a">View Creator Page</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="Explore Community" href="/community/browse" />
        <div className="store-category-grid">
          {categoryTiles.map(tile => (
            <Link key={`${tile.title}-${tile.href}`} href={tile.href} style={{ minHeight: 120, borderRadius: 20, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.035)', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,18,0.04), rgba(10,10,18,0.72))' }} />
              <div style={{ position: 'relative', zIndex: 1, fontSize: 18, fontWeight: 750, color: '#fff', letterSpacing: '-0.02em' }}>{tile.title}</div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Community Feed" href="/community" />
        <div className="post-grid">
          {communityPosts.slice(0, 6).map(post => <PostCard key={post.id} post={post} />)}
        </div>
      </section>

      <section>
        <SectionHeader title="Free Resources" href="/resources" />
        <div className="resource-grid">
          {resourceList.slice(0, 3).map(resource => <ResourceCard key={resource.id} resource={resource} />)}
        </div>
      </section>
    </PageShell>
  );
}
