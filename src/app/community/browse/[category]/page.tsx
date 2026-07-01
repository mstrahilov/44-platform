'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, CommunityPost } from '@/lib/platform';
import { matchesCategory } from '@/lib/taxonomy';
import { PostCard, PageShell } from '@/components/Ui';


export default function CommunityBrowseCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

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

  const cat = categoryCatalog.find(c => c.slug === category || c.name.toLowerCase() === category);
  const label = cat?.name ?? category.charAt(0).toUpperCase() + category.slice(1);

  const visible = useMemo(() => {
    return postCatalog.filter(p => matchesCategory(p, cat));
  }, [postCatalog, cat]);

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
