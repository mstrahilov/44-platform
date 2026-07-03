'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { formatServicePrice, type Profile, type Resource, type Service } from '@/lib/platform';
import type { Product } from '@/lib/products';
import { formatProductPrice } from '@/lib/products';
import { PageShell, CenteredMessage } from '@/components/Ui';
import { SocialArtifactCard, SocialAvatar, SocialPostRow } from '@/components/Social';
import { getOwnershipKeys, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useTopbarBack } from '@/components/TopbarContext';
import { authorHandle, countById, likersByPost, repliersByPost, type CountMap, type LikeRow, type LikersMap, type ReplyEngagerRow, type SocialPost, type SocialReply } from '@/lib/social';
import { hasCommunityIdentity, communityIdentityMessage } from '@/lib/communityProfile';
import { isMissingRelationError } from '@/lib/schemaCompat';
import { createOrOpenConversation } from '@/lib/messages';

type ProfileTab = 'posts' | 'replies' | 'products' | 'services' | 'resources';
type FollowRow = {
  follower_id: string;
  following_id: string;
};

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const { user } = useAuth();
  useTopbarBack({ href: '/community', label: 'Community' });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [replies, setReplies] = useState<SocialReply[]>([]);
  const [replyCounts, setReplyCounts] = useState<CountMap>({});
  const [repliersMap, setRepliersMap] = useState<LikersMap>({});
  const [likeCounts, setLikeCounts] = useState<CountMap>({});
  const [likersMap, setLikersMap] = useState<LikersMap>({});
  const [followers, setFollowers] = useState<FollowRow[]>([]);
  const [following, setFollowing] = useState<FollowRow[]>([]);
  const [currentProfile, setCurrentProfile] = useState<StudioProfile | null>(null);
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfilePage() {
      setLoading(true);
      setError('');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.eq.${username},slug.eq.${username}`)
        .maybeSingle();

      const resolvedProfile = (profileData as Profile | null) ?? null;
      setProfile(resolvedProfile);

      if (!resolvedProfile) {
        setProducts([]);
        setServices([]);
        setResources([]);
        setPosts([]);
        setReplies([]);
        setFollowers([]);
        setFollowing([]);
        setLoading(false);
        return;
      }

      const profileId = resolvedProfile.id;
      const ownershipProfile = {
        id: resolvedProfile.id,
        display_name: resolvedProfile.display_name ?? null,
        username: resolvedProfile.username ?? null,
        role: resolvedProfile.role ?? null,
        slug: resolvedProfile.slug ?? null,
        avatar_url: resolvedProfile.avatar_url ?? null,
        bio: resolvedProfile.bio ?? null,
        creator_type: resolvedProfile.creator_type ?? null,
      };
      const { ids } = getOwnershipKeys(ownershipProfile, profileId);

      const [
        productResult,
        serviceResult,
        resourceResult,
        postResult,
        replyResult,
        replyCountResult,
        likeResult,
        followerResult,
        followingResult,
      ] = await Promise.all([
        supabase
          .from('products')
          .select('*, creators:profiles!author_id(*)')
          .eq('author_id', profileId)
          .order('created_at', { ascending: false }),
        supabase
          .from('services')
          .select('*, creators:profiles!author_id(id, slug, username, name:display_name, avatar_url, country_code, display_currency, home_country_code, home_currency)')
          .eq('author_id', profileId)
          .order('created_at', { ascending: false }),
        supabase
          .from('resources')
          .select('*, creators:profiles!author_id(id, slug, username, name:display_name, avatar_url)')
          .eq('author_id', profileId)
          .order('created_at', { ascending: false }),
        supabase
          .from('posts')
          .select('*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type), categories(id, slug, name)')
          .in('author_id', ids)
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase
          .from('post_replies')
          .select('*, authors:profiles!author_id(id, slug, display_name, username, avatar_url), posts(id, slug, title)')
          .eq('author_id', profileId)
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase
          .from('post_replies')
          .select('post_id, author_id, authors:profiles!author_id(id, display_name, username, avatar_url)')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase
          .from('post_likes')
          .select('post_id, profile_id, profiles:profiles!profile_id(id, display_name, username, avatar_url)')
          .order('created_at', { ascending: false }),
        supabase.from('profile_follows').select('follower_id, following_id').eq('following_id', profileId),
        supabase.from('profile_follows').select('follower_id, following_id').eq('follower_id', profileId),
      ]);

      setProducts(((productResult.data as Product[] | null) ?? []).filter(Boolean));
      setServices(((serviceResult.data as Service[] | null) ?? []).filter(Boolean));
      setResources(((resourceResult.data as Resource[] | null) ?? []).filter(Boolean));
      setPosts(((postResult.data as SocialPost[] | null) ?? []).filter(Boolean));
      setReplies(((replyResult.data as SocialReply[] | null) ?? []).filter(Boolean));
      const replyRowsData = (replyCountResult.data as ReplyEngagerRow[] | null) ?? [];
      setReplyCounts(countById(replyRowsData, 'post_id'));
      setRepliersMap(repliersByPost(replyRowsData));
      const likeRows = (likeResult.data as LikeRow[] | null) ?? [];
      setLikeCounts(countById(likeRows, 'post_id'));
      setLikersMap(likersByPost(likeRows));
      setFollowers(isMissingRelationError(followerResult.error) ? [] : ((followerResult.data as FollowRow[] | null) ?? []));
      setFollowing(isMissingRelationError(followingResult.error) ? [] : ((followingResult.data as FollowRow[] | null) ?? []));
      setLoading(false);
    }

    loadProfilePage();
  }, [username]);

  useEffect(() => {
    if (!user) {
      setCurrentProfile(null);
      return;
    }
    loadStudioProfile(user.id).then(result => setCurrentProfile(result.profile));
  }, [user]);

  const isOwn = user?.id === profile?.id;
  const isFollowing = Boolean(user && followers.some(row => row.follower_id === user.id));
  const tabs = useMemo(
    () => [
      { id: 'posts' as const, label: 'Posts' },
      { id: 'replies' as const, label: 'Replies' },
      { id: 'products' as const, label: 'Releases' },
      { id: 'services' as const, label: 'Services' },
      { id: 'resources' as const, label: 'Resources' },
    ],
    [],
  );

  async function toggleFollow() {
    if (!user || !profile || isOwn || busy) return;
    if (!hasCommunityIdentity(currentProfile)) {
      setError(communityIdentityMessage());
      return;
    }

    setBusy('follow');
    setError('');
    if (isFollowing) {
      const { error: deleteError } = await supabase
        .from('profile_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profile.id);
      if (isMissingRelationError(deleteError)) setError('Follows are ready in the app. Run the social SQL to enable them in Supabase.');
      else if (deleteError) setError(deleteError.message);
      else setFollowers(current => current.filter(row => row.follower_id !== user.id));
    } else {
      const nextFollow = { follower_id: user.id, following_id: profile.id };
      const { error: insertError } = await supabase.from('profile_follows').insert(nextFollow);
      if (isMissingRelationError(insertError)) setError('Follows are ready in the app. Run the social SQL to enable them in Supabase.');
      else if (insertError) setError(insertError.message);
      else setFollowers(current => [...current, nextFollow]);
    }
    setBusy('');
  }

  async function openMessage() {
    if (!user || !profile || isOwn || busy) return;
    if (!hasCommunityIdentity(currentProfile)) {
      setError(communityIdentityMessage());
      return;
    }
    setBusy('message');
    setError('');
    const result = await createOrOpenConversation(user.id, profile.id);
    if (result.error && isMissingRelationError(result.error)) {
      setError('Messages are ready in the app. Run the social SQL to enable conversations in Supabase.');
    }
    router.push(result.href);
    setBusy('');
  }

  if (loading) {
    return <PageShell><CenteredMessage>Loading...</CenteredMessage></PageShell>;
  }

  if (!profile) {
    return <PageShell><CenteredMessage>Profile not found</CenteredMessage></PageShell>;
  }

  const displayName = profile.display_name ?? profile.username ?? 'Member';
  const handle = authorHandle(profile);
  const eyebrow = profile.creator_type ?? (profile.role === 'creator' ? 'Creator' : 'Member');

  return (
    <PageShell>
      <main className="social-shell social-shell-wide">
        <section
          className="social-profile-cover"
          style={{ backgroundImage: profile.hero_url ? `url(${profile.hero_url})` : undefined }}
          aria-label={`${displayName} cover`}
        />

        <section className="social-profile-head">
          <div className="social-profile-main">
            <div className="social-profile-identity">
              <SocialAvatar profile={profile} size="large" />
              <div className="social-profile-text">
                <div className="app-detail-eyebrow os-type-eyebrow">{eyebrow}</div>
                <h1 className="social-profile-name">{displayName}</h1>
                {handle && <div className="social-handle">@{handle}</div>}
              </div>
            </div>

            <div className="social-profile-actions">
              {isOwn ? (
                <Link href="/community/profile/edit" className="os-button os-button-primary">Edit Profile</Link>
              ) : (
                <>
                  <button type="button" className="os-button os-button-secondary" onClick={openMessage} disabled={!user || busy === 'message'}>
                    Message
                  </button>
                  <button type="button" className="os-button os-button-primary" onClick={toggleFollow} disabled={!user || busy === 'follow'}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="social-profile-bio">
            {profile.bio || 'This member has not added a bio yet.'}
          </p>

          <div className="social-profile-stats">
            <span><strong>{posts.length}</strong>posts</span>
          </div>

          {error && <div className="dashboard-status dashboard-status-error">{error} <Link href="/account" style={{ color: 'inherit', fontWeight: 800 }}>Finish setup</Link></div>}

          <nav className="social-profile-tabs" aria-label="Profile sections" role="tablist">
            {tabs.map(item => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </section>

        {tab === 'posts' && (
          <section className="social-feed" aria-label="Posts">
            {posts.length ? (
              posts.map(post => (
                <SocialPostRow
                  key={post.id}
                  post={post}
                  replyCount={replyCounts[post.id] ?? 0}
                  likeCount={likeCounts[post.id] ?? 0}
                  likers={likersMap[post.id] ?? []}
                  repliers={repliersMap[post.id] ?? []}
                  onDelete={async () => {
                    if (!user || post.author_id !== user.id) return;
                    if (!window.confirm('Delete this post? This cannot be undone.')) return;
                    const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id);
                    if (deleteError) { setError(deleteError.message); return; }
                    setPosts(current => current.filter(p => p.id !== post.id));
                  }}
                  canDelete={Boolean(user && post.author_id === user.id)}
                />
              ))
            ) : (
              <div className="app-empty-text">No posts yet.</div>
            )}
          </section>
        )}

        {tab === 'replies' && (
          <section className="social-feed" aria-label="Replies">
            {replies.length ? (
              replies.map(reply => {
                const post = (reply as SocialReply & { posts?: { id: string; slug?: string | null; title?: string | null } | null }).posts;
                return (
                  <article className="social-row" key={reply.id}>
                    <SocialAvatar profile={profile} />
                    <div className="social-row-main">
                      <div className="social-row-meta">
                        <span className="social-author-name">{displayName}</span>
                        {handle && <span className="social-handle">@{handle}</span>}
                        <span className="social-dot" />
                        <span className="social-time">replied</span>
                      </div>
                      <p className="social-row-body">{reply.body}</p>
                      {post && (
                        <Link href={`/community/thread/${post.slug || post.id}`} className="social-note os-type-body-small">
                          View thread: {post.title || 'Community post'}
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="app-empty-text">No replies yet.</div>
            )}
          </section>
        )}

        {tab === 'products' && (
          <ArtifactGrid empty="No releases published yet.">
            {products.map(product => (
              <SocialArtifactCard
                key={product.id}
                href={`/product/${product.slug || product.id}`}
                title={product.title}
                meta={`${product.product_type || product.category || 'Product'} · ${formatProductPrice(product)}`}
                image={product.cover_url}
              />
            ))}
          </ArtifactGrid>
        )}

        {tab === 'services' && (
          <ArtifactGrid empty="No services published yet.">
            {services.map(service => (
              <SocialArtifactCard
                key={service.id}
                href={`/service/${service.slug || service.id}`}
                title={service.title}
                meta={`${service.service_type || 'Service'} · ${formatServicePrice(service)}`}
                image={service.cover_url}
              />
            ))}
          </ArtifactGrid>
        )}

        {tab === 'resources' && (
          <ArtifactGrid empty="No resources published yet.">
            {resources.map(resource => (
              <SocialArtifactCard
                key={resource.id}
                href={`/resources/${resource.slug || resource.id}`}
                title={resource.title}
                meta={resource.resource_type || 'Resource'}
                image={resource.cover_url}
              />
            ))}
          </ArtifactGrid>
        )}
      </main>
    </PageShell>
  );
}

function ArtifactGrid({ children, empty }: { children: ReactNode; empty: string }) {
  const count = Array.isArray(children) ? children.length : 1;
  return count ? (
    <section className="social-card-grid">{children}</section>
  ) : (
    <div className="app-empty-text">{empty}</div>
  );
}
