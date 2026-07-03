'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/lib/platform';
import { matchesCategory } from '@/lib/taxonomy';
import { PageShell, EmptyMessage } from '@/components/Ui';
import { SocialPostRow } from '@/components/Social';
import { useAuth } from '@/lib/useAuth';
import { useTopbarTabs } from '@/components/TopbarContext';
import { countById, likersByPost, repliersByPost, type CountMap, type LikeRow, type LikersMap, type ReplyEngagerRow, type SocialPost } from '@/lib/social';

export default function CommunityBrowseCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [replyCounts, setReplyCounts] = useState<CountMap>({});
  const [repliersMap, setRepliersMap] = useState<LikersMap>({});
  const [likeCounts, setLikeCounts] = useState<CountMap>({});
  const [likersMap, setLikersMap] = useState<LikersMap>({});
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      const [{ data: postRows }, { data: categoryRows }, { data: replyRows }, { data: likeRows }] = await Promise.all([
        supabase
          .from('posts')
          .select('*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('scope', 'posts').order('sort_order'),
        supabase
          .from('post_replies')
          .select('post_id, author_id, authors:profiles!author_id(id, display_name, username, avatar_url)')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase
          .from('post_likes')
          .select('post_id, profile_id, profiles:profiles!profile_id(id, display_name, username, avatar_url)')
          .order('created_at', { ascending: false }),
      ]);
      setPosts((postRows as SocialPost[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
      const replies = (replyRows as ReplyEngagerRow[] | null) ?? [];
      setReplyCounts(countById(replies, 'post_id'));
      setRepliersMap(repliersByPost(replies));
      const likes = (likeRows as LikeRow[] | null) ?? [];
      setLikeCounts(countById(likes, 'post_id'));
      setLikersMap(likersByPost(likes));
    }
    fetchData();
  }, []);

  const categoryList = useMemo(() => {
    return categories
      .filter(c => c.scope === 'posts')
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  }, [categories]);

  const cat = categoryList.find(c => c.slug === category || c.name.toLowerCase() === category);
  const label = cat?.name ?? category.charAt(0).toUpperCase() + category.slice(1);

  useTopbarTabs(
    categoryList.length > 0
      ? [
          { id: 'all', label: 'For You', href: '/community' },
          ...categoryList.slice(0, 5).map(c => ({
            id: c.slug,
            label: c.name,
            href: `/community/browse/${c.slug}`,
            active: c.slug === cat?.slug,
          })),
        ]
      : undefined,
  );

  const visible = useMemo(() => {
    return posts.filter(p => matchesCategory(p, cat));
  }, [posts, cat]);

  async function deletePost(post: SocialPost) {
    if (!user || post.author_id !== user.id) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setPosts(current => current.filter(p => p.id !== post.id));
  }

  return (
    <PageShell>
      <main className="social-shell">
        <header className="social-header">
          <div className="social-title-row">
            <div>
              <h1 className="os-type-display">{label}</h1>
              <p className="social-title-copy os-type-body">
                Browse {label.toLowerCase()} posts from the 44 community.
              </p>
            </div>
            <Link href="/community/new" className="os-button os-button-primary os-button-compact">
              New Post
            </Link>
          </div>
        </header>

        {error && <div className="dashboard-status dashboard-status-error">{error}</div>}

        <section className="social-feed" aria-label={`${label} posts`}>
          {visible.length === 0 ? (
            <EmptyMessage>No posts in {label} yet.</EmptyMessage>
          ) : (
            visible.map(post => (
              <SocialPostRow
                key={post.id}
                post={post}
                replyCount={replyCounts[post.id] ?? 0}
                likeCount={likeCounts[post.id] ?? 0}
                likers={likersMap[post.id] ?? []}
                repliers={repliersMap[post.id] ?? []}
                onDelete={() => deletePost(post)}
                canDelete={Boolean(user && post.author_id === user.id)}
              />
            ))
          )}
        </section>
      </main>
    </PageShell>
  );
}
