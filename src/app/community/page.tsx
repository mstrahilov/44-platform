'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, CommunityPost } from '@/lib/platform';
import { PageShell } from '@/components/Ui';

const FALLBACK_POSTS: CommunityPost[] = [
  { id: 'fb-a', creator_id: null, category_id: null, title: 'My First 44 Release', body: 'Sharing my debut single — would love feedback from the community on the mix and artwork direction.', post_type: 'showcase', status: 'published', created_at: new Date().toISOString(), creators: { id: 'c-a', slug: 'creator-a', name: 'ØLSTEN', avatar_url: null }, categories: { id: 'cat-showcase', slug: 'showcase', name: 'Showcase' } },
  { id: 'fb-b', creator_id: null, category_id: null, title: 'Looking for a Vocalist', body: 'Working on a neo-soul EP and need a vocalist for 2-3 tracks. DM if interested.', post_type: 'collaboration', status: 'published', created_at: new Date().toISOString(), creators: { id: 'c-b', slug: 'creator-b', name: 'Creator B', avatar_url: null }, categories: { id: 'cat-collab', slug: 'collaboration', name: 'Collaboration' } },
  { id: 'fb-c', creator_id: null, category_id: null, title: 'Booklet Size Advice?', body: 'What size do you all use for CD booklets? I want something that works for a 6-panel digipak.', post_type: 'questions', status: 'published', created_at: new Date().toISOString(), creators: { id: 'c-a', slug: 'creator-a', name: 'ØLSTEN', avatar_url: null }, categories: { id: 'cat-questions', slug: 'questions', name: 'Questions' } },
  { id: 'fb-d', creator_id: null, category_id: null, title: 'New Beat Pack Preview', body: 'Just dropped 10 trap/R&B loops — all royalty free. Check the link in bio.', post_type: 'showcase', status: 'published', created_at: new Date().toISOString(), creators: { id: 'c-b', slug: 'creator-b', name: 'Creator B', avatar_url: null }, categories: { id: 'cat-showcase', slug: 'showcase', name: 'Showcase' } },
  { id: 'fb-e', creator_id: null, category_id: null, title: 'FL Studio Export Tips?', body: 'Anyone else getting clipping when exporting at 24-bit? Here is what fixed it for me.', post_type: 'questions', status: 'published', created_at: new Date().toISOString(), creators: { id: 'c-a', slug: 'creator-a', name: 'ØLSTEN', avatar_url: null }, categories: { id: 'cat-questions', slug: 'questions', name: 'Questions' } },
  { id: 'fb-f', creator_id: null, category_id: null, title: 'Album Page Concept', body: 'Putting together a visual concept for my album page. Here is the moodboard so far.', post_type: 'showcase', status: 'published', created_at: new Date().toISOString(), creators: { id: 'c-b', slug: 'creator-b', name: 'Creator B', avatar_url: null }, categories: { id: 'cat-showcase', slug: 'showcase', name: 'Showcase' } },
];

const COMMUNITY_ICON_MAP: Record<string, string> = {
  Showcase: '/icons/browse/showcase.svg',
  Questions: '/icons/browse/questions.svg',
  Collaboration: '/icons/browse/collaboration.svg',
  Updates: '/icons/browse/updates.svg',
  Discussion: '/icons/browse/discussion.svg',
};

const COMMUNITY_CATEGORIES = [
  { id: 'showcase', slug: 'showcase', name: 'Showcase', sort_order: 10, scope: 'posts' },
  { id: 'questions', slug: 'questions', name: 'Questions', sort_order: 20, scope: 'posts' },
  { id: 'collaboration', slug: 'collaboration', name: 'Collaboration', sort_order: 30, scope: 'posts' },
  { id: 'updates', slug: 'updates', name: 'Updates', sort_order: 40, scope: 'posts' },
  { id: 'discussion', slug: 'discussion', name: 'Discussion', sort_order: 50, scope: 'posts' },
];

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetchCommunity() {
      const [{ data: postRows }, { data: categoryRows }] = await Promise.all([
        supabase
          .from('posts')
          .select('*, creators(id, slug, name, avatar_url), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(60),
        supabase.from('categories').select('*').eq('scope', 'posts').order('sort_order'),
      ]);
      setPosts((postRows as CommunityPost[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
    }
    fetchCommunity();
  }, []);

  const communityPosts = posts.length > 0 ? posts : FALLBACK_POSTS;

  const categoryList = useMemo(() => {
    const live = categories.filter(c => c.scope === 'posts').sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
    return live.length > 0 ? live : COMMUNITY_CATEGORIES;
  }, [categories]);

  const categoryTiles = categoryList.map(c => ({
    title: c.name,
    href: `/community/browse?category=${c.slug}`,
  }));

  return (
    <PageShell>
      <style>{`
        .cmty-page { display: grid; gap: var(--os-space-10); }

        .cmty-hero {
          position: relative;
          min-height: 400px;
          border-radius: var(--os-radius-8);
          overflow: hidden;
          background: var(--os-paper-bg);
          border: 1px solid var(--os-paper-border);
          box-shadow: var(--os-paper-card-shadow), var(--os-paper-highlight);
          color: var(--os-color-ink);
          isolation: isolate;
        }

        .cmty-hero-content {
          position: relative;
          z-index: 2;
          min-height: 400px;
          padding: var(--os-space-10);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: flex-start;
        }

        .cmty-hero-title {
          max-width: 700px;
          margin: 0;
          color: var(--os-color-ink);
        }

        .cmty-hero-copy {
          max-width: 620px;
          margin: var(--os-space-4) 0 0;
          color: var(--os-color-ink-secondary);
        }

        .cmty-section { display: grid; gap: var(--os-space-5); }
        .cmty-section-head { display: flex; align-items: center; justify-content: space-between; gap: var(--os-space-5); }
        .cmty-section-title { margin: 0; color: var(--os-color-ink); }
        .cmty-section-action {
          color: var(--os-color-ink); background: rgba(255,255,255,.10);
          border-color: rgba(255,255,255,.18);
          box-shadow: var(--os-shadow-2), var(--os-glass-highlight);
          backdrop-filter: blur(var(--os-glass-blur-soft)) saturate(1.22);
          -webkit-backdrop-filter: blur(var(--os-glass-blur-soft)) saturate(1.22);
        }

        .cmty-category-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--os-card-gap);
        }
        .cmty-category-tile { width: 100%; }

        .cmty-post-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: var(--os-card-gap);
        }

        .cmty-post-card {
          border-radius: var(--os-radius-5);
          background: var(--os-glass-panel-bg);
          border: 1px solid var(--os-glass-panel-border);
          box-shadow: var(--os-glass-shadow), var(--os-glass-highlight);
          backdrop-filter: blur(var(--os-glass-blur)) saturate(1.6);
          -webkit-backdrop-filter: blur(var(--os-glass-blur)) saturate(1.6);
          padding: var(--os-space-5);
          display: flex; flex-direction: column; gap: var(--os-space-3);
        }

        .cmty-post-title { color: var(--os-color-ink); }
        .cmty-post-creator { color: var(--os-color-ink-muted); }
        .cmty-post-body {
          color: var(--os-color-ink-secondary);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden; flex: 1;
        }

        @media (max-width: 760px) {
          .cmty-hero { min-height: 380px; }
          .cmty-hero-content { min-height: 380px; padding: var(--os-space-7); }
          .cmty-section-head { align-items: flex-start; flex-direction: column; }
          .cmty-category-grid { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
          .cmty-post-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="cmty-page">
        <section className="cmty-hero">
          <div className="cmty-hero-content">
            <h1 className="cmty-hero-title os-type-display">Community</h1>
            <p className="cmty-hero-copy os-type-body">
              Share work, ask questions, find collaborators, follow updates, and discuss the creative ecosystem around 44.
            </p>
          </div>
        </section>

        {categoryList.map(category => {
          const categoryPosts = communityPosts
            .filter(p =>
              p.category_id === category.id ||
              p.categories?.slug === category.slug ||
              p.post_type === category.slug
            )
            .slice(0, 6);
          if (categoryPosts.length === 0) return null;
          return (
            <section key={category.slug} className="cmty-section">
              <div className="hub-section-head">
                <h2 className="hub-section-title">Explore {category.name}</h2>
                <Link href={`/community/browse?category=${category.slug}`} className="hub-view-all">View All →</Link>
              </div>
              <div className="cmty-post-grid">
                {categoryPosts.map(post => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}

function PostCard({ post }: { post: CommunityPost }) {
  const creatorName = post.creators?.name ?? '44 Community';

  return (
    <article className="cmty-post-card">
      <div className="cmty-post-title os-type-card-title">{post.title}</div>
      <div className="cmty-post-creator os-type-meta">{creatorName}</div>
      {post.body && (
        <div className="cmty-post-body os-type-body-small">{post.body}</div>
      )}
    </article>
  );
}
