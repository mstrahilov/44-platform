'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { formatServicePrice, type Profile, type Service } from '@/lib/platform';
import type { Product } from '@/lib/products';
import { formatProductPrice } from '@/lib/products';
import { getProductExperience, productStoreHref } from '@/lib/experience';
import { PageShell, CenteredMessage } from '@/components/Ui';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import { SocialArtifactCard, SocialAvatar, SocialPostRow } from '@/components/Social';
import { getOwnershipKeys, isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useTopbarBack, useTopbarTabs } from '@/components/TopbarContext';
import { authorHandle, countById, isGeneralPost, likersByPost, repliersByPost, type CountMap, type LikeRow, type LikersMap, type ReplyEngagerRow, type SocialPost } from '@/lib/social';
import { hasCommunityIdentity } from '@/lib/communityProfile';
import { isMissingRelationError } from '@/lib/schemaCompat';
import { createOrOpenConversation } from '@/lib/messages';

type ProfileTab = 'posts' | 'music' | 'books' | 'assets' | 'services';

function parseProfileTab(value: string | null, isCreator: boolean): ProfileTab | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === 'posts') return 'posts';
  if (!isCreator) return null;
  if (normalized === 'music' || normalized === 'releases' || normalized === 'products') return 'music';
  if (normalized === 'books') return 'books';
  if (normalized === 'assets') return 'assets';
  if (normalized === 'services') return 'services';
  return null;
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [replyCounts, setReplyCounts] = useState<CountMap>({});
  const [repliersMap, setRepliersMap] = useState<LikersMap>({});
  const [likeCounts, setLikeCounts] = useState<CountMap>({});
  const [likersMap, setLikersMap] = useState<LikersMap>({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<StudioProfile | null>(null);
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);

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
        setPosts([]);
        setIsFollowing(false);
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
        postResult,
        replyCountResult,
        likeResult,
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
          .from('posts')
          .select('*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type), categories(id, slug, name)')
          .in('author_id', ids)
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
      ]);

      setProducts(((productResult.data as Product[] | null) ?? []).filter(Boolean));
      setServices(((serviceResult.data as Service[] | null) ?? []).filter(Boolean));
      setPosts(((postResult.data as SocialPost[] | null) ?? []).filter(Boolean));
      const replyRowsData = (replyCountResult.data as ReplyEngagerRow[] | null) ?? [];
      setReplyCounts(countById(replyRowsData, 'post_id'));
      setRepliersMap(repliersByPost(replyRowsData));
      const likeRows = (likeResult.data as LikeRow[] | null) ?? [];
      setLikeCounts(countById(likeRows, 'post_id'));
      setLikersMap(likersByPost(likeRows));
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

  useEffect(() => {
    if (!user || !profile || user.id === profile.id) {
      return;
    }

    supabase
      .from('profile_follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle()
      .then(result => {
        if (isMissingRelationError(result.error)) return;
        if (result.error) setError(result.error.message ?? 'Could not load follow state.');
        else setIsFollowing(Boolean(result.data));
      });
  }, [profile, user]);

  const isOwn = user?.id === profile?.id;
  useTopbarTabs(undefined);
  useTopbarBack(isOwn ? undefined : { href: '/community', label: 'Community' });

  async function handleFollowAction() {
    if (!profile || isOwn || busy) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!hasCommunityIdentity(currentProfile)) {
      setSetupGateOpen(true);
      return;
    }

    setBusy('follow');
    setError('');

    if (isFollowing) {
      const { error: unfollowError } = await supabase
        .from('profile_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profile.id);
      if (unfollowError) setError(unfollowError.message);
      else setIsFollowing(false);
    } else {
      const { error: followError } = await supabase
        .from('profile_follows')
        .upsert({ follower_id: user.id, following_id: profile.id }, { onConflict: 'follower_id,following_id' });
      if (followError) setError(followError.message);
      else setIsFollowing(true);
    }
    setBusy('');
  }

  async function openMessage() {
    if (!profile || isOwn || busy) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!hasCommunityIdentity(currentProfile)) {
      setSetupGateOpen(true);
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

  const profileForRoleCheck = profile ? {
    id: profile.id,
    display_name: profile.display_name ?? null,
    username: profile.username ?? null,
    role: profile.role ?? null,
    slug: profile.slug ?? null,
    avatar_url: profile.avatar_url ?? null,
    bio: profile.bio ?? null,
    creator_type: profile.creator_type ?? null,
    country_code: profile.country_code ?? null,
    display_currency: profile.display_currency ?? null,
    home_country_code: profile.home_country_code ?? null,
    home_currency: profile.home_currency ?? null,
    product_market_mode: profile.product_market_mode ?? null,
    service_market_mode: profile.service_market_mode ?? null,
  } : null;
  const isCreator = Boolean(profileForRoleCheck && isCreatorProfile(profileForRoleCheck));
  const publishedProducts = useMemo(
    () => products.filter(product => product.is_published || product.status === 'published'),
    [products],
  );
  const musicProducts = useMemo(
    () => publishedProducts.filter(product => getProductExperience(product) === 'music'),
    [publishedProducts],
  );
  const bookProducts = useMemo(
    () => publishedProducts.filter(product => getProductExperience(product) === 'book'),
    [publishedProducts],
  );
  const assetProducts = useMemo(
    () => publishedProducts.filter(product => getProductExperience(product) === 'asset'),
    [publishedProducts],
  );
  const publishedServices = useMemo(
    () => services.filter(service => service.status === 'published' || service.status === 'active'),
    [services],
  );
  const generalPosts = useMemo(() => posts.filter(post => isGeneralPost(post)), [posts]);
  const tabs = useMemo(
    () => {
      const next: Array<{ id: ProfileTab; label: string }> = [];
      if (generalPosts.length > 0 || !isCreator) next.push({ id: 'posts', label: 'Posts' });
      if (isCreator && musicProducts.length > 0) next.push({ id: 'music', label: 'Music' });
      if (isCreator && bookProducts.length > 0) next.push({ id: 'books', label: 'Books' });
      if (isCreator && assetProducts.length > 0) next.push({ id: 'assets', label: 'Assets' });
      if (isCreator && publishedServices.length > 0) next.push({ id: 'services', label: 'Services' });
      return next;
    },
    [assetProducts.length, bookProducts.length, generalPosts.length, isCreator, musicProducts.length, publishedServices.length],
  );

  useEffect(() => {
    const requestedTab = parseProfileTab(searchParams.get('tab'), isCreator);
    const requestedIsVisible = requestedTab && tabs.some(item => item.id === requestedTab);
    if (requestedIsVisible && requestedTab !== tab) {
      setTab(requestedTab);
      return;
    }
    const currentIsVisible = tabs.some(item => item.id === tab);
    if (!currentIsVisible && tabs[0]) {
      setTab(tabs[0].id);
    }
  }, [isCreator, searchParams, tab, tabs]);

  const displayName = profile?.display_name ?? profile?.username ?? 'Member';
  const handle = authorHandle(profile ?? undefined);
  if (loading) {
    return <PageShell><CenteredMessage>Loading...</CenteredMessage></PageShell>;
  }

  if (!profile) {
    return <PageShell><CenteredMessage>Profile not found</CenteredMessage></PageShell>;
  }

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
                <h1 className="social-profile-name">{displayName}</h1>
                {handle && <div className="social-handle">@{handle}</div>}
                <p className="social-profile-bio">
                  {profile.bio || 'This member has not added a bio yet.'}
                </p>
              </div>
            </div>

            <div className="social-profile-actions">
              {isOwn ? (
                <Link href="/profile/edit" className="os-button os-button-primary">Edit Profile</Link>
              ) : (
                <>
                  <button type="button" className="os-button os-button-secondary" onClick={openMessage} disabled={busy === 'message'}>
                    Message
                  </button>
                  <button type="button" className="os-button os-button-primary" onClick={handleFollowAction} disabled={busy === 'follow'}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </>
              )}
            </div>
          </div>

          {error && <div className="dashboard-status dashboard-status-error">{error}</div>}

          {tabs.length > 0 && (
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
          )}
        </section>

        {tabs.length === 0 && (
          <div className="app-empty-text">No posts or published items yet.</div>
        )}

        {tab === 'posts' && tabs.some(item => item.id === 'posts') && (
          <section className="social-feed" aria-label="Posts">
            {generalPosts.length ? (
              generalPosts.map(post => (
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

        {tab === 'music' && (
          <ArtifactGrid empty="No music published yet.">
            {musicProducts.map(product => (
              <SocialArtifactCard
                key={product.id}
                href={productStoreHref(product)}
                title={product.title}
                meta={`${product.product_type || product.category || 'Release'} · ${formatProductPrice(product)}`}
                image={product.cover_url}
              />
            ))}
          </ArtifactGrid>
        )}

        {tab === 'books' && (
          <ArtifactGrid empty="No books published yet.">
            {bookProducts.map(product => (
              <SocialArtifactCard
                key={product.id}
                href={productStoreHref(product)}
                title={product.title}
                meta={`${product.product_type || 'Book'} · ${formatProductPrice(product)}`}
                image={product.cover_url}
              />
            ))}
          </ArtifactGrid>
        )}

        {tab === 'assets' && (
          <ArtifactGrid empty="No assets published yet.">
            {assetProducts.map(product => (
              <SocialArtifactCard
                key={product.id}
                href={productStoreHref(product)}
                title={product.title}
                meta={`${product.product_type || 'Asset'} · ${formatProductPrice(product)}`}
                image={product.cover_url}
              />
            ))}
          </ArtifactGrid>
        )}

        {tab === 'services' && (
          <ArtifactGrid empty="No services published yet.">
            {publishedServices.map(service => (
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
      </main>
      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
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
