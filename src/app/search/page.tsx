'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell, ProductCard, ProductGrid, EmptyMessage, HubSection, HubHero } from '@/components/Ui';
import { SocialAvatar, SocialPostRow } from '@/components/Social';
import type { Product } from '@/lib/products';
import { creatorHref } from '@/lib/platform';
import { matchesQuery } from '@/lib/taxonomy';
import { countById, type LikeRow, type ReplyEngagerRow, type SocialPost } from '@/lib/social';
import { loadPlatformSearchIndex, type SearchProfile } from '@/lib/domain/search';
import { setDiscussionLike } from '@/lib/domain/community';
import { useAuth } from '@/lib/useAuth';
import { Ui44TextInput } from '@/components/ui44/Inputs';
import { searchSupportArticles, supportArticleHref } from '@/lib/supportArticles';

type SearchIndex = {
  products: Product[];
  posts: SocialPost[];
  profiles: SearchProfile[];
  replies: ReplyEngagerRow[];
  likes: LikeRow[];
};

let searchIndexCache: SearchIndex | null = null;
let searchIndexRequest: Promise<SearchIndex> | null = null;

function loadSearchIndex() {
  if (searchIndexCache) return Promise.resolve(searchIndexCache);
  if (searchIndexRequest) return searchIndexRequest;

  searchIndexRequest = loadPlatformSearchIndex().then(index => {
    searchIndexCache = index;
    return index;
  }).finally(() => {
    searchIndexRequest = null;
  });

  return searchIndexRequest;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageShell><EmptyMessage status>Searching...</EmptyMessage></PageShell>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const query = searchParams.get('q')?.trim() ?? '';
  const [draft, setDraft] = useState(query);
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [replies, setReplies] = useState<ReplyEngagerRow[]>([]);
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [likingId, setLikingId] = useState('');
  const [loading, setLoading] = useState(Boolean(query));

  useEffect(() => {
    let alive = true;
    if (!query) {
      Promise.resolve().then(() => {
        if (alive) setLoading(false);
      });
      return () => { alive = false; };
    }

    void Promise.resolve().then(async () => {
      if (!alive) return;
      setLoading(true);
      const index = await loadSearchIndex();
      if (!alive) return;
      setProducts(index.products);
      setPosts(index.posts);
      setProfiles(index.profiles);
      setReplies(index.replies);
      setLikes(index.likes);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [query]);

  useEffect(() => {
    Promise.resolve().then(() => setDraft(query));
  }, [query]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
  }

  const productMatches = useMemo(
    () => products.filter(product => matchesQuery(product, query)).slice(0, 12),
    [products, query],
  );
  const postMatches = useMemo(
    () => posts.filter(post => matchesQuery(post, query)).slice(0, 8),
    [posts, query],
  );
  const profileMatches = useMemo(
    () => profiles.filter(profile => profileMatchesQuery(profile, query)).slice(0, 8),
    [profiles, query],
  );
  const supportMatches = useMemo(() => searchSupportArticles(query, 8), [query]);
  const hasResults = productMatches.length + postMatches.length + profileMatches.length + supportMatches.length > 0;
  const replyCounts = useMemo(() => countById(replies, 'post_id'), [replies]);
  const likeCounts = useMemo(() => countById(likes, 'post_id'), [likes]);
  const likedIds = useMemo(() => new Set(
    user ? likes.filter(like => like.profile_id === user.id).map(like => like.post_id) : [],
  ), [likes, user]);

  async function toggleLike(post: SocialPost) {
    if (likingId) return;
    if (!user) {
      router.push('/login');
      return;
    }
    const liked = likedIds.has(post.id);
    setLikingId(post.id);
    try {
      await setDiscussionLike(post.id, user.id, !liked);
      setLikes(current => liked
        ? current.filter(like => !(like.post_id === post.id && like.profile_id === user.id))
        : [...current, { post_id: post.id, profile_id: user.id, profiles: null }]);
    } finally {
      setLikingId('');
    }
  }

  return (
    <PageShell>
      <main className="app-page search-page">
        <HubHero
          title="Search"
          copy={query ? `Results for "${query}".` : 'Find items, creators, posts, questions, and collaborations.'}
        />

        <form className="page-search-control search-page-form ui44-composed-field ui44-composed-field-search" onSubmit={submitSearch} role="search">
          <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
          <Ui44TextInput
            surface="bare"
            value={draft}
            onChange={event => setDraft(event.target.value)}
            placeholder="Search 44OS"
            aria-label="Search"
          />
        </form>

        {loading ? (
          <EmptyMessage status>Searching...</EmptyMessage>
        ) : !query ? (
          <EmptyMessage>Enter any term to start a search.</EmptyMessage>
        ) : !hasResults ? (
          <EmptyMessage>No results found.</EmptyMessage>
        ) : (
          <>
            {productMatches.length > 0 && (
              <HubSection title="Items">
                <ProductGrid>
                  {productMatches.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </ProductGrid>
              </HubSection>
            )}

            {profileMatches.length > 0 && (
              <HubSection title="Creators">
                <div className="search-profile-list ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
                  {profileMatches.map(profile => (
                    <Link
                      key={profile.id}
                      href={creatorHref(profile)}
                      className="search-profile-row ui44-list-row ui44-list-row-profile ui44-list-row-interactive"
                    >
                      <SocialAvatar profile={profile} />
                      <span className="search-profile-copy">
                        <span className="social-author-name">{profile.display_name || profile.username || '44 Creator'}</span>
                        {profile.username && <span className="social-handle">@{profile.username}</span>}
                      </span>
                    </Link>
                  ))}
                </div>
              </HubSection>
            )}

            {postMatches.length > 0 && (
              <HubSection title="Posts">
                <div className="social-feed">
                  {postMatches.map(post => (
                    <SocialPostRow
                      key={post.id}
                      post={post}
                      showTitle
                      handleOnly={false}
                      replyCount={replyCounts[post.id] ?? 0}
                      likeCount={likeCounts[post.id] ?? 0}
                      liked={likedIds.has(post.id)}
                      onLike={() => { void toggleLike(post); }}
                      disabled={likingId === post.id}
                    />
                  ))}
                </div>
              </HubSection>
            )}

            {supportMatches.length > 0 && (
              <HubSection title="Help">
                <div className="support-article-list ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
                  {supportMatches.map(article => (
                    <Link
                      key={article.slug}
                      href={supportArticleHref(article)}
                      className="support-article-row ui44-list-row ui44-list-row-interactive"
                    >
                      <span className="support-article-row-copy">
                        <span className="support-article-row-title">{article.title}</span>
                        <span className="os-type-meta">{article.description}</span>
                      </span>
                      <span className="support-card-arrow" aria-hidden="true">›</span>
                    </Link>
                  ))}
                </div>
              </HubSection>
            )}
          </>
        )}
      </main>
    </PageShell>
  );
}

function profileMatchesQuery(profile: SearchProfile, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    profile.display_name,
    profile.username,
    profile.slug,
    profile.bio,
    profile.creator_type,
  ].filter(Boolean).join(' ').toLowerCase().includes(normalized);
}
