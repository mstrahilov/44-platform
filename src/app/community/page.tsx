'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
type FeedMode = 'feed' | 'friends' | 'local' | 'updates' | 'questions' | 'collaboration';

const COMMUNITY_HERO: Record<FeedMode, { title: string; copy: string }> = {
  feed: { title: 'Feed', copy: 'The 44 social feed for releases, questions, collaborations, and member updates.' },
  friends: { title: 'Friends', copy: 'Posts from the creators you are connected with.' },
  local: { title: 'Local', copy: 'Posts from creators in your country.' },
  updates: { title: 'Updates', copy: 'Announcements and release notes from the 44 community.' },
  questions: { title: 'Questions', copy: 'Ask the community — get answers from other creators.' },
  collaboration: { title: 'Collaboration', copy: 'Find people to work with on your next project.' },
};

export default function CommunityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [replyCounts, setReplyCounts] = useState<CountMap>({});
  const [repliersMap, setRepliersMap] = useState<LikersMap>({});
  const [likes, setLikes] = useState<PostLike[]>([]);
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [feedMode, setFeedMode] = useState<FeedMode>('feed');
  const [likingId, setLikingId] = useState('');
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);

  useEffect(() => {
    async function fetchCommunity() {
      const [{ data: postRows }, { data: replyRows }, { data: likeRows }] = await Promise.all([
        supabase
          .from('posts')
          .select('*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type, country_code, home_country_code), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(80),
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
      setFeedMode('feed');
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

  useTopbarTabs(
    [
      { id: 'feed', label: 'Feed', onClick: () => setFeedMode('feed'), active: feedMode === 'feed' },
      ...(user ? [{ id: 'friends', label: 'Friends', onClick: () => setFeedMode('friends'), active: feedMode === 'friends' }] : []),
      { id: 'local', label: 'Local', onClick: () => setFeedMode('local'), active: feedMode === 'local' },
      { id: 'updates', label: 'Updates', onClick: () => setFeedMode('updates'), active: feedMode === 'updates' },
      { id: 'questions', label: 'Questions', onClick: () => setFeedMode('questions'), active: feedMode === 'questions' },
      { id: 'collaboration', label: 'Collaboration', onClick: () => setFeedMode('collaboration'), active: feedMode === 'collaboration' },
    ],
  );

  const likeCounts = useMemo(() => countById(likes, 'post_id'), [likes]);
  const likersMap: LikersMap = useMemo(() => likersByPost(likes), [likes]);
  const likedIds = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(likes.filter(like => like.profile_id === user.id).map(like => like.post_id));
  }, [likes, user]);
  const canInteract = hasCommunityIdentity(profile);
  const viewerCountry = profile?.country_code || profile?.home_country_code || null;
  const visiblePosts = posts.filter(post => {
    if (feedMode === 'friends') return Boolean(post.author_id && friendIds.has(post.author_id));
    if (feedMode === 'local') {
      const authorCountry = post.creators?.country_code || post.creators?.home_country_code || null;
      return Boolean(viewerCountry && authorCountry && viewerCountry === authorCountry);
    }
    if (feedMode === 'updates') return post.categories?.slug === 'updates' || post.post_type === 'updates' || post.post_type === 'update';
    if (feedMode === 'questions') return post.categories?.slug === 'questions' || post.post_type === 'questions' || post.post_type === 'question';
    if (feedMode === 'collaboration') return post.post_type === 'collaboration' || post.categories?.slug === 'collaboration' || post.categories?.name?.toLowerCase() === 'collaboration';
    return true;
  });

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

  const heroContent = COMMUNITY_HERO[feedMode];

  return (
    <PageShell>
      <main className="social-shell">
        <header className="social-header">
          <div className="social-title-row">
            <div>
              <h1 className="os-type-display">{heroContent.title}</h1>
              <p className="social-title-copy os-type-body">
                {heroContent.copy}
              </p>
            </div>
            <Link href={user ? '/community/new' : '/login'} className="os-button os-button-primary os-button-compact">
              New Post
            </Link>
          </div>
        </header>

        {error && <div className="dashboard-status dashboard-status-error">{error}</div>}

        <section className="dashboard-list-surface social-feed social-feed-list social-feed-panel" aria-label="Community feed">
          {visiblePosts.length === 0 ? (
            <div className="dashboard-empty">{feedMode === 'friends' ? 'No friend posts yet.' : feedMode === 'local' ? 'No local posts yet.' : 'No posts yet.'}</div>
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
