'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel, HubHero } from '@/components/Ui';
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
      <div className="dashboard-page">
        <HubHero
          title="Posts"
          copy="Write updates, announcements, and conversation starters for the community."
          actions={<Link className="os-button os-button-primary" href="/dashboard/posts/new">New Post</Link>}
        />

        {!isCreatorProfile(profile) && (
          <GlassPanel style={{ padding: 24, marginBottom: 18 }}>
            <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
              This account is not marked as a creator yet. You can still save drafts, but switch your profile role to creator before publishing publicly.
            </p>
          </GlassPanel>
        )}

        <div className="dashboard-list-surface">
          {fetching ? (
            <div className="dashboard-empty">Loading posts…</div>
          ) : posts.length === 0 ? (
            <div className="dashboard-empty">No posts yet. Create your first one from inside Dashboard.</div>
          ) : (
            posts.map((post, index) => (
              <div
                key={post.id}
                className="dashboard-list-row"
                style={{ gridTemplateColumns: 'minmax(0, 1fr) 180px minmax(300px, auto)', borderTop: index === 0 ? 'none' : undefined }}
              >
                <div className="dashboard-row-copy">
                  <div className="dashboard-row-title">{post.title}</div>
                  <div className="dashboard-row-subtitle">{post.post_type || 'Post'}</div>
                </div>
                <div className="dashboard-row-meta">{post.categories?.name || 'Community'}</div>
                <div className="dashboard-row-actions">
                  <div className="dashboard-status-pill">{post.status || 'draft'}</div>
                  <Link href={communityThreadHref(post)} className="os-button os-button-ghost os-button-compact">
                    Open
                  </Link>
                  <button
                    className="os-button os-button-secondary os-button-compact"
                    onClick={() => togglePublish(post)}
                  >
                    {post.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
