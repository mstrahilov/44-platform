'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, CommunityPost } from '@/lib/platform';
import { matchesCategory, matchesQuery } from '@/lib/taxonomy';
import { ThreadRow, PageShell } from '@/components/Ui';
import { useTopbarTabs } from '@/components/TopbarContext';

type CountMap = Record<string, number>;

export default function CommunityBrowsePage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [replyCounts, setReplyCounts] = useState<CountMap>({});
  const [likeCounts, setLikeCounts] = useState<CountMap>({});
  const [activeCategory] = useState(() => {
    if (typeof window === 'undefined') return 'all';
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category') ?? params.get('view');
    return cat && cat !== 'feed' ? cat : 'all';
  });
  const [query] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('q') ?? '';
  });

  useEffect(() => {
    async function fetchData() {
      const [{ data: postRows }, { data: categoryRows }, { data: replyRows }, { data: likeRows }] = await Promise.all([
        supabase
          .from('posts')
          .select('*, creators:profiles!author_id(id, slug, name:display_name, avatar_url), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
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
    fetchData();
  }, []);

  const postCatalog = posts;
  const categoryCatalog = categories;

  const visible = useMemo(() => {
    return postCatalog.filter(post => {
      const cat = categoryCatalog.find(c => c.slug === activeCategory || c.name === activeCategory);
      const catMatch = activeCategory === 'all' || matchesCategory(post, cat);
      const qMatch = !query.trim() || matchesQuery(post, query);
      return catMatch && qMatch;
    });
  }, [activeCategory, categoryCatalog, query, postCatalog]);

  const label = activeCategory === 'all'
    ? 'Community'
    : (categoryCatalog.find(c => c.slug === activeCategory)?.name ?? activeCategory);

  useTopbarTabs(
    categoryCatalog.length > 0
      ? [
          { id: 'all', label: 'All', href: '/community', active: activeCategory === 'all' },
          ...categoryCatalog.slice(0, 5).map(category => ({
            id: category.slug,
            label: category.name,
            href: `/community/browse/${category.slug}`,
            active: category.slug === activeCategory,
          })),
        ]
      : undefined,
  );

  return (
    <PageShell>
      <style>{`
        .browse-page { display: flex; flex-direction: column; gap: 20px; }
        .thread-list { display: grid; gap: 12px; }
      `}</style>
      <div className="browse-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <h1 className="browse-page-title os-type-display">{label}</h1>
          <Link href="/community/new" className="os-button os-button-primary os-button-compact">
            Start Discussion
          </Link>
        </div>
        <div className="thread-list">
          {visible.map(post => (
            <ThreadRow
              key={post.id}
              post={post}
              replyCount={replyCounts[post.id] ?? 0}
              likeCount={likeCounts[post.id] ?? 0}
            />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
