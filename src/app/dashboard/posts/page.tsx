'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { communityThreadHref, type CommunityPost } from '@/lib/platform';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useDashboardTabs } from '@/lib/dashboardTabs';

export default function DashboardPostsPage() {
  useDashboardTabs('posts');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function loadPosts() {
      if (!user) return;
      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      const profileId = profileResult.profile?.id ?? user.id;

      const { data } = await supabase
        .from('posts')
        .select('*, categories(id, slug, name)')
        .eq('author_id', profileId)
        .order('created_at', { ascending: false });

      setPosts((data as CommunityPost[] | null) ?? []);
      setFetching(false);
    }

    loadPosts();
  }, [user]);

  async function togglePublish(post: CommunityPost) {
    if (!user) return;
    const profileId = profile?.id ?? user.id;
    const nextStatus = post.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase.from('posts').update({ status: nextStatus }).eq('id', post.id).eq('author_id', profileId);
    if (error) {
      alert(error.message);
      return;
    }
    setPosts(current => current.map(entry => entry.id === post.id ? { ...entry, status: nextStatus } : entry));
  }

  if (loading || !user) return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;

  return (
    <PageShell>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '64px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 48, fontWeight: 780, letterSpacing: '-0.04em', marginBottom: 10 }}>Posts</h1>
            <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 18 }}>Write updates, news, and community posts directly from Dashboard.</p>
          </div>
          <Link className="os-button os-button-primary" href="/dashboard/posts/new">New Post</Link>
        </div>

        {!isCreatorProfile(profile) && (
          <GlassPanel style={{ padding: 24, marginBottom: 18 }}>
            <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 15 }}>
              This account is not marked as a creator yet. You can still save drafts, but switch your profile role to creator before publishing publicly.
            </p>
          </GlassPanel>
        )}

        <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
          {fetching ? (
            <div style={{ padding: '24px 26px', color: 'var(--os-color-ink-secondary)' }}>Loading posts…</div>
          ) : posts.length === 0 ? (
            <div style={{ padding: '24px 26px', color: 'var(--os-color-ink-secondary)' }}>No posts yet. Create your first one from inside Dashboard.</div>
          ) : (
            posts.map((post, index) => (
              <div key={post.id} style={{ padding: '22px 26px', display: 'grid', gridTemplateColumns: '1fr 180px 240px', gap: 20, alignItems: 'center', borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 720 }}>{post.title}</div>
                  <div style={{ marginTop: 5, fontSize: 13, color: 'var(--os-color-ink-muted)' }}>{post.post_type || 'Post'}</div>
                </div>
                <div style={{ color: 'var(--os-color-ink-secondary)', fontSize: 14 }}>{post.categories?.name || 'Community'}</div>
                <div style={{ justifySelf: 'end', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ borderRadius: 999, padding: '7px 12px', background: 'rgba(255,255,255,.07)', color: 'var(--os-color-ink-secondary)', fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>{post.status || 'draft'}</div>
                  <Link href={communityThreadHref(post)} className="os-button os-button-ghost os-button-compact">
                    Open
                  </Link>
                  <button className="os-button os-button-secondary os-button-compact" onClick={() => togglePublish(post)}>
                    {post.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            ))
          )}
        </GlassPanel>
      </div>
    </PageShell>
  );
}
