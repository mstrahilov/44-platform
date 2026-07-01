'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, CommunityPost } from '@/lib/platform';
import { matchesCategory, matchesQuery } from '@/lib/taxonomy';
import { PostCard, PageShell } from '@/components/Ui';

export default function CommunityBrowsePage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
      const [{ data: postRows }, { data: categoryRows }] = await Promise.all([
        supabase
          .from('posts')
          .select('*, creators(id, slug, name, avatar_url), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('scope', 'posts').order('sort_order'),
      ]);
      setPosts((postRows as CommunityPost[] | null) ?? []);
      setCategories((categoryRows as Category[] | null) ?? []);
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

  return (
    <PageShell>
      <style>{`
        .browse-page { display: flex; flex-direction: column; gap: 20px; }
        .post-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 14px;
        }
      `}</style>
      <div className="browse-page">
        <h1 className="browse-page-title os-type-display">{label}</h1>
        <div className="post-grid">
          {visible.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
