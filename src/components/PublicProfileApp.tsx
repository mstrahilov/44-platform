'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, SyntheticEvent } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import type { Profile } from '@/lib/platform';
import { comparePublicCatalogProducts, type Product } from '@/lib/products';
import { getProductExperience, productBrowseHref } from '@/lib/experience';
import { PageShell, CenteredMessage } from '@/components/Ui';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import { SocialArtifactCard, SocialAvatar, SocialPostRow } from '@/components/Social';
import { CreatorVideoTitle } from '@/components/CreatorVideoTitle';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useTopbarBack, useTopbarOverflow, useTopbarOverlay, useTopbarTitle } from '@/components/TopbarContext';
import { authorHandle, countById, likersByPost, repliersByPost, type CountMap, type LikeRow, type LikersMap, type SocialPost } from '@/lib/social';
import { COPY_TO_CLIPBOARD_TOAST_EVENT, useContextMenu } from '@/components/ContextMenu';
import { pinDockItem } from '@/lib/dockPreferences';
import { hasCommunityIdentity } from '@/lib/communityProfile';
import { isMissingRelationError } from '@/lib/schemaCompat';
import { createOrOpenConversation } from '@/lib/messages';
import { trackProductAchievementTrigger } from '@/lib/achievementTracking';
import { deleteCommunityDiscussion } from '@/lib/communityStructured';
import { communityItemReference, inferItemReferences } from '@/lib/communityV11';
import {
  followProfile,
  getPublicProfile,
  getPublicProfileContent,
  isFollowingProfile,
  unfollowProfile,
} from '@/lib/domain/profiles';
import { setDiscussionLike } from '@/lib/domain/community';
import { ExternalLinkActions } from '@/components/ExternalLinkActions';
import type { CreatorEvent } from '@/lib/domain/events';
import { formatEventDate } from '@/lib/eventTime';
import { beatReviewSurfacesEnabled, hydrateBeatProducts } from '@/lib/domain/beats';
import type { CreatorVideoPage } from '@/lib/domain/releaseFeatures';
import { SectionTab, SectionTabs } from '@/components/SectionTabs';
import { OS44Button } from '@/components/OS44Button';
import { DETAIL_ARTWORK_SIZES, PublicArtwork } from '@/components/PublicArtwork';
import { sampleProfileArtworkColor } from '@/lib/profileArtworkColor';

type ProfileTab = 'posts' | 'music' | 'videos' | 'books' | 'assets' | 'games' | 'merch' | 'events';
type CurrentProfileState = {
  userId: string;
  profile: StudioProfile | null;
};

const PROFILE_HERO_DISSOLVE_HEIGHT = 110;

function syncProfileHeroDissolveStops(hero: HTMLDivElement) {
  const photoHeight = hero.getBoundingClientRect().height;
  if (photoHeight <= 0) return;

  const dissolveHeight = PROFILE_HERO_DISSOLVE_HEIGHT;
  const dissolveBand = photoHeight + dissolveHeight;
  const photoFraction = photoHeight / dissolveBand;
  const stop = (fraction: number) => `${fraction * 100}%`;

  hero.style.setProperty('--profile-dissolve-height', `${dissolveHeight}px`);
  hero.style.setProperty('--profile-blur-clear-stop', stop(photoFraction * 0.58));
  hero.style.setProperty('--profile-blur-soft-stop', stop(photoFraction * 0.66));
  hero.style.setProperty('--profile-blur-near-stop', stop(photoFraction + (1 - photoFraction) * 0.4));
  hero.style.setProperty('--profile-wash-clear-stop', stop(photoFraction * 0.58));
  hero.style.setProperty('--profile-wash-start-stop', stop(photoFraction * 0.64));
  hero.style.setProperty('--profile-wash-light-stop', stop(photoFraction + (1 - photoFraction) * 0.16));
  hero.style.setProperty('--profile-wash-mid-stop', stop(photoFraction + (1 - photoFraction) * 0.48));
  hero.style.setProperty('--profile-wash-strong-stop', stop(photoFraction + (1 - photoFraction) * 0.8));
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  return <PublicProfileContent key={username} username={username} />;
}

function PublicProfileContent({ username }: { username: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sampledProfileBackground, setSampledProfileBackground] = useState<{ src: string; color: string; imageSrc: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [postReferenceItems, setPostReferenceItems] = useState<Product[]>([]);
  const [externalLinks, setExternalLinks] = useState<Array<{ id: string; label: string; platform: string; url: string }>>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [creatorVideos, setCreatorVideos] = useState<CreatorVideoPage[]>([]);
  const [events, setEvents] = useState<CreatorEvent[]>([]);
  const [replyCounts, setReplyCounts] = useState<CountMap>({});
  const [repliersMap, setRepliersMap] = useState<LikersMap>({});
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [likingId, setLikingId] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentProfileState, setCurrentProfileState] = useState<CurrentProfileState | null>(null);
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);
  const { openContextMenu } = useContextMenu();
  const profileHeroRef = useRef<HTMLDivElement | null>(null);
  const setProfileHeroRef = useCallback((hero: HTMLDivElement | null) => {
    profileHeroRef.current = hero;
    if (hero) syncProfileHeroDissolveStops(hero);
  }, []);

  const profileBackgroundColor = profile?.avatar_url && sampledProfileBackground?.src === profile.avatar_url
    ? sampledProfileBackground.color
    : null;

  useEffect(() => {
    if (profileBackgroundColor) {
      document.body.style.setProperty('--os-profile-page-background', profileBackgroundColor);
    } else {
      document.body.style.removeProperty('--os-profile-page-background');
    }
  }, [profileBackgroundColor]);

  useEffect(() => () => {
    document.body.style.removeProperty('--os-profile-page-background');
  }, []);

  useEffect(() => {
    const hero = profileHeroRef.current;
    if (!hero || !profile?.avatar_url) return;

    const updateStops = () => syncProfileHeroDissolveStops(hero);
    updateStops();
    const observer = new ResizeObserver(updateStops);
    observer.observe(hero);
    return () => observer.disconnect();
  }, [profile?.avatar_url]);

  function handleProfileArtworkLoad(event: SyntheticEvent<HTMLImageElement>) {
    const src = profile?.avatar_url;
    if (!src) return;
    const color = sampleProfileArtworkColor(event.currentTarget);
    if (color) {
      document.body.style.setProperty('--os-profile-page-background', color);
      setSampledProfileBackground({
        src,
        color,
        imageSrc: event.currentTarget.currentSrc || event.currentTarget.src,
      });
    }
  }

  const profileHeroImageSource = profile?.avatar_url && sampledProfileBackground?.src === profile.avatar_url
    ? sampledProfileBackground.imageSrc
    : null;

  useEffect(() => {
    let alive = true;
    async function loadProfilePage() {
      setLoading(true);
      setLoadError('');
      setError('');
      setProfile(null);
      setProducts([]);
      setPostReferenceItems([]);
      setExternalLinks([]);
      setPosts([]);
      setCreatorVideos([]);
      setEvents([]);
      setReplyCounts({});
      setRepliersMap({});
      setLikes([]);

      try {
        const resolvedProfile = await getPublicProfile(username);
        if (!alive) return;
        setProfile(resolvedProfile);

        if (!resolvedProfile) {
          setIsFollowing(false);
          setLoading(false);
          return;
        }

        const content = await getPublicProfileContent(resolvedProfile);
        const hydratedProducts = await hydrateBeatProducts(content.items.filter(Boolean));
        if (!alive) return;
        setProducts(hydratedProducts);
        setPostReferenceItems(content.referencedItems);
        setExternalLinks(content.links);
        setPosts(content.posts);
        setCreatorVideos(content.videos);
        setEvents((content.events ?? []) as CreatorEvent[]);
        setReplyCounts(countById(content.replies, 'post_id'));
        setRepliersMap(repliersByPost(content.replies));
        setLikes(content.likes);
      } catch {
        if (!alive) return;
        setProfile(null);
        setProducts([]);
        setPosts([]);
        setCreatorVideos([]);
        setExternalLinks([]);
        setEvents([]);
        setLoadError('Could not load this profile. Check your connection and try again.');
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadProfilePage();
    return () => { alive = false; };
  }, [loadAttempt, username]);

  useEffect(() => {
    if (!userId) return;
    const activeUserId = userId;
    let alive = true;
    loadStudioProfile(activeUserId).then(result => {
      if (alive) setCurrentProfileState({ userId: activeUserId, profile: result.profile });
    });
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    if (!user || !profile || user.id === profile.id) {
      return;
    }

    isFollowingProfile(user.id, profile.id)
      .then(setIsFollowing)
      .catch(followError => setError(followError instanceof Error ? followError.message : 'Could not load follow state.'));
  }, [profile, user]);

  const isOwn = user?.id === profile?.id;
  const sourceProductId = searchParams.get('fromProduct');
  const cameFromRadio = searchParams.get('source') === 'radio';
  useTopbarBack(cameFromRadio
    ? { href: '/radio', label: 'Radio' }
    : isOwn ? undefined : { href: '/community', label: 'Community' });

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
      try {
        await unfollowProfile(user.id, profile.id);
        setIsFollowing(false);
      } catch (unfollowError) {
        setError(unfollowError instanceof Error ? unfollowError.message : 'Could not unfollow this profile.');
      }
    } else {
      try {
        await followProfile(user.id, profile.id);
        setIsFollowing(true);
        if (sourceProductId) {
          await trackProductAchievementTrigger({
            userId: user.id,
            productId: sourceProductId,
            triggerType: 'creator_followed_from_product',
            metadata: { source: 'profile_follow', creator_profile_id: profile.id },
          });
        }
      } catch (followError) {
        setError(followError instanceof Error ? followError.message : 'Could not follow this profile.');
      }
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
    if (result.error) {
      setError(isMissingRelationError(result.error)
        ? 'Messages are being updated. Please try again shortly.'
        : result.error.message);
      setBusy('');
      return;
    }
    router.push(result.href);
    setBusy('');
  }

  async function toggleLike(post: SocialPost) {
    if (likingId) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!hasCommunityIdentity(currentProfile)) {
      setSetupGateOpen(true);
      return;
    }
    const liked = likes.some(like => like.post_id === post.id && like.profile_id === user.id);
    setLikingId(post.id);
    setError('');
    try {
      await setDiscussionLike(post.id, user.id, !liked);
      setLikes(current => liked
        ? current.filter(like => !(like.post_id === post.id && like.profile_id === user.id))
        : [...current, { post_id: post.id, profile_id: user.id, profiles: currentProfile ? {
            id: currentProfile.id,
            display_name: currentProfile.display_name,
            username: currentProfile.username,
            avatar_url: currentProfile.avatar_url,
          } : null }]);
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : 'Could not update this like.');
    }
    setLikingId('');
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
    item_market_mode: profile.item_market_mode ?? null,
    service_market_mode: profile.service_market_mode ?? null,
  } : null;
  const currentProfile = currentProfileState && currentProfileState.userId === userId ? currentProfileState.profile : null;
  const isCreator = Boolean(profileForRoleCheck && isCreatorProfile(profileForRoleCheck));
  const publishedProducts = useMemo(
    () => products.filter(product => product.status === 'published'),
    [products],
  );
  const musicProducts = useMemo(
    () => publishedProducts
      .filter(product => getProductExperience(product) === 'music' && !product.beat)
      .sort(comparePublicCatalogProducts),
    [publishedProducts],
  );
  const beatProducts = useMemo(
    () => beatReviewSurfacesEnabled ? publishedProducts.filter(product => Boolean(product.beat)).sort(comparePublicCatalogProducts) : [],
    [publishedProducts],
  );
  const bookProducts = useMemo(
    () => publishedProducts
      .filter(product => getProductExperience(product) === 'book')
      .sort(comparePublicCatalogProducts),
    [publishedProducts],
  );
  const assetProducts = useMemo(
    () => publishedProducts.filter(product => getProductExperience(product) === 'asset'),
    [publishedProducts],
  );
  const assets = useMemo(
    () => [...beatProducts, ...assetProducts].sort(comparePublicCatalogProducts),
    [assetProducts, beatProducts],
  );
  const merchProducts = useMemo(
    () => publishedProducts
      .filter(product => getProductExperience(product) === 'physical')
      .sort(comparePublicCatalogProducts),
    [publishedProducts],
  );
  const gameProducts = useMemo(
    () => publishedProducts
      .filter(product => getProductExperience(product) === 'interactive')
      .sort(comparePublicCatalogProducts),
    [publishedProducts],
  );
  const generalPosts = posts;
  const videos = creatorVideos;
  const likeCounts = useMemo(() => countById(likes, 'post_id'), [likes]);
  const likersMap = useMemo(() => likersByPost(likes), [likes]);
  const likedIds = useMemo(() => new Set(
    user ? likes.filter(like => like.profile_id === user.id).map(like => like.post_id) : [],
  ), [likes, user]);
  const tabs = useMemo(
    () => {
      if (isCreator) {
        const creatorTabs: Array<{ id: ProfileTab; label: string }> = [
          { id: 'posts', label: 'Posts' },
        ];
        if (musicProducts.length > 0) creatorTabs.push({ id: 'music', label: 'Music' });
        if (videos.length > 0) creatorTabs.push({ id: 'videos', label: 'Videos' });
        if (bookProducts.length > 0) creatorTabs.push({ id: 'books', label: 'Books' });
        if (assets.length > 0) creatorTabs.push({ id: 'assets', label: 'Assets' });
        if (events.length > 0) creatorTabs.push({ id: 'events', label: 'Events' });
        return creatorTabs;
      }
      return [{ id: 'posts' as const, label: 'Posts' }];
    },
    [assets.length, bookProducts.length, events.length, isCreator, musicProducts.length, videos.length],
  );

  const displayName = profile?.display_name ?? profile?.username ?? 'Member';
  const handle = authorHandle(profile ?? undefined);
  const profileHref = profile ? `/profile/${profile.slug || profile.username || profile.id}` : '/community';
  const isProfilePage = /^\/profile\/[^/]+$/.test(pathname);
  const shareProfile = useCallback(async () => {
    if (!profile) return;
    const url = new URL(profileHref, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: displayName, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      window.dispatchEvent(new CustomEvent(COPY_TO_CLIPBOARD_TOAST_EVENT, { detail: { message: 'Profile link copied to clipboard' } }));
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        window.dispatchEvent(new CustomEvent(COPY_TO_CLIPBOARD_TOAST_EVENT, { detail: { message: 'Profile link copied to clipboard' } }));
      } catch {
        // Some embedded browsers provide neither native sharing nor clipboard access.
      }
    }
  }, [displayName, profile, profileHref]);
  useTopbarTitle(isProfilePage ? '' : undefined);
  useTopbarOverlay(isProfilePage);
  useTopbarOverflow(useMemo(() => !isProfilePage || !profile ? undefined : [
    ...(isOwn ? [{ id: 'edit-profile', label: 'Edit Profile', onSelect: () => router.push('/profile/edit') }] : []),
    ...(!isOwn ? [
      {
        id: 'follow-profile',
        label: isFollowing ? 'Unfollow' : 'Follow',
        disabled: busy === 'follow',
        onSelect: () => void handleFollowAction(),
      },
      {
        id: 'message-profile',
        label: 'Message',
        disabled: busy === 'message',
        onSelect: () => void openMessage(),
      },
    ] : []),
    { id: 'share-profile', label: 'Share', onSelect: () => void shareProfile() },
  ], [busy, currentProfile, isFollowing, isOwn, isProfilePage, profile, router, shareProfile, sourceProductId, user]));

  function selectProfileTab(nextTab: ProfileTab) {
    setTab(nextTab);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('tab');
    const query = nextParams.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  }
  if (loading) {
    return <PageShell><CenteredMessage status>Loading...</CenteredMessage></PageShell>;
  }

  if (loadError) {
    return <PageShell><div className="app-empty-text ui44-state" role="alert">
      <p>{loadError}</p>
      <OS44Button type="button" className="os-button os-button-secondary" onClick={() => setLoadAttempt(value => value + 1)}>Try Again</OS44Button>
    </div></PageShell>;
  }

  if (!profile) {
    return <PageShell><CenteredMessage>Profile not found</CenteredMessage></PageShell>;
  }

  return (
    <PageShell>
      <main
        className="social-shell social-shell-wide social-profile-page"
        data-profile-background-ready={profileBackgroundColor ? 'true' : undefined}
      >
        <section className="social-profile-head">
          {profile.avatar_url ? <div
            ref={setProfileHeroRef}
            className="social-profile-hero"
            onContextMenu={event => openContextMenu(event, [
              { id: 'open-profile', label: 'View Creator', href: profileHref },
              { id: 'pin-profile', label: 'Pin to Sidebar', onSelect: () => pinDockItem({
                id: `profile:${profile.id}`,
                label: displayName,
                href: profileHref,
                iconClass: 'os-icon-user',
                kind: 'profile',
                imageUrl: profile.avatar_url ?? null,
              }) },
            ])}
          >
            <PublicArtwork
              className="social-profile-hero-image"
              src={profile.avatar_url}
              alt={`${displayName} profile photo`}
              sizes={DETAIL_ARTWORK_SIZES}
              loading="eager"
              fetchPriority="high"
              onLoad={handleProfileArtworkLoad}
            />
            {profileHeroImageSource ? <div className="social-profile-hero-transition" aria-hidden="true">
              <div className="social-profile-hero-blur-frame">
                <img
                  className="social-profile-hero-transition-image"
                  src={profileHeroImageSource}
                  alt=""
                  draggable={false}
                />
              </div>
              <div className="social-profile-hero-color-wash" />
            </div> : null}
          </div> : null}
          <div className="social-profile-main">
            <div className="social-profile-identity">
              {!profile.avatar_url ? <SocialAvatar profile={profile} size="large" /> : null}
              <div className="social-profile-text">
                <h1 className="social-profile-name">{displayName}</h1>
                {handle && <div className="social-handle">@{handle}</div>}
              </div>
            </div>
            {profile.bio?.trim() ? <ProfileBio text={profile.bio.trim()} /> : null}
            <div className="social-profile-link-row">
              <ExternalLinkActions links={externalLinks} context="profile" label={`${displayName} around the web`} />
            </div>
          </div>

          {error && <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div>}

          {tabs.length > 1 && (
            <SectionTabs ariaLabel="Profile sections" className="profile-section-tabs">
              {tabs.map(item => (
                <SectionTab
                  key={item.id}
                  active={tab === item.id}
                  onClick={() => selectProfileTab(item.id)}
                >
                  {item.label}
                </SectionTab>
              ))}
            </SectionTabs>
          )}

        </section>

        {tabs.length === 0 && (
          <div className="app-empty-text">No posts or published items yet.</div>
        )}

        {tab === 'posts' && tabs.some(item => item.id === 'posts') && (
          <section className="social-feed social-feed-list social-feed-panel social-profile-posts ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip" aria-label="Posts">
            {generalPosts.length ? (
              generalPosts.map(post => (
                <div key={post.id} className="social-feed-post">
                  <SocialPostRow
                    post={post}
                    references={[
                      ...(post.item_id
                        ? [...products, ...postReferenceItems]
                          .filter(product => product.id === post.item_id)
                          .map(communityItemReference)
                        : []),
                      ...inferItemReferences(post.body ?? '', [...products, ...postReferenceItems]),
                    ].filter((reference, index, all) => all.findIndex(candidate => candidate.kind === reference.kind && candidate.id === reference.id) === index)}
                    replyCount={replyCounts[post.id] ?? 0}
                    likeCount={likeCounts[post.id] ?? 0}
                    likers={likersMap[post.id] ?? []}
                    repliers={repliersMap[post.id] ?? []}
                    liked={likedIds.has(post.id)}
                    onLike={() => { void toggleLike(post); }}
                    disabled={likingId === post.id}
                    onDelete={async () => {
                      if (!user || post.author_id !== user.id) return;
                      if (!window.confirm('Delete this post? This cannot be undone.')) return;
                      const { error: deleteError } = await deleteCommunityDiscussion({ discussionId: post.id, ownerId: user.id });
                      if (deleteError) { setError(deleteError.message); return; }
                      setPosts(current => current.filter(p => p.id !== post.id));
                    }}
                    canDelete={Boolean(user && post.author_id === user.id)}
                    showAuthorHandle={false}
                  />
                </div>
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
                href={productBrowseHref(product)}
                title={product.title}
                meta={profileProductCreator(product)}
                image={product.cover_url}
                singleLineTitle
              />
            ))}
          </ArtifactGrid>
        )}

        {tab === 'videos' && (
          <ArtifactGrid empty="No videos published yet." ariaLabel="Videos">
            {videos.map(video => <SocialArtifactCard
              key={video.id}
              href={`/videos/${video.id}`}
              title={<CreatorVideoTitle videoId={video.youtube_video_id} storedTitle={video.title} />}
              image={`https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg`}
              shape="landscape"
              singleLineTitle
            />)}
          </ArtifactGrid>
        )}

        {tab === 'books' && (
          <ArtifactGrid empty="No books published yet.">
            {bookProducts.map(product => (
              <SocialArtifactCard
                key={product.id}
                href={productBrowseHref(product)}
                title={product.title}
                meta={profileProductCreator(product)}
                image={product.cover_url}
                singleLineTitle
              />
            ))}
          </ArtifactGrid>
        )}

        {tab === 'assets' && (
          <ArtifactGrid empty="No assets published yet.">
            {assets.map(product => (
              <SocialArtifactCard
                key={product.id}
                href={productBrowseHref(product)}
                title={product.title}
                meta={profileProductCreator(product)}
                image={product.cover_url}
                singleLineTitle
              />
            ))}
          </ArtifactGrid>
        )}

        {tab === 'merch' && (
          <ArtifactGrid empty="No merch published yet.">
            {merchProducts.map(product => (
              <SocialArtifactCard
                key={product.id}
                href={productBrowseHref(product)}
                title={product.title}
                meta={profileProductCreator(product)}
                image={product.cover_url}
                shape="portrait"
                singleLineTitle
              />
            ))}
          </ArtifactGrid>
        )}

        {tab === 'games' && (
          <ArtifactGrid empty="No games published yet.">
            {gameProducts.map(product => (
              <SocialArtifactCard
                key={product.id}
                href={productBrowseHref(product)}
                title={product.title}
                meta={profileProductCreator(product)}
                image={product.cover_url}
                singleLineTitle
              />
            ))}
          </ArtifactGrid>
        )}

        {tab === 'events' && (
          <ProfileEvents events={events} />
        )}

      </main>
      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
    </PageShell>
  );
}

function ProfileEvents({ events }: { events: CreatorEvent[] }) {
  const [now] = useState(Date.now);
  if (events.length === 0) return <div className="app-empty-text">No events scheduled yet.</div>;
  const groups = [
    { label: 'Upcoming', rows: events.filter(event => event.lifecycle_state === 'scheduled' && new Date(event.starts_at).getTime() >= now) },
    { label: 'Cancelled', rows: events.filter(event => event.lifecycle_state === 'cancelled') },
    { label: 'Past', rows: events.filter(event => event.lifecycle_state === 'scheduled' && new Date(event.starts_at).getTime() < now).reverse() },
  ];
  return <section className="profile-events" aria-label="Events">{groups.map(group => group.rows.length ? <section key={group.label}><h2>{group.label}</h2><div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">{group.rows.map(event => <article key={event.id} className={`profile-event-row ui44-list-row ui44-list-row-event ${event.lifecycle_state === 'cancelled' ? 'calendar-entry-cancelled' : ''}`}><div><strong>{event.title}</strong><time dateTime={event.starts_at}>{formatEventDate(event.starts_at,event.timezone)}</time><p>{event.short_description}</p>{event.venue_name && <span>{[event.venue_name,event.locality,event.region].filter(Boolean).join(' · ')}</span>}</div><div className="calendar-entry-actions">{event.online_url&&<a href={event.online_url} target="_blank" rel="noopener noreferrer">Online Destination</a>}{event.info_url&&<a href={event.info_url} target="_blank" rel="noopener noreferrer">Tickets / Information</a>}</div></article>)}</div></section>:null)}</section>;
}

function ProfileBio({ text }: { text: string }) {
  const bioRef = useRef<HTMLParagraphElement | null>(null);
  const [alignment, setAlignment] = useState<'center' | 'left'>('center');

  useEffect(() => {
    const element = bioRef.current;
    if (!element) return;

    const measure = () => {
      const styles = window.getComputedStyle(element);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      context.font = styles.font;
      const wraps = text.includes('\n') || context.measureText(text).width > element.clientWidth;
      setAlignment(wraps ? 'left' : 'center');
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);

  return <p ref={bioRef} className={`social-profile-bio social-profile-bio-${alignment}`}>{text}</p>;
}

function profileProductCreator(product: Product) {
  return product.creators?.display_name || product.creator || '44 Creator';
}

function ArtifactGrid({ children, empty, ariaLabel = 'Published work' }: { children: ReactNode; empty: string; ariaLabel?: string }) {
  const count = Array.isArray(children) ? children.length : 1;
  return count ? (
    <section className="social-card-grid ui44-catalog-grid" aria-label={ariaLabel}>{children}</section>
  ) : (
    <div className="app-empty-text">{empty}</div>
  );
}
