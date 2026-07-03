'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/lib/platform';
import { matchesCategory, matchesQuery } from '@/lib/taxonomy';
import { PageShell, EmptyMessage } from '@/components/Ui';
import { SocialPostRow } from '@/components/Social';
import { useTopbarTabs } from '@/components/TopbarContext';
import { countById, type CountMap, type SocialPost } from '@/lib/social';

export default function CommunityBrowsePage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
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
          .select('*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('scope', 'posts').order('sort_order'),
        supabase.from('post_replies').select('post_id').eq('status', 'published'),
        supabase.from('post_likes').select('post_id'),
      ]);
      setPosts((postRows as SocialPost[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
      setReplyCounts(countById((replyRows as Array<{ post_id: string }> | null) ?? [], 'post_id'));
      setLikeCounts(countById((likeRows as Array<{ post_id: string }> | null) ?? [], 'post_id'));
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
      <main className="social-shell">
        <header className="social-header">
          <div className="social-title-row">
            <div>
              <h1 className="os-type-display">{label}</h1>
              <p className="social-title-copy os-type-body">
                Browse community posts from 44 members.
              </p>
            </div>
            <Link href="/community/new" className="os-button os-button-primary os-button-compact">
              New Post
            </Link>
          </div>
        </header>
        <section className="social-feed" aria-label={`${label} posts`}>
          {visible.length === 0 ? (
            <EmptyMessage>No posts here yet.</EmptyMessage>
          ) : visible.map(post => (
            <SocialPostRow
              key={post.id}
              post={post}
              replyCount={replyCounts[post.id] ?? 0}
              likeCount={likeCounts[post.id] ?? 0}
            />
          ))}
        </section>
      </main>
    </PageShell>
  );
}
