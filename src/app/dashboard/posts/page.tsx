'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, GlassPanel, HubHero } from '@/components/Ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { communityThreadHref, type CommunityPost } from '@/lib/platform';
import type { Product } from '@/lib/products';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useDashboardTabs } from '@/lib/dashboardTabs';

type UpdatePost = CommunityPost & {
  subjectLabel?: string | null;
};

type PostSubjectRow = {
  post_id: string;
  subject_type: string;
  subject_id: string;
};

export default function DashboardPostsPage() {
  useDashboardTabs('updates');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<UpdatePost[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [fetching, setFetching] = useState(true);
  const [status, setStatus] = useState('');
  const [statusKind, setStatusKind] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    async function loadPosts() {
      if (!user) return;
      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      const profileId = profileResult.profile?.id ?? user.id;

      const { data: postRows, error: postsError } = await supabase
        .from('posts')
        .select('*, categories(id, slug, name)')
        .eq('author_id', profileId)
        .in('post_type', ['update', 'updates'])
        .order('created_at', { ascending: false });

      if (postsError) {
        setStatusKind('error');
        setStatus(postsError.message);
        setFetching(false);
        return;
      }

      const resolvedPosts = (postRows as CommunityPost[] | null) ?? [];
      const postIds = resolvedPosts.map(post => post.id);

      if (postIds.length === 0) {
        setPosts([]);
        setFetching(false);
        return;
      }

      const { data: subjectRows } = await supabase
        .from('post_subjects')
        .select('post_id, subject_type, subject_id')
        .in('post_id', postIds)
        .eq('subject_type', 'product');

      const productIds = ((subjectRows as PostSubjectRow[] | null) ?? []).map(row => row.subject_id);
      const uniqueProductIds = Array.from(new Set(productIds));

      let productMap = new Map<string, string>();
      if (uniqueProductIds.length > 0) {
        const { data: productRows } = await supabase
          .from('products')
          .select('id, title')
          .in('id', uniqueProductIds);

        productMap = new Map(
          ((productRows as Array<Pick<Product, 'id' | 'title'>> | null) ?? []).map(product => [product.id, product.title]),
        );
      }

      const subjectByPost = new Map<string, string | null>();
      ((subjectRows as PostSubjectRow[] | null) ?? []).forEach(row => {
        subjectByPost.set(row.post_id, productMap.get(row.subject_id) ?? 'Release');
      });

      setPosts(
        resolvedPosts.map(post => ({
          ...post,
          subjectLabel: subjectByPost.get(post.id) ?? null,
        })),
      );
      setFetching(false);
    }

    loadPosts();
  }, [user]);

  async function togglePublish(post: UpdatePost) {
    if (!user) return;
    const profileId = profile?.id ?? user.id;
    const nextStatus = post.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase.from('posts').update({ status: nextStatus }).eq('id', post.id).eq('author_id', profileId);
    if (error) {
      setStatusKind('error');
      setStatus(error.message);
      return;
    }
    setPosts(current => current.map(entry => entry.id === post.id ? { ...entry, status: nextStatus } : entry));
    setStatusKind('success');
    setStatus(nextStatus === 'published' ? 'Update published.' : 'Update moved back to draft.');
  }

  const emptyMessage = useMemo(() => {
    if (!isCreatorProfile(profile)) {
      return 'Switch this account to a creator role to publish updates for your releases.';
    }
    return 'No creator updates yet. Post one for a published release and it will show up here.';
  }, [profile]);

  if (loading || !user) return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;

  return (
    <PageShell>
      <div className="dashboard-page">
        <HubHero
          title="Updates"
          copy="Post updates for your published releases. These updates can appear under that item in the library so owners can follow what is happening."
          actions={<Link className="os-button os-button-primary" href="/dashboard/posts/new">New Update</Link>}
        />

        {!isCreatorProfile(profile) && (
          <GlassPanel style={{ padding: 24, marginBottom: 18 }}>
            <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
              This account is not marked as a creator yet. You can still prepare drafts, but switch your profile role to creator before publishing publicly.
            </p>
          </GlassPanel>
        )}

        {status ? (
          <div className={statusKind === 'success' ? 'dashboard-status dashboard-status-success' : 'dashboard-status dashboard-status-error'}>
            {status}
          </div>
        ) : null}

        <div className="dashboard-list-surface">
          {fetching ? (
            <div className="dashboard-empty">Loading updates…</div>
          ) : posts.length === 0 ? (
            <div className="dashboard-empty">{emptyMessage}</div>
          ) : (
            posts.map((post, index) => (
              <div
                key={post.id}
                className="dashboard-list-row"
                style={{
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, auto)',
                  borderTop: index === 0 ? 'none' : undefined,
                }}
              >
                <div className="dashboard-row-copy">
                  <div className="dashboard-row-title-wrap">
                    <span className={post.status === 'published' ? 'dashboard-status-dot dashboard-status-dot-published' : 'dashboard-status-dot dashboard-status-dot-draft'} aria-hidden="true" />
                    <div className="dashboard-row-title">{post.title}</div>
                  </div>
                  <div className="dashboard-row-subtitle">{post.subjectLabel || 'Release update'}</div>
                </div>

                <div className="dashboard-row-actions">
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
