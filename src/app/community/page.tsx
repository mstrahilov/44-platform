'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/lib/platform';
import { PageShell } from '@/components/Ui';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import { SocialPostRow } from '@/components/Social';
import { useTopbarTabs } from '@/components/TopbarContext';
import { hasCommunityIdentity } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useAuth } from '@/lib/useAuth';
import { countById, likersByPost, repliersByPost, type CountMap, type LikeRow, type LikersMap, type ReplyEngagerRow, type SocialPost } from '@/lib/social';
import { loadFriendRequests, otherFriendProfile } from '@/lib/friends';

type PostLike = LikeRow;

export default function CommunityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [replyCounts, setReplyCounts] = useState<CountMap>({});
  const [repliersMap, setRepliersMap] = useState<LikersMap>({});
  const [likes, setLikes] = useState<PostLike[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [feedMode, setFeedMode] = useState<'all' | 'friends'>('all');
  const [likingId, setLikingId] = useState('');
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);

  useEffect(() => {
    async function fetchCommunity() {
      const [{ data: postRows }, { data: categoryRows }, { data: replyRows }, { data: likeRows }] = await Promise.all([
        supabase
          .from('posts')
          .select('*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(80),
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
      setLikes((likeRows as PostLike[] | null) ?? []);
    }
    fetchCommunity();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setFriendIds(new Set());
      setFeedMode('all');
      return;
    }
    loadStudioProfile(user.id).then(result => setProfile(result.profile));
    loadFriendRequests(user.id).then(result => {
      const ids = result.rows
        .filter(row => row.status === 'accepted')
        .map(row => otherFriendProfile(row, user.id)?.id)
        .filter((id): id is string => Boolean(id));
      setFriendIds(new Set(ids));
    });
  }, [user]);

  const categoryList = useMemo(() => {
    return categories
      .filter(c => c.scope === 'posts')
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  }, [categories]);

  useTopbarTabs(
    categoryList.length > 0
      ? [
          { id: 'all', label: 'For You', onClick: () => setFeedMode('all'), active: feedMode === 'all' },
          ...(user ? [{ id: 'friends', label: 'Friends', onClick: () => setFeedMode('friends'), active: feedMode === 'friends' }] : []),
          ...categoryList.slice(0, 5).map(c => ({
            id: c.slug,
            label: c.name,
            href: `/community/browse/${c.slug}`,
          })),
        ]
      : undefined,
  );

  const likeCounts = useMemo(() => countById(likes, 'post_id'), [likes]);
  const likersMap: LikersMap = useMemo(() => likersByPost(likes), [likes]);
  const likedIds = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(likes.filter(like => like.profile_id === user.id).map(like => like.post_id));
  }, [likes, user]);
  const canInteract = hasCommunityIdentity(profile);
  const visiblePosts = feedMode === 'friends'
    ? posts.filter(post => Boolean(post.author_id && friendIds.has(post.author_id)))
    : posts;

  async function toggleLike(post: SocialPost) {
    if (likingId) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!canInteract) {
      setSetupGateOpen(true);
      return;
    }

    setLikingId(post.id);
    setError('');
    const liked = likedIds.has(post.id);
    if (liked) {
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('profile_id', user.id);
      if (deleteError) setError(deleteError.message);
      else setLikes(current => current.filter(like => !(like.post_id === post.id && like.profile_id === user.id)));
    } else {
      const nextLike: PostLike = {
        post_id: post.id,
        profile_id: user.id,
        profiles: profile ? { id: profile.id, display_name: profile.display_name, username: profile.username, avatar_url: profile.avatar_url } : null,
      };
      const { error: insertError } = await supabase.from('post_likes').insert({ post_id: post.id, profile_id: user.id });
      if (insertError) setError(insertError.message);
      else setLikes(current => [...current, nextLike]);
    }
    setLikingId('');
  }

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
              <h1 className="os-type-display">Community</h1>
              <p className="social-title-copy os-type-body">
                The 44 social feed for releases, questions, collaborations, and member updates.
              </p>
            </div>
            <Link href={user ? '/community/new' : '/login'} className="os-button os-button-primary os-button-compact">
              New Post
            </Link>
          </div>
        </header>

        {error && <div className="dashboard-status dashboard-status-error">{error}</div>}

        <section className="social-feed" aria-label="Community feed">
          {visiblePosts.length === 0 ? (
            <div className="app-empty-text">{feedMode === 'friends' ? 'No friend posts yet.' : 'No posts yet.'}</div>
          ) : (
            visiblePosts.map(post => (
              <SocialPostRow
                key={post.id}
                post={post}
                replyCount={replyCounts[post.id] ?? 0}
                likeCount={likeCounts[post.id] ?? 0}
                likers={likersMap[post.id] ?? []}
                repliers={repliersMap[post.id] ?? []}
                liked={likedIds.has(post.id)}
                onLike={() => toggleLike(post)}
                onDelete={() => deletePost(post)}
                canDelete={Boolean(user && post.author_id === user.id)}
                disabled={likingId === post.id}
              />
            ))
          )}
        </section>
      </main>
      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
    </PageShell>
  );
}
