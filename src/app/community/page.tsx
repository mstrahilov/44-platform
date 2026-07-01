'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, CommunityPost } from '@/lib/platform';
import { PageShell, HubHero, HubSection, ThreadRow } from '@/components/Ui';

type CountMap = Record<string, number>;

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [replyCounts, setReplyCounts] = useState<CountMap>({});
  const [likeCounts, setLikeCounts] = useState<CountMap>({});

  useEffect(() => {
    async function fetchCommunity() {
      const [{ data: postRows }, { data: categoryRows }, { data: replyRows }, { data: likeRows }] = await Promise.all([
        supabase
          .from('posts')
          .select('*, creators:profiles!author_id(id, slug, name:display_name, avatar_url), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(60),
        supabase.from('categories').select('*').eq('scope', 'posts').order('sort_order'),
        supabase.from('post_replies').select('post_id').eq('status', 'published'),
        supabase.from('post_likes').select('post_id'),
      ]);
      setPosts((postRows as CommunityPost[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
      setReplyCounts(
        ((replyRows as Array<{ post_id: string }> | null) ?? []).reduce<CountMap>((acc, row) => {
          acc[row.post_id] = (acc[row.post_id] ?? 0) + 1;
          return acc;
        }, {})
      );
      setLikeCounts(
        ((likeRows as Array<{ post_id: string }> | null) ?? []).reduce<CountMap>((acc, row) => {
          acc[row.post_id] = (acc[row.post_id] ?? 0) + 1;
          return acc;
        }, {})
      );
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
              <div style={{ display: 'grid', gap: 12 }}>
                {categoryPosts.map(post => (
                  <ThreadRow
                    key={post.id}
                    post={post}
                    replyCount={replyCounts[post.id] ?? 0}
                    likeCount={likeCounts[post.id] ?? 0}
                  />
                ))}
              </div>
            </HubSection>
          );
        })}

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Link href="/community/new" className="os-button os-button-primary">
            Start Discussion
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
