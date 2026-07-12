'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import type { Profile } from '@/lib/platform';
import { comparePublicCatalogProducts, type Product } from '@/lib/products';
import { getProductExperience, productBrowseHref } from '@/lib/experience';
import { PageShell, CenteredMessage } from '@/components/Ui';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import { SocialArtifactCard, SocialAvatar, SocialPostRow } from '@/components/Social';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { useTopbarBack } from '@/components/TopbarContext';
import { authorHandle, countById, likersByPost, repliersByPost, type CountMap, type LikersMap, type SocialPost } from '@/lib/social';
import { useContextMenu } from '@/components/ContextMenu';
import { pinDockItem } from '@/lib/dockPreferences';
import { hasCommunityIdentity } from '@/lib/communityProfile';
import { isMissingRelationError } from '@/lib/schemaCompat';
import { createOrOpenConversation } from '@/lib/messages';
import { trackProductAchievementTrigger } from '@/lib/achievementTracking';
import { deleteCommunityDiscussion } from '@/lib/communityStructured';
import {
  followProfile,
  getPublicProfile,
  getPublicProfileContent,
  isFollowingProfile,
  unfollowProfile,
} from '@/lib/domain/profiles';

type ProfileTab = 'posts' | 'music' | 'books' | 'assets';
type CurrentProfileState = {
  userId: string;
  profile: StudioProfile | null;
};

function parseProfileTab(value: string | null, isCreator: boolean): ProfileTab | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === 'posts') return 'posts';
  if (!isCreator) return null;
  if (normalized === 'music' || normalized === 'releases' || normalized === 'products') return 'music';
  if (normalized === 'books') return 'books';
  if (normalized === 'assets') return 'assets';
  return null;
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [externalLinks, setExternalLinks] = useState<Array<{ id: string; label: string; platform: string; url: string }>>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [replyCounts, setReplyCounts] = useState<CountMap>({});
  const [repliersMap, setRepliersMap] = useState<LikersMap>({});
  const [likeCounts, setLikeCounts] = useState<CountMap>({});
  const [likersMap, setLikersMap] = useState<LikersMap>({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentProfileState, setCurrentProfileState] = useState<CurrentProfileState | null>(null);
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);
  const { openContextMenu } = useContextMenu();

  useEffect(() => {
    async function loadProfilePage() {
      setLoading(true);
      setError('');

      const resolvedProfile = await getPublicProfile(username);
      setProfile(resolvedProfile);

      if (!resolvedProfile) {
        setProducts([]);
        setExternalLinks([]);
        setPosts([]);
        setIsFollowing(false);
        setLoading(false);
        return;
      }

      const content = await getPublicProfileContent(resolvedProfile);
      setProducts(content.items.filter(Boolean));
      setExternalLinks(content.links);
      const nextPosts = content.posts;
      setPosts(nextPosts);
      const replyRowsData = content.replies;
      setReplyCounts(countById(replyRowsData, 'post_id'));
      setRepliersMap(repliersByPost(replyRowsData));
      const likeRows = content.likes;
      setLikeCounts(countById(likeRows, 'post_id'));
      setLikersMap(likersByPost(likeRows));
      setLoading(false);
    }

    loadProfilePage();
  }, [username]);

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
      .filter(product => getProductExperience(product) === 'music')
      .sort(comparePublicCatalogProducts),
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
  const generalPosts = posts;
  const tabs = useMemo(
    () => {
      if (isCreator) {
        const creatorTabs: Array<{ id: ProfileTab; label: string }> = [];
        if (generalPosts.length > 0) creatorTabs.push({ id: 'posts', label: 'Posts' });
        if (musicProducts.length > 0) creatorTabs.push({ id: 'music', label: 'Music' });
        if (bookProducts.length > 0) creatorTabs.push({ id: 'books', label: 'Books' });
        if (assetProducts.length > 0) creatorTabs.push({ id: 'assets', label: 'Assets' });
        return creatorTabs;
      }
      return generalPosts.length > 0 ? [{ id: 'posts' as const, label: 'Posts' }] : [];
    },
    [assetProducts.length, bookProducts.length, generalPosts.length, isCreator, musicProducts.length],
  );

  useEffect(() => {
    const requestedTab = parseProfileTab(searchParams.get('tab'), isCreator);
    const requestedIsVisible = requestedTab && tabs.some(item => item.id === requestedTab);
    if (requestedIsVisible && requestedTab !== tab) {
      Promise.resolve().then(() => setTab(requestedTab));
      return;
    }
    const currentIsVisible = tabs.some(item => item.id === tab);
    if (!currentIsVisible && tabs[0]) {
      Promise.resolve().then(() => setTab(tabs[0].id));
    }
  }, [isCreator, searchParams, tab, tabs]);

  const displayName = profile?.display_name ?? profile?.username ?? 'Member';
  const handle = authorHandle(profile ?? undefined);
  const profileHref = profile ? `/profile/${profile.slug || profile.username || profile.id}` : '/community';
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
              <button
                type="button"
                className="social-profile-avatar-button"
                aria-label={`Pin or view ${displayName}`}
                onContextMenu={event => openContextMenu(event, [
                  { id: 'open-profile', label: 'View Creator', href: profileHref },
                  { id: 'pin-profile', label: 'Pin to Dock', onSelect: () => pinDockItem({
                    id: `profile:${profile.id}`,
                    label: displayName,
                    href: profileHref,
                    iconClass: 'os-icon-user',
                    kind: 'profile',
                    imageUrl: profile.avatar_url ?? null,
                  }) },
                ])}
              >
                <SocialAvatar profile={profile} size="large" />
              </button>
              <div className="social-profile-text">
                <h1 className="social-profile-name">{displayName}</h1>
                {handle && <div className="social-handle">@{handle}</div>}
                <p className="social-profile-bio">
                  {profile.bio || 'This member has not added a bio yet.'}
                </p>
                {externalLinks.length > 0 && (
                  <div className="app-tag-row social-profile-external-links" aria-label="External profiles">
                    {externalLinks.map(link => (
                      <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="os-pill os-type-pill">
                        {link.label || link.platform}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="social-profile-actions">
              {isOwn ? (
                <>
                  {isCreator && <Link href="/studio" className="os-button os-button-primary">Open Studio</Link>}
                  <Link href="/profile/edit" className="os-button os-button-secondary">Edit Profile</Link>
                </>
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
                    const { error: deleteError } = await deleteCommunityDiscussion({ discussionId: post.id, ownerId: user.id });
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
                href={productBrowseHref(product)}
                title={product.title}
                meta={profileProductMeta(product, 'Release')}
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
                href={productBrowseHref(product)}
                title={product.title}
                meta={profileProductMeta(product, 'Book')}
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
                href={productBrowseHref(product)}
                title={product.title}
                meta={profileProductMeta(product, 'Asset')}
                image={product.cover_url}
              />
            ))}
          </ArtifactGrid>
        )}

      </main>
      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
    </PageShell>
  );
}

function profileProductMeta(product: Product, fallbackType: string) {
  const type = product.item_type || product.experience_type || fallbackType;
  const year = product.year || (product.created_at ? new Date(product.created_at).getFullYear() : null);
  return year ? `${type} · ${year}` : type;
}

function ArtifactGrid({ children, empty }: { children: ReactNode; empty: string }) {
  const count = Array.isArray(children) ? children.length : 1;
  return count ? (
    <section className="social-card-grid">{children}</section>
  ) : (
    <div className="app-empty-text">{empty}</div>
  );
}
