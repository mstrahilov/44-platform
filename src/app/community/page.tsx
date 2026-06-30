'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, CommunityPost } from '@/lib/platform';
import { PageShell, HubHero, HubSection, PostCard } from '@/components/Ui';

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

  const communityPosts = posts;

  const categoryList = useMemo(() => {
    return categories
      .filter(c => c.scope === 'posts')
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  }, [categories]);

  return (
    <PageShell>
      <div className="app-page">
        <HubHero
          title="Community"
          copy="Share work, ask questions, find collaborators, follow updates, and discuss the creative ecosystem around 44."
        />

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
            <HubSection key={category.slug} title={`Explore ${category.name}`} href={`/community/browse/${category.slug}`}>
              <div className="app-grid app-grid-wide">
                {categoryPosts.map(post => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </HubSection>
          );
        })}
      </div>
    </PageShell>
  );
}
