'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { CommunityPost, Resource } from '@/lib/platform';
import { FALLBACK_RESOURCES } from '@/lib/platform';

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

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    async function fetchCommunity() {
      const [{ data: postRows }, { data: resourceRows }] = await Promise.all([
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
          .limit(4),
      ]);

      setPosts((postRows as CommunityPost[] | null) ?? []);
      setResources((resourceRows as Resource[] | null) ?? []);
    }

    fetchCommunity();
  }, []);

  const communityPosts = posts.length > 0 ? posts : FALLBACK_POSTS;
  const resourceList = resources.length > 0 ? resources : FALLBACK_RESOURCES;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 56px' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18 }}>
        <main style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <section style={{ borderRadius: 28, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.045)', backdropFilter: 'blur(24px)', padding: 26 }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', marginBottom: 8 }}>Community</div>
            <h1 style={{ fontSize: 42, fontWeight: 780, letterSpacing: '-0.04em', lineHeight: 1, color: '#fff', marginBottom: 10 }}>Creator updates, resources, and discussions</h1>
            <p style={{ maxWidth: 720, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.52)', lineHeight: 1.7 }}>A calmer community feed for process notes, release updates, free knowledge, and creator-to-creator support.</p>
          </section>

          {communityPosts.map(post => (
            <article key={post.id} style={{ borderRadius: 20, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.045)', backdropFilter: 'blur(24px)', padding: '22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.90)' }}>{post.creators?.name ?? '44 Community'}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
                <div className="chip">{post.categories?.name ?? post.post_type}</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 760, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>{post.title}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.52)', lineHeight: 1.75 }}>{post.body}</div>
            </article>
          ))}
        </main>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SidePanel title="Resources">
            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.50)', lineHeight: 1.7, marginBottom: 14 }}>
              Guides, templates, lessons, and checklists for the DIY path.
            </div>
            <Link className="btn-primary" href="/resources" style={{ width: '100%', marginBottom: 8 }}>Browse Resources</Link>
            {resourceList.slice(0, 3).map(resource => (
              <div key={resource.id} style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10, marginTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.82)', marginBottom: 3 }}>{resource.title}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.34)', lineHeight: 1.45 }}>{resource.categories?.name ?? resource.resource_type}</div>
              </div>
            ))}
          </SidePanel>

          <SidePanel title="Creators">
            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.50)', lineHeight: 1.7 }}>
              Creator discovery will expand here once public creator profiles are wired to Supabase profiles.
            </div>
            <Link className="btn-ghost" href="/profile" style={{ width: '100%', marginTop: 14 }}>View Example Creator</Link>
          </SidePanel>
        </aside>
      </div>
    </div>
  );
}

function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', borderRadius: 18, padding: '18px 20px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
